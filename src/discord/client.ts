import process from "process";
import {
  Client,
  DiscordAPIError,
  Intents,
  Message,
  PartialMessage,
} from "discord.js";
import * as config from "../config";
import assert from "assert";
import { getAllMessages, toDbMessageAndPopulate } from "./lib";
import { Message as DbMessage } from "../entities";
import { EM, getEm } from "../orm";
import { delay } from "../utils/delay";
import { LockQueue } from "../utils/LockQueue";

export class GirlsClient {
  client: Client;
  /**
   * Lock queue for the channel.
   * Used to prevent races which may occur when multiple async functions
   * relating to the same channel run simultaneously.
   * (We only support one channel as of writing...)
   */
  channelLock: LockQueue;

  constructor() {
    this.client = new Client({
      intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
      // why isn't this the default. enable ALL partials
      partials: [
        "USER",
        "MESSAGE",
        "CHANNEL",
        "REACTION",
        "GUILD_MEMBER",
        "GUILD_SCHEDULED_EVENT",
      ],
    });
    this.channelLock = new LockQueue();

    this.client.on("ready", (client) => {
      // Note that this gets really messy if we support multiple channels...
      this.channelLock.enqueue(() => this.ready(client));
    });
    this.client.on("messageCreate", (message) => {
      if (
        message.channelId !== config.channelId ||
        (message.type !== "DEFAULT" && message.type !== "REPLY")
      ) {
        return;
      }
      this.channelLock.enqueue(() => this.messageCreate(message));
    });
    this.client.on("messageUpdate", (oldMessage, newMessage) => {
      if (
        newMessage.channelId !== config.channelId ||
        (newMessage.type !== null &&
          newMessage.type !== "DEFAULT" &&
          newMessage.type !== "REPLY")
      ) {
        return;
      }
      this.channelLock.enqueue(() =>
        this.messageUpdate(oldMessage, newMessage)
      );
    });
    this.client.on("messageDelete", (message) => {
      if (
        message.channelId !== config.channelId ||
        (message.type !== null &&
          message.type !== "DEFAULT" &&
          message.type !== "REPLY")
      ) {
        return;
      }
      // If message type is unknown, try deleting it anyway.
      this.channelLock.enqueue(() => this.messageDelete(message));
    });
    this.client.on("messageDeleteBulk", (messages) => {
      for (const message of messages.values()) {
        if (
          message.channelId !== config.channelId ||
          (message.type !== null &&
            message.type !== "DEFAULT" &&
            message.type !== "REPLY")
        ) {
          continue;
        }
        // If message type is unknown, try deleting it anyway.
        this.channelLock.enqueue(() => this.messageDelete(message));
      }
    });
  }

  async ready(client: Client<true>) {
    const em = await getEm();
    console.log(`Logged in as ${client.user.tag}`);
    const guild = await client.guilds.fetch(config.guildId);
    const channel = await guild.channels.fetch(config.channelId);
    assert(channel);
    assert(channel.isText());
    const lastMessage = await DbMessage.getLastMessage(config.channelId, em);
    console.log("lastMessage: ", lastMessage);
    const unprocessedMessages: DbMessage[] = [];
    for await (const message of getAllMessages(channel, lastMessage)) {
      const { author, content, type } = message;
      console.log(`${author.tag} sent "${content}" (${type})`);
      const dbMessage = toDbMessageAndPopulate(message);
      unprocessedMessages.push(dbMessage);
    }
    await em.persistAndFlush(unprocessedMessages);
  }

  async messageCreate(message: Message) {
    const { author, content } = message;
    console.log(`Received "${content}" from ${author.tag}`);
    const em = await getEm();
    const inDb = await em.count(DbMessage, message.id);
    if (inDb > 0) {
      console.log(`create: ${message.id} was already in DB`);
      return;
    }
    const dbMessage = toDbMessageAndPopulate(message);
    await em.persistAndFlush(dbMessage);
    await this.handleReposts(em, message, dbMessage);
  }

  async messageUpdate(
    _oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage
  ) {
    // It's possible we don't have the message type of this message, so we need
    // to check that down the line.
    // From https://discord.com/developers/docs/topics/gateway#message-update
    // > message updates [...] will always contain an id and channel_id.
    // That means this function is only called if channelId is correct, so we
    // don't need to check channelId in this method.
    console.log(
      `Edited "${newMessage.content}" from ${newMessage.author?.tag}`
    );

    if (newMessage.content === null) {
      // Nothing interesting changed - ignore.
      return;
    }
    if (newMessage.editedTimestamp === null) {
      // TODO: determine whether this could ever happen
      console.log(
        `update: ${newMessage.id} had updated content ${newMessage.content} but no editedTimestamp`
      );
    }

    const em = await getEm();
    let dbMessage = await em.findOne(DbMessage, newMessage.id);

    if (dbMessage === null) {
      try {
        newMessage = await newMessage.fetch();
      } catch (err: unknown) {
        // The message was probably deleted.
        // Check for "unknown message" code:
        // https://discord.com/developers/docs/topics/opcodes-and-status-codes#json-json-error-codes
        if (err instanceof DiscordAPIError && err.code === 10008) {
          return;
        }
        console.log("Error when trying to fetch message in update:", err);
        return;
      }

      if (newMessage.type !== "DEFAULT" && newMessage.type !== "REPLY") {
        return;
      }
      dbMessage = toDbMessageAndPopulate(newMessage);
      em.persist(dbMessage);
    } else {
      // If nothing interesting was changed, do nothing. Yes, we don't even
      // update the edited timestamp, as there's no point.
      if (newMessage.content === dbMessage.content) {
        return;
      }
      // If we somehow already have a more-up-to-date version of this message in
      // our database, ignore this edit.
      if (
        newMessage.editedTimestamp !== null &&
        dbMessage.edited !== undefined &&
        newMessage.editedTimestamp <= dbMessage.edited
      ) {
        return;
      }

      // Update content and editedTimestamp.
      // Populating dbMessage is necessary to ensure twitterLinks and pixivLinks
      // get correctly cleared.
      await em.populate(dbMessage, true);
      dbMessage.content = newMessage.content;
      dbMessage.setEdited(newMessage.editedTimestamp ?? undefined);
      dbMessage.twitterLinks.removeAll();
      dbMessage.pixivLinks.removeAll();
      dbMessage.populateLinks();
    }

    await em.flush();
    await this.handleReposts(em, newMessage, dbMessage);
  }

  async handleReposts(
    em: EM,
    message: Message | PartialMessage,
    dbMessage: DbMessage
  ) {
    const reposts = await dbMessage.fetchReposts(em);

    // TODO: move the below constant somewhere else
    const repostCutoff = Date.now() - (1000 * 60 * 60 * 24 * 365) / 2;

    // fetchReposts guarantees the message is loaded.
    // TODO: filter this inside the database query instead (if possible)
    const withinTimePeriod = reposts.filter(
      (link) => link.message.getEntity().updated > repostCutoff
    );
    if (withinTimePeriod.length === 0) {
      return;
    }
    // Delete and send DM.
    // DON'T await Discord-related promises - these don't touch the database and
    // we don't want to block the entire channel's queue as it's for database,
    // not Discord purposes.
    // However, there could be a race where the message isn't deleted yet and
    // we move onto the next post, which is a repost of THIS - due to this
    // database message still existing.
    await em.removeAndFlush(dbMessage);
    // Discord-related promises below.
    message.delete();
    // The author is probably in the cache.
    (async () => {
      const author = await this.client.users.fetch(dbMessage.author);
      try {
        await author.send("Your last message had a repost.");
      } catch (err) {
        const repostMessage = await message.channel.send({
          content: `${author}, your last message had a repost. (I couldn't DM you!)`,
          allowedMentions: { users: [author.id] },
        });
        await delay(3000);
        await repostMessage.delete();
      }
    })();
  }

  async messageDelete(message: Message | PartialMessage) {
    // Only guild_id, channel_id and id exist here.
    console.log(`Message ${message.id} deleted`);
    const em = await getEm();
    await em.nativeDelete(Message, message.id);
  }

  ignoreAllErrors() {
    this.client.on("error", console.error);
  }

  async run() {
    this.ignoreAllErrors();
    ignoreAllUnhandledExceptions();
    await this.client.login(config.token);
  }
}

function ignoreAllUnhandledExceptions() {
  process.on("unhandledRejection", console.error);
}

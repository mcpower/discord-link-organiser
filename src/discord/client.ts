import {
  Client,
  DiscordAPIError,
  Intents,
  Message,
  PartialMessage,
  Snowflake,
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
      if (this.shouldIgnore(message)) {
        return;
      }
      this.channelLock.enqueue(() => this.messageCreate(message));
    });
    this.client.on("messageUpdate", (oldMessage, newMessage) => {
      if (this.shouldIgnore(newMessage)) {
        return;
      }
      this.channelLock.enqueue(() =>
        this.messageUpdate(oldMessage, newMessage)
      );
    });
    this.client.on("messageDelete", (message) => {
      if (this.shouldIgnore(message)) {
        return;
      }
      // If message type is unknown, try deleting it anyway.
      this.channelLock.enqueue(() => this.messageDelete(message));
    });
    this.client.on("messageDeleteBulk", (messages) => {
      for (const message of messages.values()) {
        if (this.shouldIgnore(message)) {
          continue;
        }
        // If message type is unknown, try deleting it anyway.
        this.channelLock.enqueue(() => this.messageDelete(message));
      }
    });
    if (config.debug) {
      this.client.on("debug", console.log);
    }
  }

  shouldIgnore(message: Message | PartialMessage) {
    // This is on the permissive side - if the message type is unknown, allow
    // it.
    const thisUser = this.client.user?.id;
    return (
      message.channelId !== config.channelId ||
      (message.type !== null &&
        message.type !== "DEFAULT" &&
        message.type !== "REPLY") ||
      (message.author !== null &&
        thisUser !== undefined &&
        message.author.id === thisUser)
    );
  }

  async ready(client: Client<true>) {
    const em = await getEm();
    console.log(`ready: logged in as ${client.user.tag}`);
    const channel = await client.channels.fetch(config.channelId);
    assert(channel, "The config's channel does not exist.");
    assert(channel.isText(), "The config's channel is not a text channel.");
    const lastMessage = await DbMessage.getLastMessage(config.channelId, em);
    console.log(`ready: getting all messages from ${lastMessage}`);
    const messageIds: Snowflake[] = [];
    for await (const message of getAllMessages(channel.messages, lastMessage)) {
      if (this.shouldIgnore(message)) {
        continue;
      }
      const dbMessage = toDbMessageAndPopulate(message);
      em.persist(dbMessage);
      messageIds.push(message.id);
    }
    // Delete messages if they're already in the database. The above fetch
    // should all be new - and if they're not, these are more recently fetched
    // than the ones inside the database.
    await em.nativeDelete(DbMessage, messageIds);
    console.log(`ready: inserting ${messageIds.length} message(s)`);
    await em.flush();
  }

  async messageCreate(message: Message) {
    console.log(`create: message ${message.id}`);
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
    // This will always contain an id and channel_id:
    // https://discord.com/developers/docs/topics/gateway#message-update
    // That means this function is only called if channelId is correct, so we
    // don't need to check channelId in this method.
    console.log(`update: message ${newMessage.id}`);

    if (newMessage.content === null) {
      // Nothing interesting changed - ignore.
      return;
    }
    if (newMessage.editedTimestamp === null) {
      // This should never happen, but we should handle this case anyway.
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
        console.log(`update: error when fetching ${newMessage.id}`, err);
        return;
      }

      if (this.shouldIgnore(newMessage)) {
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
        console.log(
          `update: message ${newMessage.id} was older (${newMessage.editedTimestamp}) than db (${dbMessage.edited})`
        );
        return;
      }

      // Update content and editedTimestamp.
      // Populating dbMessage is necessary to ensure twitterLinks and pixivLinks
      // get correctly cleared.
      await em.populate(dbMessage, true);
      dbMessage.content = newMessage.content;
      if (newMessage.editedTimestamp) {
        dbMessage.setEdited(newMessage.editedTimestamp);
      }
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
    console.log(`reposts: deleting ${message.id}`);
    // Delete and send DM.
    // DON'T await Discord-related promises - these don't touch the database and
    // we don't want to block the entire channel's queue as it's for database,
    // not Discord purposes.
    // However, there could be a race where the message isn't deleted yet and
    // we move onto the next post, which is a repost of THIS - due to this
    // database message still existing.
    await em.removeAndFlush(dbMessage);
    // Discord-related promises below.
    void (async () => {
      try {
        await message.delete();
      } catch (err: unknown) {
        // Check for "lack permissions" code:
        // https://discord.com/developers/docs/topics/opcodes-and-status-codes#json-json-error-codes
        if (err instanceof DiscordAPIError && err.code === 50013) {
          return;
        }
        console.log(`reposts: error when deleting ${message.id}`, err);
        return;
      }
    })();
    // The author is probably in the cache.
    void (async () => {
      const author = await this.client.users.fetch(dbMessage.author);
      const notices = await Promise.all(
        reposts.map(async (link) => {
          const linkMessage = link.message.getEntity();
          const createdSecs = Math.round(link.created / 1000);
          let author = "You";
          if (linkMessage.author !== dbMessage.author) {
            author = (
              await this.client.users.fetch(linkMessage.author)
            ).toString();
          }
          return {
            description: `${author} sent ${link.url} [<t:${createdSecs}:R>](${linkMessage.url}).`,
          };
        })
      );
      try {
        await author.send({
          embeds: notices,
        });
      } catch (err) {
        const repostMessage = await message.channel.send({
          content: `${author} (I couldn't DM you!)`,
          embeds: notices,
          allowedMentions: { users: [author.id] },
        });
        await delay(10000);
        await repostMessage.delete();
      }
    })();
  }

  async messageDelete(message: Message | PartialMessage) {
    // Only guild_id?, channel_id and id exist here:
    // https://discord.com/developers/docs/topics/gateway#message-delete-message-delete-event-fields
    console.log(`delete: message ${message.id}`);
    const em = await getEm();
    await em.nativeDelete(Message, message.id);
  }

  async run() {
    await this.client.login(config.token);
  }
}

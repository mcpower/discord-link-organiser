import process from "process";
import {
  Client,
  DiscordAPIError,
  Intents,
  Message,
  PartialMessage,
  Snowflake,
} from "discord.js";
import { channelId, guildId, token } from "../config";
import assert from "assert";
import { getAllMessages, toDbMessageAndPopulate } from "./lib";
import { Message as DbMessage } from "../entities";
import { EM, getEm } from "../orm";
import { delay } from "../utils/delay";
import { LockQueue } from "../utils/LockQueue";
import { wrap } from "@mikro-orm/core";

export class GirlsClient {
  client: Client;
  /**
   * Resolved when this.ready() finishes.
   * Used to prevent races - for example, if a message is sent before ready()
   * finishes, it could change DbMessage.getLastMessage to be the newest message
   * instead of an old message, causing this.ready() to fail to fetch older
   * mesages.
   */
  readyPromise: Promise<void>;
  /**
   * Locks for a given message snowflake.
   * Used to prevent races which may occur when multiple async functions
   * relating to the same message run simultaneously.
   */
  messageLocks: Map<Snowflake, LockQueue>;
  /**
   * All messages that were processed in ready().
   * Used to detect when message creation events are emitted for messages that
   * were processed in ready(), which may occur when a message is sent between
   * when ready() is initially called, and the getAllMessages call in ready().
   * Cleared after a few seconds, as it is unlikely that we will process these
   * messages a few seconds after being ready.
   */
  scrollbackMessages: Set<Snowflake>;

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
    this.messageLocks = new Map();
    this.scrollbackMessages = new Set();

    let readyPromiseCallback: () => void;
    // The Promise constructor's function is immediately called, so the above
    // variable is guaranteed to be initialised after the following statement.
    this.readyPromise = new Promise((resolve) => {
      readyPromiseCallback = resolve;
    });

    this.client.once("ready", async (client) => {
      await this.ready(client);
      readyPromiseCallback();
      await delay(10000);
      this.scrollbackMessages.clear();
    });
    this.client.on("messageCreate", async (message) => {
      await this.readyPromise;
      this.ensureUnlocked(message.id, () => this.messageCreate(message));
    });
    this.client.on("messageUpdate", async (oldMessage, newMessage) => {
      await this.readyPromise;
      this.ensureUnlocked(newMessage.id, () =>
        this.messageUpdate(oldMessage, newMessage)
      );
    });
    this.client.on("messageDelete", async (message) => {
      await this.readyPromise;
      this.ensureUnlocked(message.id, () => this.messageDelete(message));
    });
    this.client.on("messageDeleteBulk", async (messages) => {
      await this.readyPromise;
      for (const message of messages.values()) {
        this.ensureUnlocked(message.id, () => this.messageDelete(message));
      }
    });
  }

  async ensureUnlocked(messageId: Snowflake, callback: () => Promise<unknown>) {
    let lock = this.messageLocks.get(messageId);
    if (!lock) {
      lock = new LockQueue();
      this.messageLocks.set(messageId, lock);
      lock.finished().then(() => this.messageLocks.delete(messageId));
    }
    lock.enqueue(callback);
  }

  async ready(client: Client<true>) {
    const em = await getEm();
    console.log(`Logged in as ${client.user.tag}`);
    const guild = await client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);
    assert(channel);
    assert(channel.isText());
    const lastMessage = await DbMessage.getLastMessage(channelId, em);
    console.log("lastMessage: ", lastMessage);
    const unprocessedMessages: DbMessage[] = [];
    for await (const message of getAllMessages(channel, lastMessage)) {
      const { author, content, type } = message;
      console.log(`${author.tag} sent "${content}" (${type})`);
      const dbMessage = toDbMessageAndPopulate(message);
      unprocessedMessages.push(dbMessage);
      this.scrollbackMessages.add(message.id);
    }
    await em.persistAndFlush(unprocessedMessages);
  }

  async messageCreate(message: Message) {
    if (this.scrollbackMessages.has(message.id)) {
      return;
    }
    const { author, content } = message;
    console.log(`Received "${content}" from ${author.tag}`);
    const em = await getEm();
    const dbMessage = toDbMessageAndPopulate(message);
    await em.persistAndFlush(dbMessage);
    await this.handleReposts(em, message, dbMessage);
  }

  async messageUpdate(
    _oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage
  ) {
    // Inspecting the Discord API, these fields SHOULD exist on newMessage ON A
    // MANUAL EDIT BY THE USER:
    // attachments, author, channel_id, components, content, edited_timestamp,
    // embeds, flags, guild_id, id, member, mention_everyone, mention_roles,
    // mentions, pinned, timestamp, tts, type
    // These fields should exist when an embed is updated:
    // channel_id, embeds, guild_id, id.
    // However, we should still explicitly fetch the message if we don't have
    // it.
    console.log(
      `Edited "${newMessage.content}" from ${newMessage.author?.tag}`
    );

    const em = await getEm();
    let dbMessage = await em.findOne(DbMessage, newMessage.id);
    // If we've seen this message before AND nothing interesting was changed,
    // just update the edited timestamp.
    if (
      dbMessage !== null &&
      (newMessage.content === null || newMessage.content === dbMessage.content)
    ) {
      if (newMessage.editedTimestamp) {
        dbMessage.edited = newMessage.editedTimestamp ?? undefined;
        await em.flush();
      }
      return;
    }

    // Otherwise, fetch everything and check for reposts.
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

    const newDbMessage = toDbMessageAndPopulate(newMessage);
    if (dbMessage === null) {
      dbMessage = newDbMessage;
      em.persist(dbMessage);
    } else {
      const data = wrap(newDbMessage).toObject();
      // Initialising the collections is necessary - if this is omitted, the
      // entities that are loaded below (i.e. old twitterLinks and pixivLinks)
      // are NOT deleted when the assign is called.
      await Promise.all([
        dbMessage.twitterLinks.init(),
        dbMessage.pixivLinks.init(),
      ]);
      // Explicitly setting the collections is necessary, as toObject() doesn't
      // seem to handle nested objects well and rewrites them as arrays of
      // undefineds instead of arrays of objects.
      data.twitterLinks = newDbMessage.twitterLinks.toArray();
      data.pixivLinks = newDbMessage.pixivLinks.toArray();
      wrap(dbMessage).assign(data);
    }
    await em.flush();
    await this.handleReposts(em, newMessage, dbMessage);
  }

  async handleReposts(em: EM, message: Message, dbMessage: DbMessage) {
    const reposts = await dbMessage.fetchReposts(em);
    if (reposts.length === 0) {
      return;
    }
    // Delete and send DM.
    const deletePromise = message.delete();
    const author = message.author;
    const dmPromise = author
      .send("Your last message had a repost.")
      .catch(async () => {
        const repostMessage = await message.channel.send({
          content: `${author}, your last message had a repost. (I couldn't DM you!)`,
          allowedMentions: { users: [author.id] },
        });
        await delay(3000);
        await repostMessage.delete();
      });
    await Promise.all([deletePromise, dmPromise]);
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
    await this.client.login(token);
  }
}

function ignoreAllUnhandledExceptions() {
  process.on("unhandledRejection", console.error);
}

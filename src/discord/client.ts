import process from "process";
import {
  Client,
  Intents,
  Message,
  PartialMessage,
  Snowflake,
} from "discord.js";
import { channelId, guildId, token } from "../config";
import assert from "assert";
import { getAllMessages, toDbMessageAndPopulate } from "./lib";
import { Message as DbMessage } from "../entities";
import { getEm } from "../orm";
import { delay } from "../utils/delay";
import { LockQueue } from "../utils/LockQueue";

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
    this.client.on("messageCreate", (message) => {
      this.ensureUnlocked(message.id, () => this.messageCreate(message));
    });
    this.client.on("messageUpdate", (oldMessage, newMessage) => {
      this.ensureUnlocked(newMessage.id, () =>
        this.messageUpdate(oldMessage, newMessage)
      );
    });
    this.client.on("messageDelete", (message) => {
      this.ensureUnlocked(message.id, () => this.messageDelete(message));
    });
    this.client.on("messageDeleteBulk", (messages) => {
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
    // We'll need to persist and flush this dbMessage, but we don't care if it's
    // before or after fetching reposts (as there's a filter in the queries to
    // prevent getting the same link back).
    const repostsPromise = dbMessage.fetchReposts(em);
    const flushPromise = em.persistAndFlush(dbMessage);
    const reposts = (await Promise.all([repostsPromise, flushPromise]))[0];
    if (reposts.length > 0) {
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
  }

  async messageUpdate(
    _oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage
  ) {
    // Inspecting the Discord API, these fields SHOULD exist on newMessage:
    // attachments, author, channel_id, components, content, edited_timestamp,
    // embeds, flags, guild_id, id, member, mention_everyone, mention_roles,
    // mentions, pinned, timestamp, tts, type
    // However, we should still explicitly fetch the message if we don't have it.
    const { author, content } = newMessage;
    console.log(`Edited "${content}" from ${author?.tag}`);
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

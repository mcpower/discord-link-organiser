import process from "process";
import {
  Client,
  Collection,
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

export class GirlsClient {
  client: Client;

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

    this.client.once("ready", this.ready.bind(this));
    this.client.on("messageCreate", this.messageCreate.bind(this));
    this.client.on("messageUpdate", this.messageUpdate.bind(this));
    this.client.on("messageDelete", this.messageDelete.bind(this));
    this.client.on("messageDeleteBulk", this.messageDeleteBulk.bind(this));
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
    }
    await em.persistAndFlush(unprocessedMessages);
  }

  async messageCreate(message: Message) {
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
          await new Promise((resolve) => setTimeout(resolve, 3000));
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

  async messageDeleteBulk(
    messages: Collection<Snowflake, Message | PartialMessage>
  ) {
    await Promise.all(messages.map((message) => this.messageDelete(message)));
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

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
import { getAllMessages, toDbMessage } from "./lib";
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
    const dbMessages: DbMessage[] = [];
    for await (const message of getAllMessages(channel, lastMessage)) {
      const { author, content, type } = message;
      console.log(`${author.tag} sent "${content}" (${type})`);
      const dbMessage = toDbMessage(message);
      dbMessage.populateLinks();
      // await em.persistAndFlush(dbMessage);
      dbMessages.push(dbMessage);
    }
    await em.persistAndFlush(dbMessages);
  }

  async messageCreate(message: Message) {
    const { author, content } = message;
    console.log(`Received "${content}" from ${author.tag}`);
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
  }

  async messageDeleteBulk(
    messages: Collection<Snowflake, Message | PartialMessage>
  ) {
    for (const message of messages.values()) {
      // Only guild_id, channel_id and id exist here.
      console.log(`Message ${message.id} bulk deleted`);
    }
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

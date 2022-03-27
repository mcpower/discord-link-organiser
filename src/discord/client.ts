import process from "process";
import { Client, Intents, Message } from "discord.js";
import { channelId, guildId, token } from "../config";
import assert from "assert";
import { getAllMessages, toDbMessage } from "./lib";
import { Message as DbMessage } from "../entities";
import { getEm } from "../orm";

// Create a new client instance
const client = new Client({
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

// When the client is ready, run this code (only once)
client.once("ready", async (client) => {
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
});

client.on("messageCreate", async (message) => {
  const { author, content } = message;
  console.log(`Received "${content}" from ${author.tag}`);
});

client.on("messageUpdate", async (_oldMessage, newMessage) => {
  // Inspecting the Discord API, these fields SHOULD exist on newMessage:
  // attachments, author, channel_id, components, content, edited_timestamp,
  // embeds, flags, guild_id, id, member, mention_everyone, mention_roles,
  // mentions, pinned, timestamp, tts, type
  // However, we should still explicitly fetch the message if we don't have it.
  const { author, content } = newMessage;
  console.log(`Edited "${content}" from ${author?.tag}`);
});

client.on("messageDelete", async (message) => {
  // Only guild_id, channel_id and id exist here.
  console.log(`Message ${message.id} deleted`);
});

client.on("messageDeleteBulk", async (messages) => {
  for (const message of messages.values()) {
    // Only guild_id, channel_id and id exist here.
    console.log(`Message ${message.id} bulk deleted`);
  }
});

function ignoreAllErrors() {
  client.on("error", console.error);
  process.on("unhandledRejection", console.error);
}

export async function run(): Promise<void> {
  ignoreAllErrors();
  // Login to Discord with your client's token
  await client.login(token);
}

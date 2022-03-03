import process from "process";
import { Client, Intents, Message } from "discord.js";
import { channelId, guildId, token } from "../config";
import assert from "assert";
import { parseMessage } from "../url";
import { getAllMessages } from "./lib";

// Create a new client instance
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

// When the client is ready, run this code (only once)
client.once("ready", async (client) => {
  console.log(`Logged in as ${client.user.tag}`);
  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(channelId);
  assert(channel);
  assert(channel.isText());
  for await (const message of getAllMessages(channel)) {
    const { author, content, type } = message;
    console.log(`${author.tag} sent "${content}" (${type})`);
    console.log(parseMessage(content));
  }
});

client.on("messageCreate", (message: Message) => {
  const { member, content } = message;
  console.log(`Received "${content}" from ${member?.user.tag}`);
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

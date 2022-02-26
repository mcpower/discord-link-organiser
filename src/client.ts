import process from "process";
import { Client, Intents, Message } from "discord.js";
import { token } from "./config";

// Create a new client instance
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

// When the client is ready, run this code (only once)
client.once("ready", (client) => {
  console.log(`Logged in as ${client.user.tag}`);
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

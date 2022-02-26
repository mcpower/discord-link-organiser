import { Client, Intents } from "discord.js";
import { token } from "./config";

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// When the client is ready, run this code (only once)
client.once("ready", () => {
  console.log("Ready!");
});

export function run() {
  // Login to Discord with your client's token
  client.login(token);
}

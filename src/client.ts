import process from "process";
import {
  BaseGuildTextChannel,
  Client,
  Collection,
  Intents,
  Message,
  Snowflake,
} from "discord.js";
import { channelId, guildId, token } from "./config";
import assert from "assert";

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
    const { author, content } = message;
    console.log(`${author.tag} sent "${content}"`);
  }
});

client.on("messageCreate", (message: Message) => {
  const { member, content } = message;
  console.log(`Received "${content}" from ${member?.user.tag}`);
});

const MAX_MESSAGES_PER_FETCH = 100;

async function* getAllMessages(channel: BaseGuildTextChannel) {
  let lastSeen: Snowflake | undefined = undefined;
  while (true) {
    const messages: Collection<Snowflake, Message> =
      await channel.messages.fetch({
        limit: MAX_MESSAGES_PER_FETCH,
        before: lastSeen,
      });
    // Discord doesn't guarantee any order for these messages...
    // https://discord.com/developers/docs/resources/channel#get-channel-messages
    // Sort from highest ID to lowest.
    messages.sort((_a, _b, a, b) => {
      const an = BigInt(a);
      const bn = BigInt(b);
      // The below is intentionally reversed to get highest ID to lowest.
      if (an < bn) {
        return 1;
      } else if (an > bn) {
        return -1;
      } else {
        return 0;
      }
    });
    yield* messages.values();
    const wtf = messages.last();
    if (wtf) {
      lastSeen = wtf.id;
    } else {
      break;
    }
  }
}

function ignoreAllErrors() {
  client.on("error", console.error);
  process.on("unhandledRejection", console.error);
}

export async function run(): Promise<void> {
  ignoreAllErrors();
  // Login to Discord with your client's token
  await client.login(token);
}

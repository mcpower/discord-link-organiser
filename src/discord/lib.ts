import {
  BaseGuildTextChannel,
  Collection,
  Message,
  Snowflake,
} from "discord.js";
import { compareBigints } from "../utils";

const MAX_MESSAGES_PER_FETCH = 100;

export async function* getAllMessages(channel: BaseGuildTextChannel) {
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
      return -compareBigints(a, b);
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

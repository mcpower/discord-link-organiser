import {
  BaseGuildTextChannel,
  Collection,
  Message,
  Snowflake,
} from "discord.js";
import { Message as DbMessage } from "../entities";
import { compareBigints } from "../utils";

const MAX_MESSAGES_PER_FETCH = 100;

export function toDbMessage(message: Message): DbMessage {
  const {
    id,
    guildId,
    channelId,
    author,
    content,
    attachments,
    createdTimestamp,
    editedTimestamp,
  } = message;
  return new DbMessage({
    id,
    guild: guildId === null ? undefined : guildId,
    channel: channelId,
    author: author.id,
    content,
    attachments: attachments.size,
    created: createdTimestamp,
    edited: editedTimestamp === null ? undefined : editedTimestamp,
  });
}

export function toDbMessageAndPopulate(message: Message): DbMessage {
  const dbMessage = toDbMessage(message);
  dbMessage.populateLinks();
  return dbMessage;
}

/**
 * Gets all messages since a given post.
 * @param channel The channel to fetch messages from.
 * @param after A Discord post snowflake.
 */
export async function* getAllMessages(
  channel: BaseGuildTextChannel,
  after = "0"
) {
  while (true) {
    const messages: Collection<Snowflake, Message> =
      await channel.messages.fetch({
        limit: MAX_MESSAGES_PER_FETCH,
        after,
      });
    // Discord doesn't guarantee any order for these messages...
    // https://discord.com/developers/docs/resources/channel#get-channel-messages
    // Sort from lowest ID to highest.
    messages.sort((_a, _b, a, b) => {
      return compareBigints(a, b);
    });
    yield* messages.values();
    const lastMessage = messages.last();
    if (lastMessage) {
      after = lastMessage.id;
    } else {
      break;
    }
  }
}

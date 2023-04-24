import { Message, MessageManager } from "discord.js";
import { Message as DbMessage } from "../entities";
import { compareBigints } from "../utils/bigints";
import { REST } from "@discordjs/rest";
import config from "../config";
import {
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from "discord-api-types/v9";

const MAX_MESSAGES_PER_FETCH = 100;

export function toDbMessage(
  message: Message,
  lastReadyTimestamp?: number
): DbMessage {
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
    lastReadyTimestamp,
  });
}

export function toDbMessageAndPopulate(
  message: Message,
  lastReadyTimestamp?: number
): DbMessage {
  const dbMessage = toDbMessage(message, lastReadyTimestamp);
  dbMessage.populateLinks();
  return dbMessage;
}

/**
 * Gets all messages since a given post.
 * @param messageManager The MessageManager to fetch messages from.
 * @param after A Discord post snowflake.
 */
export async function* getAllMessages(
  messageManager: MessageManager,
  after = "0"
) {
  while (true) {
    const messages = await messageManager.fetch({
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

export async function putGuildCommands(
  commands: RESTPostAPIApplicationCommandsJSONBody[]
) {
  // TODO: update REST version
  const rest = new REST({ version: "9" }).setToken(config.token);
  const route = Routes.applicationGuildCommands(
    config.applicationId,
    config.guildId
  );

  await rest.put(route, { body: commands });
}

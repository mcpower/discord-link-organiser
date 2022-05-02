import {
  Client,
  CommandInteraction,
  DiscordAPIError,
  Intents,
  Message,
  MessageEmbedOptions,
  PartialMessage,
  Snowflake,
} from "discord.js";
import * as config from "../config";
import assert from "assert";
import { getAllMessages, toDbMessageAndPopulate } from "./lib";
import { Message as DbMessage, User as DbUser } from "../entities";
import { EM, getEm } from "../orm";
import { delay } from "../utils/delay";
import { LockQueue } from "../utils/LockQueue";
import { URL_REGEX } from "../url";

export class GirlsClient {
  client: Client;
  /**
   * Lock queue for the channel.
   * Used to prevent race conditions - mostly ones relating to the database -
   * which may occur when multiple async functions relating to the same channel
   * run simultaneously.
   * (We only support one channel as of writing...)
   */
  channelLock: LockQueue;

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
    this.channelLock = new LockQueue();

    this.client.on("ready", (client) => {
      // Note that this gets really messy if we support multiple channels...
      this.channelLock.enqueue(() => this.ready(client));
    });
    this.client.on("messageCreate", (message) => {
      if (this.shouldIgnore(message)) {
        return;
      }
      this.channelLock.enqueue(() => this.messageCreate(message));
    });
    this.client.on("interactionCreate", (interaction) => {
      if (!interaction.isCommand()) {
        return;
      }
      if (interaction.guildId !== config.guildId) {
        void interaction.reply({
          content: "Error: unknown guild.",
          ephemeral: true,
        });
        return;
      }
      if (interaction.channelId !== config.channelId) {
        void interaction.reply({
          content: `Error: commands must be used in <#${config.channelId}>.`,
          ephemeral: true,
        });
        return;
      }

      // lol. lmao.
      const options = interaction.options;
      if (
        interaction.commandName !== "girls" ||
        options.getSubcommandGroup(false) !== "config" ||
        options.getSubcommand(false) !== "six-month"
      ) {
        void interaction.reply({
          content: "Error: unknown command.",
          ephemeral: true,
        });
        return;
      }

      // TODO: chuck this in a per-user queue instead of the channel
      this.channelLock.enqueue(() => this.configSixMonth(interaction));
    });
    this.client.on("messageUpdate", (oldMessage, newMessage) => {
      if (this.shouldIgnore(newMessage)) {
        return;
      }
      this.channelLock.enqueue(() =>
        this.messageUpdate(oldMessage, newMessage)
      );
    });
    this.client.on("messageDelete", (message) => {
      if (this.shouldIgnore(message)) {
        return;
      }
      // If message type is unknown, try deleting it anyway.
      this.channelLock.enqueue(() => this.messageDelete(message));
    });
    this.client.on("messageDeleteBulk", (messages) => {
      for (const message of messages.values()) {
        if (this.shouldIgnore(message)) {
          continue;
        }
        // If message type is unknown, try deleting it anyway.
        this.channelLock.enqueue(() => this.messageDelete(message));
      }
    });
    if (config.discordDebug) {
      this.client.on("debug", console.log);
    }
  }

  async configSixMonth(interaction: CommandInteraction) {
    const em = await getEm();
    let dbUser = await em.findOne(DbUser, interaction.user.id);
    if (dbUser === null) {
      dbUser = new DbUser(interaction.user.id);
      em.persist(dbUser);
    }
    dbUser.sixMonthDelete = interaction.options.getBoolean("delete", true);
    await em.flush();
    const content = dbUser.sixMonthDelete
      ? "Success: girls will now delete your reposts, even if they're old links."
      : "Success: girls will stop deleting your reposts of old links.";
    await interaction.reply({ content, ephemeral: true });
  }

  shouldIgnore(message: Message | PartialMessage) {
    // This is on the permissive side - if the message type is unknown, allow
    // it.
    const thisUser = this.client.user?.id;
    return (
      message.channelId !== config.channelId ||
      (message.type !== null &&
        message.type !== "DEFAULT" &&
        message.type !== "REPLY") ||
      (message.author !== null &&
        thisUser !== undefined &&
        message.author.id === thisUser)
    );
  }

  async ready(client: Client<true>) {
    const em = await getEm();
    console.log(`ready: logged in as ${client.user.tag}`);
    const channel = await client.channels.fetch(config.channelId);
    assert(channel, "The config's channel does not exist.");
    assert(channel.isText(), "The config's channel is not a text channel.");
    const lastMessage = await DbMessage.getLastMessage(config.channelId, em);
    console.log(`ready: getting all messages from ${lastMessage}`);
    const messageIds: Snowflake[] = [];
    for await (const message of getAllMessages(channel.messages, lastMessage)) {
      if (this.shouldIgnore(message)) {
        continue;
      }
      const dbMessage = toDbMessageAndPopulate(message, client.readyTimestamp);
      em.persist(dbMessage);
      messageIds.push(message.id);
    }
    // Delete messages if they're already in the database. The above fetch
    // should all be new - and if they're not, these are more recently fetched
    // than the ones inside the database.
    await em.nativeDelete(DbMessage, messageIds);
    console.log(`ready: inserting ${messageIds.length} message(s)`);
    await em.flush();
  }

  async messageCreate(message: Message) {
    console.log(`create: message ${message.id}`);
    const em = await getEm();
    const inDb = await em.count(DbMessage, message.id);
    if (inDb > 0) {
      console.log(`create: ${message.id} was already in DB`);
      return;
    }
    const dbMessage = toDbMessageAndPopulate(
      message,
      this.client.readyTimestamp ?? undefined
    );
    await em.persistAndFlush(dbMessage);
    await this.handleViolations(em, message, dbMessage);
  }

  /**
   * Updates an existing dbMessage based on newMessage. dbMessage must already
   * exist inside the database. This function does NOT flush the entity manager.
   * This function guarantees that dbMessage.lastReadyTimestamp is updated.
   * @returns Whether dbMessage was updated or not.
   */
  async updateDbMessage(
    em: EM,
    dbMessage: DbMessage,
    message: Message | PartialMessage,
    readyTimestamp?: number
  ): Promise<boolean> {
    dbMessage.lastReadyTimestamp =
      readyTimestamp ?? this.client.readyTimestamp ?? undefined;
    // If nothing interesting was changed, do nothing. Yes, we don't even
    // update the edited timestamp, as there's no point.
    if (message.content === null || message.content === dbMessage.content) {
      return false;
    }
    // If we somehow already have a more-up-to-date version of this message in
    // our database, ignore this edit.
    if (
      message.editedTimestamp !== null &&
      dbMessage.edited !== undefined &&
      message.editedTimestamp <= dbMessage.edited
    ) {
      console.log(
        `update: message ${message.id} was older (${message.editedTimestamp}) than db (${dbMessage.edited})`
      );
      return false;
    }

    // Update content and editedTimestamp.
    // Populating dbMessage is necessary to ensure twitterLinks and pixivLinks
    // get correctly cleared.
    await em.populate(dbMessage, true);
    dbMessage.content = message.content;
    if (message.editedTimestamp) {
      dbMessage.setEdited(message.editedTimestamp);
    }
    dbMessage.twitterLinks.removeAll();
    dbMessage.pixivLinks.removeAll();
    dbMessage.populateLinks();
    return true;
  }

  async messageUpdate(
    _oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage
  ) {
    // It's possible we don't have the message type of this message, so we need
    // to check that down the line.
    // This will always contain an id and channel_id:
    // https://discord.com/developers/docs/topics/gateway#message-update
    // That means this function is only called if channelId is correct, so we
    // don't need to check channelId in this method.
    console.log(`update: message ${newMessage.id}`);

    const em = await getEm();
    let dbMessage = await em.findOne(DbMessage, newMessage.id);

    if (dbMessage === null) {
      try {
        newMessage = await newMessage.fetch();
      } catch (err: unknown) {
        // The message was probably deleted.
        // Check for "unknown message" code:
        // https://discord.com/developers/docs/topics/opcodes-and-status-codes#json-json-error-codes
        if (err instanceof DiscordAPIError && err.code === 10008) {
          return;
        }
        console.log(`update: error when fetching ${newMessage.id}`, err);
        return;
      }

      if (this.shouldIgnore(newMessage)) {
        return;
      }
      dbMessage = toDbMessageAndPopulate(
        newMessage,
        this.client.readyTimestamp ?? undefined
      );
      em.persist(dbMessage);
    } else {
      // If nothing was updated, don't handle violations.
      if (!(await this.updateDbMessage(em, dbMessage, newMessage))) {
        await em.flush();
        return;
      }
    }

    await em.flush();
    await this.handleViolations(em, newMessage, dbMessage);
  }

  async handleViolations(
    em: EM,
    message: Message | PartialMessage,
    dbMessage: DbMessage
  ) {
    const notices: string[] = [];
    // Manually use URL_REGEX here as we don't store plain links.
    if (
      config.deleteNoImages &&
      dbMessage.attachments === 0 &&
      dbMessage.content.match(URL_REGEX) === null
    ) {
      notices.push("Your message had no links or attachments.");
    }
    // TODO: move the below constant somewhere else
    const repostCutoff = Date.now() - (1000 * 60 * 60 * 24 * 365) / 2;

    // Guarantee that readyTimestamp is available.
    const readyTimestamp = this.client.readyTimestamp;
    if (readyTimestamp === null) {
      console.error("reposts: readyTimestamp is null? aborting");
      return;
    }
    let dbUser = await em.findOne(DbUser, dbMessage.author);
    if (dbUser === null) {
      // Do not persist this new dbUser - we just use it for getting the default
      // values of options.
      dbUser = new DbUser(dbMessage.author);
    }

    let reposts: Awaited<ReturnType<DbMessage["fetchReposts"]>>;
    // Messages that we've fetched successfully (whether it's deleted or not).
    const fetchedIds = new Set<Snowflake>();
    // Messages that failed to fetch.
    const failedIds = new Set<Snowflake>();
    while (true) {
      reposts = await dbMessage.fetchReposts(em);
      // fetchReposts guarantees the message is loaded.
      // TODO: filter this inside the database query instead (if possible)
      if (!dbUser.sixMonthDelete) {
        reposts = reposts.filter((link) => {
          const linkMessage = link.message.getEntity();
          return (
            linkMessage.updated > repostCutoff && !failedIds.has(linkMessage.id)
          );
        });
      }
      const messages = [
        ...new Map(
          reposts
            .map((link) => link.message.getEntity())
            .map((message) => [message.id, message])
        ).values(),
      ];
      const messagesToFetch = messages.filter(
        (message) =>
          message.lastReadyTimestamp === undefined ||
          message.lastReadyTimestamp !== readyTimestamp
      );

      if (messagesToFetch.length === 0) {
        break;
      }
      const alreadyFetched = messagesToFetch
        .map(({ id }) => id)
        .filter((id) => fetchedIds.has(id));
      if (alreadyFetched.length > 0) {
        console.error(
          `reposts: attempting to fetch ${JSON.stringify(
            alreadyFetched
          )} which were previously fetched (this should never happen)`
        );
        return;
      }
      await Promise.all(
        messagesToFetch.map(async (messageToFetch) => {
          console.log(`reposts: fetching ${messageToFetch.id}`);
          try {
            const fetched = await message.channel.messages.fetch(
              messageToFetch.id
            );

            // Pass in the readyTimestamp from before so we're guaranteed that
            // it doesn't change between iterations.
            await this.updateDbMessage(
              em,
              messageToFetch,
              fetched,
              readyTimestamp
            );
            fetchedIds.add(messageToFetch.id);
          } catch (err: unknown) {
            // The message was probably deleted.
            // Check for "unknown message" code:
            // https://discord.com/developers/docs/topics/opcodes-and-status-codes#json-json-error-codes
            if (err instanceof DiscordAPIError && err.code === 10008) {
              fetchedIds.add(messageToFetch.id);
              // We need to cascade delete the link entity from the ORM... or
              // else the link entity still exists within the ORM, which points
              // to the original entity, so it gets revived next time we flush.
              // Unfortunately, that means we need to explicitly populate this.
              await em.populate(messageToFetch, true);
              em.remove(messageToFetch);
              return;
            }
            console.error(
              `reposts: error when fetching ${messageToFetch.id}. ignoring`,
              err
            );
            failedIds.add(messageToFetch.id);
            return;
          }
        })
      );

      await em.flush();
    }

    const repostNotices = await Promise.all(
      reposts.map(async (link) => {
        const linkMessage = link.message.getEntity();
        const createdSecs = Math.round(link.created / 1000);
        let author = "You";
        if (linkMessage.author !== dbMessage.author) {
          author = (
            await this.client.users.fetch(linkMessage.author)
          ).toString();
        }
        return `${author} sent ${link.url} <t:${createdSecs}:R> ([message](${linkMessage.url})).`;
      })
    );
    notices.push(...repostNotices);

    if (notices.length === 0) {
      return;
    }

    console.log(`reposts: deleting ${message.id}`);
    // Delete and send DM.
    // DON'T await Discord-related promises - these don't touch the database and
    // we don't want to block the entire channel's queue as it's for database,
    // not Discord purposes.
    // However, there could be a race where the message isn't deleted yet and
    // we move onto the next post, which is a repost of THIS - due to this
    // database message still existing.
    // However... if the delete DIDN'T work, the message will be lost forever.
    // This is bad! The race here is okay to work around that.
    void (async () => {
      let deleted = false;
      try {
        await message.delete();
        deleted = true;
      } catch (err: unknown) {
        // Check for "lack permissions" code:
        // https://discord.com/developers/docs/topics/opcodes-and-status-codes#json-json-error-codes
        if (!(err instanceof DiscordAPIError && err.code === 50013)) {
          console.log(`reposts: error when deleting ${message.id}`, err);
        }
      }
      // The author is probably in the cache.
      const author = await this.client.users.fetch(dbMessage.author);
      if (!deleted) {
        notices.push(
          `Please delete [your message](${dbMessage.url}) if I didn't make a mistake!`
        );
      }
      const embeds: MessageEmbedOptions[] = [
        {
          description: notices.join("\n"),
        },
      ];
      try {
        await author.send({
          embeds,
        });
      } catch (err) {
        const repostMessage = await message.channel.send({
          content: `${author}, I couldn't DM you!`,
          embeds,
          allowedMentions: { users: [author.id] },
        });
        await delay(10000);
        await repostMessage.delete();
      }
    })();
  }

  async messageDelete(message: Message | PartialMessage) {
    // Only guild_id?, channel_id and id exist here:
    // https://discord.com/developers/docs/topics/gateway#message-delete-message-delete-event-fields
    console.log(`delete: message ${message.id}`);
    const em = await getEm();
    await em.nativeDelete(Message, message.id);
  }

  ignoreAllErrors() {
    this.client.on("error", console.error);
  }

  async run() {
    this.ignoreAllErrors();
    ignoreAllUnhandledExceptions();
    await this.client.login(config.token);
  }
}

function ignoreAllUnhandledExceptions() {
  process.on("unhandledRejection", console.error);
}

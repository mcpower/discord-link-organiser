import {
  Cascade,
  Collection,
  Entity,
  Index,
  OneToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { PixivLink, TwitterLink } from ".";
import { EM } from "../orm";
import { parseMessage } from "../url";

// Store IDs as strings as our ORM can't support 64 bit ints.
// TODO: In 2080, the ID index and getLastMessage queries will not work. Use
// manual string-based comparison of numbers instead (first compare length of
// strings, then compare strings themselves).
@Entity()
@Index({
  name: "message_channel_id_index",
  expression:
    "create index `message_channel_id_index` on `message` " +
    "(`channel`, cast(`id` as bigint))",
}) // Used for max(id) given channel
export class Message {
  // Discord post snowflake
  @PrimaryKey({ autoincrement: false })
  id: string;

  // Discord guild snowflake
  @Property()
  guild?: string;

  // Discord channel snowflake
  @Property()
  channel: string;

  // Discord user snowflake
  @Property()
  author: string;

  @Property()
  created: number;

  // The last readyTimestamp of the client that retrieved this.
  @Property()
  lastReadyTimestamp?: number;

  // Could change on edit.
  @Property()
  edited?: number;

  // Could change on edit.
  @Property()
  content: string;

  @Property()
  attachments: number;

  // Based on content.
  @OneToMany({
    entity: () => TwitterLink,
    mappedBy: "message",
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  twitterLinks = new Collection<TwitterLink>(this);

  // Based on content.
  @OneToMany({
    entity: () => PixivLink,
    mappedBy: "message",
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  pixivLinks = new Collection<PixivLink>(this);

  constructor({
    id,
    channel,
    author,
    guild,
    content,
    attachments,
    created,
    edited,
    lastReadyTimestamp,
  }: {
    id: string;
    guild: string | undefined;
    channel: string;
    author: string;
    content: string;
    attachments: number;
    created: number;
    edited: number | undefined;
    lastReadyTimestamp?: number;
  }) {
    this.id = id;
    this.guild = guild;
    this.channel = channel;
    this.author = author;
    this.created = created;
    this.edited = edited;
    this.content = content;
    this.attachments = attachments;
    this.lastReadyTimestamp = lastReadyTimestamp;
  }

  populateLinks() {
    const { links } = parseMessage(this.content);
    for (const { url } of links) {
      const twitter = TwitterLink.fromUrl(this, url);
      if (twitter) {
        this.twitterLinks.add(twitter);
        continue;
      }
      const pixiv = PixivLink.fromUrl(this, url);
      if (pixiv) {
        this.pixivLinks.add(pixiv);
        continue;
      }
    }
  }

  /**
   * Assumes twitterLinks and pixivLinks are both loaded.
   */
  setEdited(edited: number | undefined) {
    this.edited = edited;
    for (const twitterLink of this.twitterLinks.getItems()) {
      twitterLink.created = this.updated;
    }
    for (const pixivLink of this.pixivLinks.getItems()) {
      pixivLink.created = this.updated;
    }
  }

  async fetchReposts(em: EM): Promise<(TwitterLink | PixivLink)[]> {
    // TODO: This exhibits the N+1 queries problem - more specifically, (number
    // of links) queries. We can do ALL of the below in (number of types of
    // links) queries instead with some joins.  Something like:
    //
    // select t2.*, m2.*
    // from twitter_link as t1
    // left join twitter_link as t2 on t2.twitter_id = t1.twitter_id
    // left join message as m2 on m2.id = t2.message_id
    // where t1.message_id = ?
    // and t2.channel = t1.channel
    // and t2.created < t1.created
    //
    // Most ORMs can't handle this... and (number of links) is almost always 1.
    const nestedLinks = await Promise.all(
      [this.twitterLinks, this.pixivLinks].map(async (collection) => {
        const links = await collection.loadItems();
        return Promise.all(links.map((link) => link.lastLink(em)));
      })
    );
    return nestedLinks
      .flat()
      .filter(
        (link): link is Exclude<typeof link, undefined> => link !== undefined
      );
  }

  get url() {
    // This exceeds 80 chars. Any other way of formatting this is ugly :/
    // prettier-ignore
    return `https://discord.com/channels/${this.guild ?? "@me"}/${this.channel}/${this.id}`;
  }

  get updated() {
    return this.edited ?? this.created;
  }

  static async getLastMessage(channel: string, em: EM): Promise<string> {
    const qb = em.createQueryBuilder(Message);
    const lastMessage: { id: string } = await qb
      .select("cast(coalesce(max(cast(`id` as bigint)), 0) as text) as `id`")
      .where({ channel })
      .execute("get", false);
    return lastMessage.id;
  }
}

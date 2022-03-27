import {
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

  // Discord channel snowflake
  @Property()
  channel: string;

  // Discord user snowflake
  @Property()
  author: string;

  @Property()
  created: number;

  @Property()
  edited?: number;

  @Property()
  content: string;

  @Property()
  attachments: number;

  @Property()
  comment: string;

  @OneToMany(() => TwitterLink, (link) => link.message)
  twitterLinks = new Collection<TwitterLink>(this);

  @OneToMany(() => PixivLink, (link) => link.message)
  pixivLinks = new Collection<PixivLink>(this);

  constructor({
    id,
    channel,
    author,
    content,
    attachments,
    created,
    edited,
  }: {
    id: string;
    channel: string;
    author: string;
    content: string;
    attachments: number;
    created: number;
    edited: number | undefined;
  }) {
    this.id = id;
    this.channel = channel;
    this.author = author;
    this.created = created;
    this.edited = edited;
    this.content = content;
    this.attachments = attachments;
    this.comment = "";
  }

  populateLinks() {
    const { comment, links } = parseMessage(this.content);
    this.comment = comment;
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

  static async getLastMessage(channel: string, em: EM): Promise<string> {
    const qb = em.createQueryBuilder(Message);
    const lastMessage: { id: string } = await qb
      .select("cast(coalesce(max(cast(`id` as bigint)), 0) as text) as `id`")
      .where({ channel })
      .execute("get", false);
    return lastMessage.id;
  }
}

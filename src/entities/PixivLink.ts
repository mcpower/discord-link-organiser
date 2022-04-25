import {
  Entity,
  IdentifiedReference,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  QueryOrder,
  Reference,
} from "@mikro-orm/core";
import { Message } from ".";
import { EM } from "../orm";
import { parsePixivUrl } from "../websites/pixiv";

@Entity()
// Used for "get all posts in channel which sent a link before a given time"
@Index({ properties: ["pixivId", "channel", "created"] })
export class PixivLink {
  // when it's necessary, add a generic "HasId" on the class
  @PrimaryKey({ autoincrement: true })
  id?: number;

  @ManyToOne({ onDelete: "cascade" })
  message: IdentifiedReference<Message>;

  @Property()
  pixivId: string;

  // Denormalised. Should be equivalent to message.channel.
  @Property()
  channel: string;

  // Denormalised. Should be equivalent to message.updated.
  @Property()
  created: number;

  constructor(message: Message, pixivId: string) {
    this.message = Reference.create(message);
    this.pixivId = pixivId;
    this.channel = message.channel;
    this.created = message.updated;
  }

  static fromUrl(message: Message, url: URL): PixivLink | undefined {
    const pixivId = parsePixivUrl(url);
    if (pixivId === undefined) {
      return undefined;
    }
    return new PixivLink(message, pixivId);
  }

  get url(): string {
    return `https://www.pixiv.net/en/artworks/${this.pixivId}`;
  }

  async lastLink(em: EM): Promise<PixivLink | undefined> {
    const qb = em.createQueryBuilder(PixivLink, "t");
    const dbLink = await qb
      .select("*")
      .where({
        pixivId: this.pixivId,
        channel: this.channel,
        // probably not needed
        message: { $ne: this.message.id },
        created: { $lt: this.created },
      })
      .leftJoinAndSelect("t.message", "m")
      .orderBy({
        created: QueryOrder.DESC,
      })
      .limit(1)
      .getSingleResult();

    if (dbLink === null) {
      return undefined;
    }

    return dbLink;
  }
}

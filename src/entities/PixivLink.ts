import {
  Entity,
  expr,
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
// Used for "get all posts in channel which sent a link"
@Index({ properties: ["id", "channel"] })
export class PixivLink {
  // when it's necessary, add a generic "HasId" on the class
  @PrimaryKey({ autoincrement: true })
  id?: number;

  @ManyToOne()
  message: IdentifiedReference<Message>;

  @Property()
  pixivId: string;

  // Denormalised. Should be equivalent to message.channel.
  @Property()
  channel: string;

  constructor(message: Message, pixivId: string) {
    this.message = Reference.create(message);
    this.pixivId = pixivId;
    this.channel = message.channel;
  }

  static fromUrl(message: Message, url: URL): PixivLink | undefined {
    const pixivId = parsePixivUrl(url);
    if (pixivId === undefined) {
      return undefined;
    }
    return new PixivLink(message, pixivId);
  }

  async lastLink(em: EM): Promise<PixivLink | undefined> {
    const qb = em.createQueryBuilder(PixivLink, "t");
    const dbLink = await qb
      .select("*")
      .where({
        twitterId: this.pixivId,
        channel: this.channel,
        message: { $ne: this.message.id },
      })
      .leftJoinAndSelect("t.message", "m")
      .orderBy({
        [expr("coalesce(`m`.`edited`, `m`.`created`)")]: QueryOrder.DESC,
      })
      .limit(1)
      .getSingleResult();

    if (dbLink === null) {
      return undefined;
    }

    return dbLink;
  }
}

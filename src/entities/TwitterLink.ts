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
import { parseTwitterUrl } from "../websites/twitter";

@Entity()
// Used for "get all posts in channel which sent a link"
@Index({ properties: ["twitterId", "channel"] })
export class TwitterLink {
  // when it's necessary, add a generic "HasId" on the class
  @PrimaryKey({ autoincrement: true })
  id?: number;

  @ManyToOne()
  message: IdentifiedReference<Message>;

  @Property()
  twitterId: string;

  // Denormalised. Should be equivalent to message.channel.
  @Property()
  channel: string;

  constructor(message: Message, twitterId: string) {
    this.message = Reference.create(message);
    this.twitterId = twitterId;
    this.channel = message.channel;
  }

  static fromUrl(message: Message, url: URL): TwitterLink | undefined {
    const twitterId = parseTwitterUrl(url);
    if (twitterId === undefined) {
      return undefined;
    }
    return new TwitterLink(message, twitterId);
  }

  async lastPost(em: EM): Promise<Message | undefined> {
    const qb = em.createQueryBuilder(TwitterLink, "t");
    const dbLink = await qb
      .select("*")
      .where({
        twitterId: this.twitterId,
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

    return dbLink.message.load();
  }
}

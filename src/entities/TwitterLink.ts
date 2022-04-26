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
import { parseTwitterUrl } from "../websites/twitter";

@Entity()
// Used for "get all posts in channel which sent a link before a given time"
@Index({ properties: ["twitterId", "channel", "created"] })
export class TwitterLink {
  // when it's necessary, add a generic "HasId" on the class
  @PrimaryKey({ autoincrement: true })
  id?: number;

  @ManyToOne({ onDelete: "cascade" })
  message: IdentifiedReference<Message>;

  @Property()
  twitterId: string;

  // Denormalised. Should be equivalent to message.channel.
  @Property()
  channel: string;

  // Denormalised. Should be equivalent to message.updated.
  @Property()
  created: number;

  constructor(message: Message, twitterId: string) {
    this.message = Reference.create(message);
    this.twitterId = twitterId;
    this.channel = message.channel;
    this.created = message.updated;
  }

  static fromUrl(message: Message, url: URL): TwitterLink | undefined {
    const twitterId = parseTwitterUrl(url);
    if (twitterId === undefined) {
      return undefined;
    }
    return new TwitterLink(message, twitterId);
  }

  get url(): string {
    return `https://twitter.com/_/status/${this.twitterId}`;
  }

  async lastLink(em: EM): Promise<TwitterLink | undefined> {
    const qb = em.createQueryBuilder(TwitterLink, "t");
    const dbLink = await qb
      .select("*")
      .where({
        twitterId: this.twitterId,
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

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

  static async lastPost(
    link: TwitterLink,
    em: EM
  ): Promise<Message | undefined> {
    const dbLink = await em.findOne(
      TwitterLink,
      {
        twitterId: link.twitterId,
        channel: link.channel,
        message: { $ne: link.message.id },
      },
      {
        // TODO: use coalesce(edited, created) instead of message ID
        orderBy: { [expr("cast(`message_id` as bigint)")]: QueryOrder.DESC },
      }
    );

    if (dbLink === null) {
      return undefined;
    }

    return dbLink.message.load();
  }
}

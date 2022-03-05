import {
  Entity,
  expr,
  IdentifiedReference,
  Index,
  ManyToOne,
  PrimaryKey,
  PrimaryKeyType,
  Property,
  QueryOrder,
  Reference,
} from "@mikro-orm/core";
import { Message } from ".";
import { EM } from "../orm";
import { toTwitter } from "../websites/twitter";

// Uses (post, Twitter ID) as a primary key. If a post has two identical tweets,
// "merge" them into one.
@Entity()
// Used for "get all posts in channel which sent a link"
@Index({ properties: ["id", "channel"] })
export class TwitterLink {
  @ManyToOne({ primary: true })
  message: IdentifiedReference<Message>;

  @PrimaryKey()
  id: string;

  // Denormalised. Should be equivalent to message.channel.
  @Property()
  channel: string;

  // this is needed for proper type checks in `FilterQuery`
  [PrimaryKeyType]?: [string, string];

  constructor(message: Message, id: string) {
    this.message = Reference.create(message);
    this.id = id;
    this.channel = message.channel;
  }

  static fromUrl(message: Message, url: URL): TwitterLink | undefined {
    const id = toTwitter(url);
    if (id === undefined) {
      return undefined;
    }
    return new TwitterLink(message, id);
  }

  static async lastPost(
    link: TwitterLink,
    em: EM
  ): Promise<Message | undefined> {
    const dbLink = await em.findOne(
      TwitterLink,
      {
        id: link.id,
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

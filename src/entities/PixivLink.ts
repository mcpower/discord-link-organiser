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
import { toPixiv } from "../websites/pixiv";

// Uses (post, Pixiv ID) as a primary key. If a post has two identical tweets,
// "merge" them into one.
@Entity()
// Used for "get all posts in channel which sent a link"
@Index({ properties: ["id", "channel"] })
export class PixivLink {
  @ManyToOne({ primary: true })
  message: IdentifiedReference<Message>;

  @PrimaryKey()
  id: string;

  // TODO: add twitter user

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

  static fromUrl(message: Message, url: URL): PixivLink | undefined {
    const id = toPixiv(url);
    if (id === undefined) {
      return undefined;
    }
    return new PixivLink(message, id);
  }

  static async lastPost(link: PixivLink, em: EM): Promise<Message | undefined> {
    const dbLink = await em.findOne(
      PixivLink,
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

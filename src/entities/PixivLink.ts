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
import { parsePixivUrl } from "../websites/pixiv";

// Uses (post, Pixiv ID) as a primary key. If a post has two identical tweets,
// "merge" them into one.
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

  // TODO: add twitter user

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

  static async lastPost(link: PixivLink, em: EM): Promise<Message | undefined> {
    const dbLink = await em.findOne(
      PixivLink,
      {
        pixivId: link.pixivId,
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

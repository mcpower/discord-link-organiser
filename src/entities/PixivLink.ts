import {
  BigIntType,
  Entity,
  IdentifiedReference,
  Index,
  ManyToOne,
  PrimaryKey,
  PrimaryKeyType,
  Property,
  Reference,
} from "@mikro-orm/core";
import { Message } from ".";

// Uses (post, Pixiv ID) as a primary key. If a post has two identical tweets,
// "merge" them into one.
@Entity()
// Used for "get all posts in channel which sent a link"
@Index({ properties: ["id", "channel"] })
export class PixivLink {
  @ManyToOne({ primary: true })
  message: IdentifiedReference<Message>;

  @PrimaryKey({ type: BigIntType })
  id: string;

  // Denormalised. Should be equivalent to message.channel.
  @Property({ type: BigIntType })
  channel: string;

  // this is needed for proper type checks in `FilterQuery`
  [PrimaryKeyType]?: [string, string];

  constructor(message: Message, id: string, channel: string) {
    this.message = Reference.create(message);
    this.id = id;
    this.channel = channel;
  }
}

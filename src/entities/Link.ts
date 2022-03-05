import {
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
import { EM } from "../orm";

// Uses (post, URL) as a primary key. If a post has two identical URLs, "merge"
// them into one.
@Entity()
// Used for "get all posts in channel which sent a link"
@Index({ properties: ["url", "channel"] })
export class Link {
  @ManyToOne({ primary: true })
  message: IdentifiedReference<Message>;

  @PrimaryKey()
  url: string;

  // Denormalised. Should be equivalent to message.channel.
  @Property()
  channel: string;

  // this is needed for proper type checks in `FilterQuery`
  [PrimaryKeyType]?: [string, string];

  constructor(message: Message, url: string) {
    this.message = Reference.create(message);
    this.url = url;
    this.channel = message.channel;
  }

  static fromUrl(message: Message, url: URL): Link {
    return new Link(message, url.toString());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async lastPost(_link: Link, _em: EM): Promise<Message | undefined> {
    // Stub for now - we don't want to delete/warn normal links.
    return undefined;
  }
}

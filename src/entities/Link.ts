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
import { Post } from ".";

// Uses (post, URL) as a primary key. If a post has two identical URLs, "merge"
// them into one.
@Entity()
// Used for "get all posts in channel which sent a link"
@Index({ properties: ["url", "channel"] })
export class Link {
  @ManyToOne({ primary: true })
  post: IdentifiedReference<Post>;

  @PrimaryKey()
  url: string;

  // Denormalised. Should be equivalent to post.channel.
  @Property({ type: BigIntType })
  channel: string;

  // this is needed for proper type checks in `FilterQuery`
  [PrimaryKeyType]?: [string, string];

  constructor(post: Post, url: string, channel: string) {
    this.post = Reference.create(post);
    this.url = url;
    this.channel = channel;
  }
}

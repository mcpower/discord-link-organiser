import {
  BigIntType,
  Collection,
  Entity,
  Index,
  ManyToMany,
  OneToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Link, PixivLink, TwitterLink } from ".";

@Entity()
@Index({ properties: ["id", "channel"] }) // Used for max(id) given channel
export class Post {
  // Discord post snowflake
  @PrimaryKey({ type: BigIntType, autoincrement: false })
  id: string;

  // Discord channel snowflake
  @Property({ type: BigIntType })
  channel: string;

  // Discord user snowflake
  @Property({ type: BigIntType })
  author: string;

  @OneToMany(() => Link, (link) => link.post)
  links = new Collection<Link>(this);

  @OneToMany(() => TwitterLink, (link) => link.post)
  twitterLinks = new Collection<TwitterLink>(this);

  @OneToMany(() => PixivLink, (link) => link.post)
  pixivLinks = new Collection<PixivLink>(this);

  constructor(id: string, channel: string, author: string) {
    this.id = id;
    this.channel = channel;
    this.author = author;
  }
}

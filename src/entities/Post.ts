import {
  BigIntType,
  Collection,
  Entity,
  Index,
  ManyToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Link } from ".";

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

  @ManyToMany({ entity: () => Link })
  links = new Collection<Link>(this);

  constructor(id: string, channel: string, author: string) {
    this.id = id;
    this.channel = channel;
    this.author = author;
  }
}

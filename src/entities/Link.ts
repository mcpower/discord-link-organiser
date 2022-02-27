import {
  Entity,
  Index,
  IntegerType,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { If } from "discord.js";

@Entity()
export class Link<HasId extends boolean = boolean> {
  @PrimaryKey({ type: IntegerType })
  id: If<HasId, number, undefined>;

  @Property()
  @Index()
  url: string;

  constructor(id: If<HasId, number, undefined>, url: string) {
    this.id = id;
    this.url = url;
  }

  hasId(): this is Link<true> {
    return this.id !== undefined;
  }

  static fromUrl(url: string): Link {
    return new Link(undefined, url);
  }
}

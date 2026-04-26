import { Entity, PrimaryKey, Property } from "@mikro-orm/decorators/legacy";

@Entity()
export class User {
  // Discord user snowflake
  @PrimaryKey({ autoincrement: false })
  id: string;

  @Property({ default: false })
  sixMonthDelete = false;

  constructor(id: string) {
    this.id = id;
  }
}

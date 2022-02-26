import { BigIntType, Entity, PrimaryKey } from "@mikro-orm/core";

@Entity()
export class Post {
  @PrimaryKey({ type: BigIntType })
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}

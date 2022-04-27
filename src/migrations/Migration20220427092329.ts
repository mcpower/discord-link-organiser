/* eslint-disable @typescript-eslint/require-await */
import { Migration } from "@mikro-orm/migrations";

export class Migration20220427092329 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      "alter table `message` add column `last_ready_timestamp` integer null;"
    );
  }

  override async down(): Promise<void> {
    this.addSql("alter table `message` drop column `last_ready_timestamp`;");
  }
}

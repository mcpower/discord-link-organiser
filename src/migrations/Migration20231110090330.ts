/* eslint-disable @typescript-eslint/require-await */
import { Migration } from "@mikro-orm/migrations";

export class Migration20231110090330 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      "alter table `pixiv_link` add column `pixiv_index` integer not null default 0;"
    );
  }

  override async down(): Promise<void> {
    this.addSql("alter table `pixiv_link` drop column `pixiv_index`;");
  }
}

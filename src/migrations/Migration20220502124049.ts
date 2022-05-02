/* eslint-disable @typescript-eslint/require-await */
import { Migration } from "@mikro-orm/migrations";

export class Migration20220502124049 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      "create table `user` (`id` text not null, `six_month_delete` integer not null default false, primary key (`id`));"
    );
  }

  override async down(): Promise<void> {
    this.addSql("drop table `user`;");
  }
}

/* eslint-disable @typescript-eslint/require-await */
import { Migration } from "@mikro-orm/migrations";

export class Migration20220427092121 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      "create table `message` (`id` text not null, `guild` text null, `channel` text not null, `author` text not null, `created` integer not null, `edited` integer null, `content` text not null, `attachments` integer not null, primary key (`id`));"
    );
    this.addSql(
      "create index `message_channel_id_index` on `message` (`channel`, cast(`id` as bigint));"
    );

    this.addSql(
      "create table `pixiv_link` (`id` integer not null primary key autoincrement, `message_id` text not null, `pixiv_id` text not null, `channel` text not null, `created` integer not null, constraint `pixiv_link_message_id_foreign` foreign key(`message_id`) references `message`(`id`) on delete cascade on update cascade);"
    );
    this.addSql(
      "create index `pixiv_link_message_id_index` on `pixiv_link` (`message_id`);"
    );
    this.addSql(
      "create index `pixiv_link_pixiv_id_channel_created_index` on `pixiv_link` (`pixiv_id`, `channel`, `created`);"
    );

    this.addSql(
      "create table `twitter_link` (`id` integer not null primary key autoincrement, `message_id` text not null, `twitter_id` text not null, `channel` text not null, `created` integer not null, constraint `twitter_link_message_id_foreign` foreign key(`message_id`) references `message`(`id`) on delete cascade on update cascade);"
    );
    this.addSql(
      "create index `twitter_link_message_id_index` on `twitter_link` (`message_id`);"
    );
    this.addSql(
      "create index `twitter_link_twitter_id_channel_created_index` on `twitter_link` (`twitter_id`, `channel`, `created`);"
    );
  }
}

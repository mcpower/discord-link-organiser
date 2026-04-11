create table `message` (`id` text not null, `guild` text null, `channel` text not null, `author` text not null, `created` integer not null, `edited` integer null, `content` text not null, `attachments` integer not null, primary key (`id`));
create index `message_channel_id_index` on `message` (`channel`, cast(`id` as bigint));

create table `pixiv_link` (`id` integer not null primary key autoincrement, `message_id` text not null, `pixiv_id` text not null, `channel` text not null, `created` integer not null, constraint `pixiv_link_message_id_foreign` foreign key(`message_id`) references `message`(`id`) on delete cascade on update cascade);
create index `pixiv_link_message_id_index` on `pixiv_link` (`message_id`);
create index `pixiv_link_pixiv_id_channel_created_index` on `pixiv_link` (`pixiv_id`, `channel`, `created`);

create table `twitter_link` (`id` integer not null primary key autoincrement, `message_id` text not null, `twitter_id` text not null, `channel` text not null, `created` integer not null, constraint `twitter_link_message_id_foreign` foreign key(`message_id`) references `message`(`id`) on delete cascade on update cascade);
create index `twitter_link_message_id_index` on `twitter_link` (`message_id`);
create index `twitter_link_twitter_id_channel_created_index` on `twitter_link` (`twitter_id`, `channel`, `created`);

import { MikroORM } from "@mikro-orm/core";
import type { SqliteDriver } from "@mikro-orm/sqlite"; // or any other driver package
import assert from "assert";
import { Link } from "./entities";
import config from "./orm.config";

(async () => {
  const orm = await MikroORM.init<SqliteDriver>(config);
  const em = orm.em.fork();
  const test = Link.fromUrl("twitter.com");
  console.log(`${test.url} adding as id ${test.id}`);
  await em.persistAndFlush(test);
  assert(test.hasId());
  console.log(`${test.url} added as id ${test.id}`);
})();

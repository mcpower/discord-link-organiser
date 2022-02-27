import { MikroORM } from "@mikro-orm/core";
import type { SqliteDriver } from "@mikro-orm/sqlite"; // or any other driver package
import config from "./orm.config";

const ormPromise = MikroORM.init<SqliteDriver>(config);

export async function getEm() {
  const orm = await ormPromise;
  return orm.em.fork();
}

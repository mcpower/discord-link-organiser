import { MikroORM } from "@mikro-orm/core";
import type { BetterSqliteDriver } from "@mikro-orm/better-sqlite";
import config from "./orm.config";

const ormPromise = MikroORM.init<BetterSqliteDriver>(config);

export async function getEm() {
  const orm = await ormPromise;
  return orm.em.fork();
}

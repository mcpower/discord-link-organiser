import { MikroORM } from "@mikro-orm/core";
import type { EntityManager, SqliteDriver } from "@mikro-orm/sqlite";
import ormConfig from "./orm.config.js";

const ormPromise = MikroORM.init<SqliteDriver>(ormConfig);

export async function getEm() {
  const orm = await ormPromise;
  return orm.em.fork();
}

export function getOrm() {
  return ormPromise;
}

export type EM = EntityManager<SqliteDriver>;

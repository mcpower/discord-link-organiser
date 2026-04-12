import { MikroORM } from "@mikro-orm/core";
import type { BetterSqliteDriver } from "@mikro-orm/better-sqlite";
import ormConfig from "./orm.config.js";

const ormPromise = MikroORM.init<BetterSqliteDriver>(ormConfig);

export async function getEm() {
  const orm = await ormPromise;
  return orm.em.fork();
}

export function getOrm() {
  return ormPromise;
}

export type EM = Awaited<ReturnType<typeof getEm>>;

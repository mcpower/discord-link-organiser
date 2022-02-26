import { MikroORM } from "@mikro-orm/core";
import type { SqliteDriver } from "@mikro-orm/sqlite"; // or any other driver package
import config from "./orm.config";

(async () => {
  const orm = await MikroORM.init<SqliteDriver>(config);
  console.log(orm.em); // access EntityManager via `em` property
})();

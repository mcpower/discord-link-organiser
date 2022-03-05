import { Configuration, Options } from "@mikro-orm/core";
import type { BetterSqliteDriver } from "@mikro-orm/better-sqlite";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import * as entities from "./entities";

const config: Options<BetterSqliteDriver> | Configuration<BetterSqliteDriver> =
  {
    metadataProvider: TsMorphMetadataProvider,
    entities: Object.values(entities),
    dbName: "db.sqlite",
    type: "better-sqlite",
    migrations: {
      path: "./build/src/migrations",
      pathTs: "./src/migrations",
    },
    forceUndefined: true,
    debug: true,
  };

export default config;

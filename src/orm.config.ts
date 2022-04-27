import { Configuration, Options } from "@mikro-orm/core";
import type { BetterSqliteDriver } from "@mikro-orm/better-sqlite";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import * as entities from "./entities";
import { ormDebug } from "./config";

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
    debug: ormDebug,
  };

export default config;

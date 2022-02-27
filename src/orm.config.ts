import { Configuration, Options } from "@mikro-orm/core";
import { SqliteDriver } from "@mikro-orm/sqlite";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import * as entities from "./entities";

const config: Options<SqliteDriver> | Configuration<SqliteDriver> = {
  metadataProvider: TsMorphMetadataProvider,
  entities: Object.values(entities),
  dbName: "db.sqlite",
  type: "sqlite",
  migrations: {
    path: "./build/src/migrations",
    pathTs: "./src/migrations",
  },
};

export default config;

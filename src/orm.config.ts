import { Configuration, Options } from "@mikro-orm/core";
import { SqliteDriver } from "@mikro-orm/sqlite";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import * as entities from "./entities";

const config: Options<SqliteDriver> | Configuration<SqliteDriver> = {
  metadataProvider: TsMorphMetadataProvider,
  entities: Object.values(entities),
  dbName: "db.sqlite",
  type: "sqlite",
};

export default config;

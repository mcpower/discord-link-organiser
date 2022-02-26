import { Configuration, Options } from "@mikro-orm/core";
import { SqliteDriver } from "@mikro-orm/sqlite";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";

const config: Options<SqliteDriver> | Configuration<SqliteDriver> = {
  metadataProvider: TsMorphMetadataProvider,
  entities: ["./build/src/entities"],
  entitiesTs: ["./src/entities"],
  dbName: "db.sqlite",
  type: "sqlite",
};

export default config;

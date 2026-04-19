import { defineConfig } from "@mikro-orm/better-sqlite";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import * as entities from "./entities/index.js";
import config from "./config.js";

const ormConfig = defineConfig({
  metadataProvider: TsMorphMetadataProvider,
  entities: Object.values(entities),
  dbName: "db.sqlite",
  migrations: {
    path: "./build/src/migrations",
    pathTs: "./src/migrations",
  },
  forceUndefined: true,
  debug: config.ormDebug,
});

export default ormConfig;

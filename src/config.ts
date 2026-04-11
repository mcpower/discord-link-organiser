// Type checked config file with TypeScript.
import * as config from "../config.json";

config satisfies {
  token: string;
  channelId: string;
  guildId: string;
  applicationId: string;
  deleteNoImages: boolean;
  ormDebug: boolean;
  discordDebug: boolean;
};

export = config;

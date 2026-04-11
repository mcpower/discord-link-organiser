// Type checked config file with TypeScript.
import * as config from "../config.json";

if (false) {
  function isType<T>(_t: T) {}
  isType<{
    token: string;
    channelId: string;
    guildId: string;
    applicationId: string;
    deleteNoImages: boolean;
    ormDebug: boolean;
    discordDebug: boolean;
  }>(config);
}

export = config;

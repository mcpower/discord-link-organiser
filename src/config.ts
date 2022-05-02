// Type checked config file with TypeScript.
import * as config from "../config.json";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (false) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars, no-inner-declarations
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

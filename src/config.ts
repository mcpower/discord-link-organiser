// Type checked config file with TypeScript.
import * as config from "../config.json";

// oxlint-disable-next-line eslint(no-constant-condition)
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

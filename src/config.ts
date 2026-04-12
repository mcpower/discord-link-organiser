// Type checked config file with TypeScript.
import config from "../config.json" with { type: "json" };

config satisfies {
  token: string;
  channelId: string;
  guildId: string;
  applicationId: string;
  deleteNoImages: boolean;
  ormDebug: boolean;
  discordDebug: boolean;
};

export default config;

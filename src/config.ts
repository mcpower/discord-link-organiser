// Type checked config file with TypeScript.
import { token, channelId, debug } from "../config.json";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (false) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars, no-inner-declarations
  function isType<T>(_t: T) {}
  isType<string>(token);
  isType<string>(channelId);
  isType<boolean>(debug);
}

export { token, channelId, debug };

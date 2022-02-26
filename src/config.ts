// Type checked config file with TypeScript.
import { token } from "../config.json";

// eslint-disable-next-line no-constant-condition
if (false) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars, no-inner-declarations
  function isType<T>(_t: T) {}
  isType<string>(token);
}

export { token };

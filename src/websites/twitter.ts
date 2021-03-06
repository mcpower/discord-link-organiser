import { compareBigints, MAX_SQL_INT } from "../utils/bigints";

const HOSTS = ["twitter.com", "www.twitter.com", "mobile.twitter.com"];
const PATH_REGEXES = [
  /^\/[^/]*\/status\/(\d+)(?:\/photo\/\d+)?\/?$/,
  /^\/i\/web\/status\/(\d+)\/?$/,
];

export function parseTwitterUrl(url: URL): string | undefined {
  if (!HOSTS.includes(url.hostname)) {
    return undefined;
  }
  for (const pathRegex of PATH_REGEXES) {
    const match = url.pathname.match(pathRegex);
    if (match !== null) {
      const id = match[1];
      if (id && compareBigints(id, MAX_SQL_INT) > 0) {
        throw new Error(`twitter id ${id} can't fit in a database`);
      }
      return id;
    }
  }
  return undefined;
}

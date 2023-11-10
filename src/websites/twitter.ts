import { compareBigints, MAX_SQL_INT } from "../utils/bigints";

const HOSTS = [
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
  "vxtwitter.com",
  "www.vxtwitter.com",
  "fxtwitter.com",
  "www.fxtwitter.com",
  "twittpr.com",
  "www.twittpr.com",
  "x.com",
  "www.x.com",
];
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
        return undefined;
      }
      return id;
    }
  }
  return undefined;
}

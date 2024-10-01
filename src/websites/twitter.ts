import { compareBigints, MAX_SQL_INT } from "../utils/bigints";

const HOSTS = [
  // Official
  "twitter.com",
  "x.com",
  // FixTweet
  "fxtwitter.com",
  "twittpr.com",
  "fixupx.com",
  "stupidpenisx.com", // thanks oxateu
  // BetterTwitFix
  "vxtwitter.com",
  "fixvx.com",
];
const PATH_REGEXES = [
  /^\/[^/]*\/status\/(\d+)(?:\/photo\/\d+)?\/?$/,
  /^\/i\/web\/status\/(\d+)\/?$/,
];

export function parseTwitterUrl(url: URL): string | undefined {
  if (
    !HOSTS.some(
      (host) => url.hostname == host || url.hostname.endsWith("." + host)
    )
  ) {
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

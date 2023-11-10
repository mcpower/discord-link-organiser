import { compareBigints, MAX_SQL_INT } from "../utils/bigints";

const HOSTS = [
  "pixiv.net",
  "www.pixiv.net",
  "phixiv.net",
  "www.phixiv.net",
  "ppxiv.net",
  "www.ppxiv.net",
];
const PATH_REGEX = /^\/(?:en\/)?artworks\/(\d+)(?:\/(\d+))?\/?/;
const OLD_PIXIV_PATH = "/member_illust.php";
const OLD_PIXIV_PARAM = "illust_id";
const POSITIVE_NUMBER_REGEX = /^\d+$/;

export function parsePixivUrl(
  url: URL
): { id: string; index: number } | undefined {
  if (!HOSTS.includes(url.hostname)) {
    return undefined;
  }

  let id: string | undefined = undefined;
  let index = 0;

  const match = url.pathname.match(PATH_REGEX);
  if (match !== null) {
    id = match[1];
    const indexMatch = match[2];
    if (indexMatch) {
      // As the regex uses /\d+/, it is guaranteed that this is a positive
      // integer.
      const indexInUrl = Number(indexMatch);
      if (indexInUrl < Number.MAX_SAFE_INTEGER) {
        index = indexInUrl - 1;
      } else {
        // TODO: this probably shouldn't throw?
        throw new Error(`pixiv index ${indexMatch} can't be decremented`);
      }
    }
  }

  if (url.pathname.startsWith(OLD_PIXIV_PATH)) {
    const oldId = url.searchParams.get(OLD_PIXIV_PARAM);
    if (oldId !== null && oldId.match(POSITIVE_NUMBER_REGEX)) {
      id = oldId;
    }
  }

  if (id === undefined) {
    return undefined;
  }

  if (compareBigints(id, MAX_SQL_INT) > 0) {
    // TODO: this probably shouldn't throw?
    throw new Error(`pixiv id ${id} can't fit in a database`);
  }
  return { id, index };
}

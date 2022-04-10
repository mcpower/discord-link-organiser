import { compareBigints, MAX_SQL_INT } from "../utils/bigints";

const HOSTS = ["pixiv.net", "www.pixiv.net"];
const PATH_REGEX = /^\/(?:en\/)?artworks\/(\d+)\/?/;
const OLD_PIXIV_PATH = "/member_illust.php";
const OLD_PIXIV_PARAM = "illust_id";
const POSITIVE_NUMBER_REGEX = /^\d+$/;

export function parsePixivUrl(url: URL): string | undefined {
  if (!HOSTS.includes(url.hostname)) {
    return undefined;
  }

  let id: string | undefined = undefined;

  const match = url.pathname.match(PATH_REGEX);
  if (match !== null) {
    id = match[1];
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
    throw new Error(`pixiv id ${id} can't fit in a database`);
  }
  return id;
}

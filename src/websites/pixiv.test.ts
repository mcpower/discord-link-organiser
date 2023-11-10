import { describe, expect, test } from "@jest/globals";
import { parsePixivUrl } from "./pixiv";

describe("parsePixivUrl", () => {
  test("works with a random pixiv link", () => {
    const girl = "https://www.pixiv.net/en/artworks/66458540";
    expect(parsePixivUrl(new URL(girl))).toStrictEqual({
      id: "66458540",
      index: 0,
    });
  });

  test("works with a non-English link", () => {
    const girl = "https://www.pixiv.net/artworks/66458540";
    expect(parsePixivUrl(new URL(girl))).toStrictEqual({
      id: "66458540",
      index: 0,
    });
  });

  test("works with a random phixiv link", () => {
    const girl = "https://www.phixiv.net/en/artworks/66458540";
    expect(parsePixivUrl(new URL(girl))).toStrictEqual({
      id: "66458540",
      index: 0,
    });
  });

  test("works with a non-English phixiv link", () => {
    const girl = "https://www.phixiv.net/artworks/66458540";
    expect(parsePixivUrl(new URL(girl))).toStrictEqual({
      id: "66458540",
      index: 0,
    });
  });

  test("works with a random ppxiv link", () => {
    const girl = "https://www.ppxiv.net/en/artworks/66458540";
    expect(parsePixivUrl(new URL(girl))).toStrictEqual({
      id: "66458540",
      index: 0,
    });
  });

  test("works with a non-English ppxiv link", () => {
    const girl = "https://www.ppxiv.net/artworks/66458540";
    expect(parsePixivUrl(new URL(girl))).toStrictEqual({
      id: "66458540",
      index: 0,
    });
  });

  test("gives correct index with phixiv links", () => {
    const girl = "https://www.phixiv.net/en/artworks/85499495/11";
    expect(parsePixivUrl(new URL(girl))).toStrictEqual({
      id: "85499495",
      index: 10,
    });
  });

  test("throws when index is absurdly big", () => {
    const girl =
      "https://www.phixiv.net/en/artworks/85499495/10000000000000000";
    expect(() => parsePixivUrl(new URL(girl))).toThrow();
  });

  test("works with the old URL format", () => {
    const girl =
      "http://www.pixiv.net/member_illust.php?mode=medium&illust_id=66458540";
    expect(parsePixivUrl(new URL(girl))).toStrictEqual({
      id: "66458540",
      index: 0,
    });
  });

  test("throws when id is too big", () => {
    const girl = "https://www.pixiv.net/en/artworks/6645854000000000000000";
    expect(() => parsePixivUrl(new URL(girl))).toThrow();

    const otherFormatGirl =
      "http://www.pixiv.net/member_illust.php?mode=medium&illust_id=6645854000000000000000";
    expect(() => parsePixivUrl(new URL(otherFormatGirl))).toThrow();
  });

  test("rejects other URLs", () => {
    const twitterLink = "https://twitter.com/WD0706/status/1480872116660494338";
    const stackOverflowLink =
      "https://stackoverflow.com/questions/57660050/why-is-1-32-equal-to-1-in-javascript";

    expect(parsePixivUrl(new URL(twitterLink))).toBeUndefined();
    expect(parsePixivUrl(new URL(stackOverflowLink))).toBeUndefined();
  });

  test("rejects other pixiv URLs", () => {
    const homePage = "https://www.pixiv.net/";
    const artist = "https://www.pixiv.net/en/users/2622803";

    expect(parsePixivUrl(new URL(homePage))).toBeUndefined();
    expect(parsePixivUrl(new URL(artist))).toBeUndefined();
  });

  test("rejects old format when id is invalid", () => {
    const missingIllustId =
      "http://www.pixiv.net/member_illust.php?mode=medium";
    expect(parsePixivUrl(new URL(missingIllustId))).toBeUndefined();
    const emptyIllustId =
      "http://www.pixiv.net/member_illust.php?mode=medium&illust_id=";
    expect(parsePixivUrl(new URL(emptyIllustId))).toBeUndefined();
    const illustIdWithLetters =
      "http://www.pixiv.net/member_illust.php?mode=medium&illust_id=abc123";
    expect(parsePixivUrl(new URL(illustIdWithLetters))).toBeUndefined();
  });
});

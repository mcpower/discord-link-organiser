import { parseTwitterUrl } from "./twitter";
import { describe, expect, test } from "@jest/globals";

describe("parseTwitterUrl", () => {
  test("works with a random tweet from minalinsky", () => {
    const girl =
      "https://twitter.com/WD0706/status/1480872116660494338?s=20&t=p-j0-Ypttf8u2POAjiYC1w";
    expect(parseTwitterUrl(new URL(girl))).toBe("1480872116660494338");
  });

  test("works when you forget to remove the slash", () => {
    const girl = "https://twitter.com/WD0706/status/1480872116660494338/";
    expect(parseTwitterUrl(new URL(girl))).toBe("1480872116660494338");
  });

  test.each(["vxtwitter.com", "fxtwitter.com", "twittpr.com"])(
    "works with domain %s",
    (domain) => {
      const girl = `https://${domain}/WD0706/status/1480872116660494338/`;
      expect(parseTwitterUrl(new URL(girl))).toBe("1480872116660494338");
    }
  );

  test("works with another URL format", () => {
    const girl = "https://twitter.com/i/web/status/1480872116660494338";
    expect(parseTwitterUrl(new URL(girl))).toBe("1480872116660494338");
  });

  test("works with mobile URLs", () => {
    const girl = "https://mobile.twitter.com/WD0706/status/1480872116660494338";
    expect(parseTwitterUrl(new URL(girl))).toBe("1480872116660494338");
  });

  test("works when copying the URL after expanding an embed", () => {
    const photo =
      "https://twitter.com/WD0706/status/1480872116660494338/photo/1";
    expect(parseTwitterUrl(new URL(photo))).toBe("1480872116660494338");
  });

  test("throws when id is too big", () => {
    const girl =
      "https://twitter.com/WD0706/status/14808721166604943380000000000";
    expect(() => parseTwitterUrl(new URL(girl))).toThrow();

    const otherFormatGirl =
      "https://twitter.com/i/web/status/14808721166604943380000000000";
    expect(() => parseTwitterUrl(new URL(otherFormatGirl))).toThrow();
  });

  test("rejects other URLs", () => {
    const pixivLink = "https://www.pixiv.net/en/artworks/66458540";
    const stackOverflowLink =
      "https://stackoverflow.com/questions/57660050/why-is-1-32-equal-to-1-in-javascript";

    expect(parseTwitterUrl(new URL(pixivLink))).toBeUndefined();
    expect(parseTwitterUrl(new URL(stackOverflowLink))).toBeUndefined();
  });

  test("rejects other twitter URLs", () => {
    const homePage = "https://twitter.com";
    const myProfile = "https://twitter.com/mcpowr";

    expect(parseTwitterUrl(new URL(homePage))).toBeUndefined();
    expect(parseTwitterUrl(new URL(myProfile))).toBeUndefined();
  });
});

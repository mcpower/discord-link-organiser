import { describe, expect, test } from "@jest/globals";
import { parseMessage } from "./url";

describe("urlsAndCommentFromMessage", () => {
  test("works with a single URL", () => {
    const { comment, links } = parseMessage("https://google.com");
    expect(links).toHaveLength(1);
    expect(links[0].url.toString()).toBe("https://google.com/");
    expect(links[0].extra).toBe("");
    expect(comment).toBe("");
  });

  test("gets the message from one of my posts", () => {
    const { comment, links } = parseMessage(
      "(via Lily) https://twitter.com/sabasabaflash/status/1487712193449639942"
    );
    expect(links).toHaveLength(1);
    expect(links[0].url.toString()).toBe(
      "https://twitter.com/sabasabaflash/status/1487712193449639942"
    );
    expect(links[0].extra).toBe("");
    expect(comment).toBe("(via Lily)");
  });

  test("works with multiple URLs", () => {
    const { comment, links } = parseMessage(
      "https://google.com https://yahoo.com https://bing.com"
    );
    expect(links).toHaveLength(3);
    expect(links[0].url.toString()).toBe("https://google.com/");
    expect(links[0].extra).toBe("");
    expect(links[1].url.toString()).toBe("https://yahoo.com/");
    expect(links[1].extra).toBe("");
    expect(links[2].url.toString()).toBe("https://bing.com/");
    expect(links[2].extra).toBe("");
    expect(comment).toBe("");
  });

  test("works with multiple URLs with extras and comments", () => {
    const { comment, links } = parseMessage(
      "search engines https://google.com 1 https://yahoo.com 2 https://bing.com 3"
    );
    expect(links).toHaveLength(3);
    expect(links[0].url.toString()).toBe("https://google.com/");
    expect(links[0].extra).toBe("1");
    expect(links[1].url.toString()).toBe("https://yahoo.com/");
    expect(links[1].extra).toBe("2");
    expect(links[2].url.toString()).toBe("https://bing.com/");
    expect(links[2].extra).toBe("3");
    expect(comment).toBe("search engines");
  });

  test("works with leading/trailing whitespace", () => {
    const { comment, links } = parseMessage(
      "  (via Lily) https://twitter.com/sabasabaflash/status/1487712193449639942  "
    );
    expect(links).toHaveLength(1);
    expect(links[0].url.toString()).toBe(
      "https://twitter.com/sabasabaflash/status/1487712193449639942"
    );
    expect(links[0].extra).toBe("");
    expect(comment).toBe("(via Lily)");
  });

  test("works with no urls", () => {
    const { comment, links } = parseMessage(" hello world ");
    expect(links).toHaveLength(0);
    expect(comment).toBe("hello world");
  });

  test("works with invalid URLs", () => {
    const evil = "lol http://1000.1000.1000.1000/ >:D";
    expect(() => parseMessage(evil)).not.toThrow();
    const { comment, links } = parseMessage(evil);
    expect(comment).toBe(evil);
    expect(links).toHaveLength(0);
  });
});

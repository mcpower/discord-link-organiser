import assert from "assert";

const URL_REGEX = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/g;

interface MessageContents {
  comment: string;
  links: MessageLink[];
}

interface MessageLink {
  url: URL;
  extra: string;
}

export function parseMessage(message: string): MessageContents {
  const urls = [...message.matchAll(URL_REGEX)].map(
    (match) => new URL(match[0])
  );
  if (urls.length === 0) {
    return { comment: message.trim(), links: [] };
  }

  const [comment, ...extras] = message
    .split(URL_REGEX)
    .map((part) => part.trim());
  assert(
    extras.length === urls.length,
    `mismatched lengths for ${JSON.stringify(message)}`
  );
  const links = urls.map<MessageLink>((url, i) => ({
    url,
    extra: extras[i],
  }));

  return { comment, links };
}

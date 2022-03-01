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
  const urls: URL[] = [];
  const parts: string[] = [];
  // current position in message
  let i = 0;
  for (const match of message.matchAll(URL_REGEX)) {
    const urlText = match[0];
    try {
      urls.push(new URL(urlText));
    } catch (e: unknown) {
      // bad URL - continue onto next match
      continue;
    }
    assert(match.index !== undefined);
    // the non-URL part of the message before this URL
    const previousPart = message.substring(i, match.index).trim();
    parts.push(previousPart);
    i = match.index + urlText.length;
  }
  // push the last part of the message on
  parts.push(message.substring(i).trim());
  const [comment, ...extras] = parts;
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

import assert from "assert";

export const URL_REGEX = /https?:\/\/[^\s<]+[^<.,:;"')\]\s>|]/g;

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
    // The match array must have the matched text as the first item.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/matchAll#return_value
    const urlText = match[0]!;
    try {
      urls.push(new URL(urlText));
    } catch {
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
    // extras and urls are guaranteed to have the same length as asserted above.
    extra: extras[i]!,
  }));
  // comment is guaranteed to be defined due to having the last portion of the
  // message be pushed into parts.
  return { comment: comment!, links };
}

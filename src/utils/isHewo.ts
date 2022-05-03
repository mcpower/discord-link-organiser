const HEWO_REGEX = /^HEWO( HEWO)*$/;
export function isHewo(str: string): boolean {
  str = str.trim();
  return str.match(HEWO_REGEX) !== null;
}

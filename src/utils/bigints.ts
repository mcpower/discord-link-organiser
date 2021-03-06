export const MAX_SQL_INT = ((1n << 63n) - 1n).toString();
export function compareBigints(a: string, b: string) {
  const lengths = a.length - b.length;
  if (lengths !== 0) {
    return lengths;
  }
  if (a > b) {
    return 1;
  } else if (a < b) {
    return -1;
  } else {
    return 0;
  }
}

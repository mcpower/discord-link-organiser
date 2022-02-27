import { describe, expect, test } from "@jest/globals";
import { compareBigints } from "./utils";

const FILLER = "0123456789".repeat(5);
describe("compareBigints", () => {
  test("works with numbers of different lengths", () => {
    const smaller = "99" + FILLER;
    const bigger = "345" + FILLER;
    expect(compareBigints(smaller, bigger)).toBeLessThan(0);
    expect(compareBigints(bigger, smaller)).toBeGreaterThan(0);
  });

  test("works with numbers of the same length", () => {
    const smaller = "345" + FILLER;
    const bigger = "347" + FILLER;
    expect(compareBigints(smaller, bigger)).toBeLessThan(0);
    expect(compareBigints(bigger, smaller)).toBeGreaterThan(0);
  });

  test("works with identical numbers", () => {
    const num = "345" + FILLER;
    expect(compareBigints(num, num)).toBe(0);
  });
});

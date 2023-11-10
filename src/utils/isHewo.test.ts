import { describe, expect, test } from "vitest";
import { isHewo } from "./isHewo";

describe("isHewo", () => {
  test("works", () => {
    expect(isHewo("HEWO")).toBeTruthy();
    expect(isHewo("HEWO ")).toBeTruthy();
    expect(isHewo("HEWO HEWO HEWO")).toBeTruthy();
    expect(isHewo("HEWO HEWO HEWO ")).toBeTruthy();

    expect(isHewo("")).toBeFalsy();
    expect(isHewo("  ")).toBeFalsy();
    expect(isHewo("hewo")).toBeFalsy();
    expect(
      isHewo(
        "https://twitter.com/WD0706/status/1480872116660494338?s=20&hewo=hewo"
      )
    ).toBeFalsy();
  });
});

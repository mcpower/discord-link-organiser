import { describe, expect, test } from "vitest";
import { delay } from "./delay";
import { LockQueue } from "./LockQueue";

describe("LockQueue", () => {
  test("works", async () => {
    const lockQueue = new LockQueue();
    const output: number[] = [];

    lockQueue.enqueue(() => delay(100).then(() => output.push(1)));
    lockQueue.enqueue(() => delay(50).then(() => output.push(2)));
    lockQueue.enqueue(() => delay(0).then(() => output.push(3)));
    await lockQueue.finished();
    expect(output).toEqual([1, 2, 3]);
  });

  test("finished works when not running", async () => {
    const lockQueue = new LockQueue();
    lockQueue.enqueue(() => delay(50));
    await lockQueue.finished();
    await lockQueue.finished();
  });
});

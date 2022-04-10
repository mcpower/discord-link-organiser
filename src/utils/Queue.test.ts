import { describe, expect, test } from "@jest/globals";
import { Queue } from "./Queue";

describe("queue", () => {
  test("works", () => {
    const queue = new Queue<number>();
    expect(queue.length).toBe(0);
    expect(queue.first()).toBe(undefined);
    expect(queue.pop()).toBe(undefined);

    queue.push(11);
    expect(queue.length).toBe(1);
    expect(queue.first()).toBe(11);

    queue.push(22);
    expect(queue.length).toBe(2);
    expect(queue.first()).toBe(11);

    expect(queue.pop()).toBe(11);
    expect(queue.length).toBe(1);
    expect(queue.first()).toBe(22);

    queue.push(33);
    expect(queue.length).toBe(2);
    expect(queue.first()).toBe(22);

    expect(queue.pop()).toBe(22);
    expect(queue.length).toBe(1);
    expect(queue.first()).toBe(33);

    expect(queue.pop()).toBe(33);
    expect(queue.length).toBe(0);
    expect(queue.first()).toBe(undefined);
  });
});

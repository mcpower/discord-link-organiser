import { describe, expect, test } from "@jest/globals";
import { Queue } from "./Queue";

describe("queue", () => {
  test("works", () => {
    const queue = new Queue<number>();
    expect(queue.length).toBe(0);
    expect(queue.first()).toBe(undefined);
    expect(queue.dequeue()).toBe(undefined);

    queue.enqueue(11);
    expect(queue.length).toBe(1);
    expect(queue.first()).toBe(11);

    queue.enqueue(22);
    expect(queue.length).toBe(2);
    expect(queue.first()).toBe(11);

    expect(queue.dequeue()).toBe(11);
    expect(queue.length).toBe(1);
    expect(queue.first()).toBe(22);

    queue.enqueue(33);
    expect(queue.length).toBe(2);
    expect(queue.first()).toBe(22);

    expect(queue.dequeue()).toBe(22);
    expect(queue.length).toBe(1);
    expect(queue.first()).toBe(33);

    expect(queue.dequeue()).toBe(33);
    expect(queue.length).toBe(0);
    expect(queue.first()).toBe(undefined);
  });
});

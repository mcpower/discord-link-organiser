import assert from "assert";
import { Queue } from "./Queue";

type AsyncFunction = () => Promise<unknown>;

/**
 * A class that runs the given enqueued asynchronous functions one at a time, in
 * the order that the functions were enqueued.
 */
export class LockQueue {
  private isRunning: boolean;
  private queue: Queue<AsyncFunction>;
  private finishedCallbacks: (() => void)[];

  constructor() {
    this.queue = new Queue();
    this.isRunning = false;
    this.finishedCallbacks = [];
  }

  enqueue(f: AsyncFunction) {
    this.queue.enqueue(f);
    if (!this.isRunning) {
      this.run();
    }
  }

  /**
   * @returns A promise which is resolved when there are no async functions left
   * in the queue.
   */
  finished(): Promise<void> {
    if (!this.isRunning) {
      return Promise.resolve();
    } else {
      return new Promise((resolve) => this.finishedCallbacks.push(resolve));
    }
  }

  private run() {
    assert(!this.isRunning, "LockQueue shouldn't be running");
    const nextFunction = this.queue.dequeue();
    if (nextFunction === undefined) {
      // Safety: these callbacks are called synchronously, and all callbacks are
      // trivial resolve calls, so finishedCallbacks can't be mutated while this
      // loop is running. Even if there were a caller which would call finished
      // right after awaiting finished like
      // `lockQueue.finished().then(() => lockQueue.finished())`, the .then
      // callback will only be executed on the next microtask flush.
      for (const callback of this.finishedCallbacks) {
        callback();
      }
      this.finishedCallbacks = [];
      return;
    }
    this.isRunning = true;
    nextFunction().then(() => {
      this.isRunning = false;
      // This will set this.isRunning = true without a microtick in-between
      // (assuming there's still stuff in the queue).
      this.run();
    });
  }
}

import assert from "assert";
import { Queue } from "./Queue";

type AsyncFunction = () => Promise<unknown>;

/**
 * A class that runs the given enqueued asynchronous functions one at a time, in
 * the order that the functions were enqueued.
 */
export class LockQueue {
  /**
   * If defined, the queue is running and the (promise, resolve) object
   * represents the finished() Promise and the function to resolve it.
   */
  private state: { promise: Promise<void>; resolve: () => void } | undefined;
  private queue: Queue<AsyncFunction>;

  constructor() {
    this.queue = new Queue();
    this.state = undefined;
  }

  enqueue(f: AsyncFunction) {
    this.queue.enqueue(f);
    if (!this.state) {
      this.run();
    }
  }

  /**
   * @returns A promise which is resolved when there are no async functions left
   * in the queue.
   */
  finished(): Promise<void> {
    return this.state ? this.state.promise : Promise.resolve();
  }

  private run() {
    const nextFunction = this.queue.dequeue();
    if (nextFunction === undefined) {
      // Safety: This function is only called from two places: enqueue and
      // itself. Enqueue guarantees that the queue is non-empty (so this block
      // never runs if called from enqueue), and if this was called from itself
      // then this.state is guaranteed to be defined.
      assert(this.state);
      this.state.resolve();
      this.state = undefined;
      return;
    }
    if (this.state === undefined) {
      let resolve: (() => void) | undefined = undefined;
      const promise: Promise<void> = new Promise((r) => (resolve = r));
      assert(resolve);
      this.state = { promise, resolve };
    }
    nextFunction().then(() => {
      this.run();
    });
  }
}

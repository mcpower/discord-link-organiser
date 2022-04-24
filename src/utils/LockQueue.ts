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
      let resolve: (() => void) | undefined = undefined;
      const promise: Promise<void> = new Promise((r) => (resolve = r));
      assert(resolve);
      this.state = { promise, resolve };
      void this.run();
    }
  }

  /**
   * @returns A promise which is resolved when there are no async functions left
   * in the queue.
   */
  finished(): Promise<void> {
    return this.state ? this.state.promise : Promise.resolve();
  }

  private async run() {
    // Safety: This function is only called from enqueue, and enqueue guarantees
    // that this.state is defined.
    assert(this.state);
    let nextFunction: AsyncFunction | undefined;
    while ((nextFunction = this.queue.dequeue()) !== undefined) {
      await nextFunction();
    }
    this.state.resolve();
    this.state = undefined;
    return;
  }
}

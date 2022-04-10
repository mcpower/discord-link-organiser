export class Queue<T> {
  private toPush: T[] = [];
  private currentQueue: T[] = [];

  push(v: T) {
    this.toPush.push(v);
  }

  first(): T | undefined {
    return this.currentQueue[this.currentQueue.length - 1] ?? this.toPush[0];
  }

  pop(): T | undefined {
    const popped = this.currentQueue.pop();
    if (popped !== undefined) {
      return popped;
    } else {
      this.toPush.reverse();
      [this.toPush, this.currentQueue] = [this.currentQueue, this.toPush];
      return this.currentQueue.pop();
    }
  }

  get length(): number {
    return this.toPush.length + this.currentQueue.length;
  }
}

// The LCU's local plugin-resource server isn't built for high concurrency —
// it's meant to serve the client's own UI, not ~170 champion icons fired at
// once. Without this, a full champion-picker render trips ECONNREFUSED on
// the excess connections. Caps how many asset fetches run at a time and
// queues the rest.
export function createLimiter(maxConcurrent: number) {
  let active = 0
  const queue: (() => void)[] = []

  function next(): void {
    if (active >= maxConcurrent) return
    const run = queue.shift()
    if (!run) return
    active += 1
    run()
  }

  return function limit<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active -= 1
            next()
          })
      })
      next()
    })
  }
}

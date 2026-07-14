export interface Debounced<Args extends unknown[]> {
  (...args: Args): void
  cancel: () => void
}

export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, ms: number): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const wrapped = (...args: Args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
  wrapped.cancel = () => clearTimeout(timer)
  return wrapped
}

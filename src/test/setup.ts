import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// pin the UI language before any app module initializes its locale from navigator
// (jsdom reports en-US, which would otherwise flip the default away from zh-TW)
try {
  localStorage.setItem('sb:locale', 'zh-TW')
} catch {
  // ignore — storage always present in jsdom
}

afterEach(() => {
  cleanup()
})

// jsdom lacks object URLs; thumbnails and sprites create them from blobs
let objectUrlCounter = 0
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(
    () => `blob:mock-${objectUrlCounter++}`,
  ) as typeof URL.createObjectURL
  URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL
}

// jsdom lacks ResizeObserver (StagePage watches the canvas host with it)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver
}

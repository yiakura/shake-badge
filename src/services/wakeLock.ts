export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

/** returns null when unsupported or refused — callers degrade gracefully */
export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if (!isWakeLockSupported()) return null
  try {
    return await navigator.wakeLock.request('screen')
  } catch {
    // low battery, tab hidden, or user setting — treat as unavailable
    return null
  }
}

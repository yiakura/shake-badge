import { useEffect, useState } from 'react'
import { isWakeLockSupported, requestWakeLock } from '../services/wakeLock'

/** keeps the screen awake while `enabled`; reacquires when returning to the foreground */
export function useWakeLock(enabled: boolean): { supported: boolean; active: boolean } {
  const [active, setActive] = useState(false)
  const supported = isWakeLockSupported()

  useEffect(() => {
    if (!enabled || !supported) {
      setActive(false)
      return
    }
    let sentinel: WakeLockSentinel | null = null
    let disposed = false

    const acquire = async () => {
      const lock = await requestWakeLock()
      if (!lock) {
        if (!disposed) setActive(false)
        return
      }
      if (disposed) {
        void lock.release()
        return
      }
      sentinel = lock
      setActive(true)
      lock.addEventListener('release', () => {
        if (!disposed) setActive(false)
      })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release()
      setActive(false)
    }
  }, [enabled, supported])

  return { supported, active }
}

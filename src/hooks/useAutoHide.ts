import { useCallback, useEffect, useRef, useState } from 'react'

/** visibility that fades out after `timeoutMs` of inactivity; poke() shows it again */
export function useAutoHide(timeoutMs = 4000): { visible: boolean; poke: () => void } {
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const poke = useCallback(() => {
    setVisible(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), timeoutMs)
  }, [timeoutMs])

  useEffect(() => {
    poke()
    return () => clearTimeout(timerRef.current)
  }, [poke])

  return { visible, poke }
}

import { useEffect, useState } from 'react'
import {
  enterFullscreen,
  exitFullscreen,
  getFullscreenElement,
  isFullscreenSupported,
} from '../services/fullscreen'

export function useFullscreen(): { supported: boolean; active: boolean; toggle: () => void } {
  const supported = isFullscreenSupported()
  const [active, setActive] = useState(() => getFullscreenElement() !== null)

  useEffect(() => {
    if (!supported) return
    const onChange = () => setActive(getFullscreenElement() !== null)
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [supported])

  function toggle(): void {
    if (!supported) return
    if (getFullscreenElement()) void exitFullscreen()
    else void enterFullscreen()
  }

  return { supported, active, toggle }
}

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const promptListeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    for (const listener of promptListeners) listener()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    for (const listener of promptListeners) listener()
  })
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

/** iOS Safari never fires beforeinstallprompt — detect capability, not vendor, where possible */
function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return iosDevice && !isStandalone()
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(deferredPrompt !== null)

  useEffect(() => {
    const update = () => setCanInstall(deferredPrompt !== null)
    promptListeners.add(update)
    update()
    return () => {
      promptListeners.delete(update)
    }
  }, [])

  async function promptInstall(): Promise<void> {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    setCanInstall(false)
  }

  return { canInstall, promptInstall, isIosSafariBrowser: isIosSafari() }
}

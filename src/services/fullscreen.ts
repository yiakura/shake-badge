interface WebkitDocument extends Document {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => void
  webkitFullscreenEnabled?: boolean
}

interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?: () => void
}

/** iPhone Safari has no element fullscreen at all — the button hides itself there */
export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false
  const doc = document as WebkitDocument
  return (
    document.fullscreenEnabled === true ||
    doc.webkitFullscreenEnabled === true ||
    typeof (document.documentElement as WebkitElement).webkitRequestFullscreen === 'function'
  )
}

export function getFullscreenElement(): Element | null {
  const doc = document as WebkitDocument
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

export async function enterFullscreen(element: HTMLElement = document.documentElement): Promise<void> {
  const target = element as WebkitElement
  try {
    if (typeof target.requestFullscreen === 'function') await target.requestFullscreen()
    else target.webkitRequestFullscreen?.()
  } catch {
    // request denied (not a user gesture / platform restriction) — no-op
  }
}

export async function exitFullscreen(): Promise<void> {
  const doc = document as WebkitDocument
  try {
    if (typeof document.exitFullscreen === 'function' && document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      doc.webkitExitFullscreen?.()
    }
  } catch {
    // already exited — no-op
  }
}

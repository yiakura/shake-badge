import { useSyncExternalStore } from 'react'

export type Route = 'home' | 'edit' | 'stage'

function parseHash(): Route {
  const hash = window.location.hash
  if (hash.startsWith('#/edit')) return 'edit'
  if (hash.startsWith('#/stage')) return 'stage'
  return 'home'
}

export function navigate(route: Route): void {
  window.location.hash = route === 'home' ? '/' : `/${route}`
}

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

/** minimal hash router — keeps the phone back button working without a dependency */
export function useHashRoute(): Route {
  return useSyncExternalStore(subscribeToHash, parseHash, () => 'home' as Route)
}

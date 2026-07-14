import { useSyncExternalStore } from 'react'
import { zhTW, type TranslationDict } from './zh-TW'
import { en } from './en'
import { ja } from './ja'
import { ko } from './ko'

export type I18nKey = keyof TranslationDict
export type Locale = 'zh-TW' | 'en' | 'ja' | 'ko'

type Dict = Record<I18nKey, string>

const dictionaries: Record<Locale, Dict> = { 'zh-TW': zhTW, en, ja, ko }

/** display order + labels for the language switcher, and the matching <html lang> */
export const SUPPORTED_LOCALES: { code: Locale; label: string; htmlLang: string }[] = [
  { code: 'zh-TW', label: '中文', htmlLang: 'zh-Hant' },
  { code: 'en', label: 'English', htmlLang: 'en' },
  { code: 'ja', label: '日本語', htmlLang: 'ja' },
  { code: 'ko', label: '한국어', htmlLang: 'ko' },
]

const STORAGE_KEY = 'sb:locale'

function isLocale(value: string | null): value is Locale {
  return value !== null && value in dictionaries
}

/** saved preference → browser languages → zh-TW (feature-based, not a single UA string) */
function detectInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    // storage blocked — fall through to browser detection
  }
  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const lang of langs) {
      const lower = lang.toLowerCase()
      if (lower.startsWith('zh')) return 'zh-TW'
      if (lower.startsWith('ja')) return 'ja'
      if (lower.startsWith('ko')) return 'ko'
      if (lower.startsWith('en')) return 'en'
    }
  }
  return 'zh-TW'
}

let activeLocale: Locale = detectInitialLocale()
const listeners = new Set<() => void>()

function applyHtmlLang(locale: Locale): void {
  if (typeof document === 'undefined') return
  const meta = SUPPORTED_LOCALES.find((entry) => entry.code === locale)
  if (meta) document.documentElement.lang = meta.htmlLang
}
applyHtmlLang(activeLocale)

export function getLocale(): Locale {
  return activeLocale
}

export function setLocale(locale: Locale): void {
  if (locale === activeLocale || !(locale in dictionaries)) return
  activeLocale = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // storage blocked — language still applies for this session
  }
  applyHtmlLang(locale)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** subscribe a component to locale changes so it re-renders on switch */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, getLocale)
}

export function t(key: I18nKey, vars?: Record<string, string | number>): string {
  let text = dictionaries[activeLocale][key] ?? zhTW[key] ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

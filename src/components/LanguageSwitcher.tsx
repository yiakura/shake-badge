import { Globe } from 'lucide-react'
import { SUPPORTED_LOCALES, setLocale, useLocale, type Locale } from '../i18n'

/** compact language picker — a styled native <select> for a proper mobile picker */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const locale = useLocale()
  return (
    <label
      className={`relative inline-flex items-center gap-1.5 min-h-11 px-3 rounded-full
        border-2 border-ink/15 dark:border-frost/20 text-ink-soft dark:text-frost-soft
        font-bold text-sm bg-paper/70 dark:bg-night-card/70 backdrop-blur ${className}`}
    >
      <Globe className="size-4 shrink-0" aria-hidden="true" />
      <span aria-hidden="true">{SUPPORTED_LOCALES.find((l) => l.code === locale)?.label}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label="Language / 語言"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {SUPPORTED_LOCALES.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  )
}

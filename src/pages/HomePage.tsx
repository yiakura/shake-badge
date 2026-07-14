import { Pencil, Play, ShieldCheck } from 'lucide-react'
import { t } from '../i18n'
import { navigate } from '../hooks/useHashRoute'
import { useBadgeStore } from '../stores/badgeStore'
import { BadgeCard } from '../components/BadgeCard'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { usePwaInstall } from '../hooks/usePwaInstall'

export function HomePage() {
  const { settings, images, hasSavedBadge, backgroundImage } = useBadgeStore()
  const { canInstall, promptInstall, isIosSafariBrowser } = usePwaInstall()

  return (
    <div className="h-full overflow-y-auto bg-dots">
      <main className="max-w-md mx-auto min-h-full flex flex-col items-center px-6 pt-safe pb-safe">
        <div className="w-full flex justify-end pt-2">
          <LanguageSwitcher />
        </div>
        {/* lanyard + swinging badge hero */}
        <div className="flex flex-col items-center" aria-hidden="true">
          <svg width="150" height="88" viewBox="0 0 150 88" className="text-accent -mb-4">
            <path
              d="M20 0 L72 74 M130 0 L78 74"
              stroke="currentColor"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <circle cx="75" cy="76" r="10" fill="currentColor" />
          </svg>
          <div className="animate-swing origin-top w-64">
            <BadgeCard
              settings={settings}
              images={images}
              backgroundBlob={backgroundImage}
              placeholderName={t('badge.namePlaceholder')}
            />
          </div>
        </div>

        <h1 className="mt-8 font-display font-extrabold text-5xl leading-none animate-rise">
          {t('app.name')}
        </h1>
        <p
          className="mt-1 text-lg font-bold text-accent tracking-[0.35em] animate-rise"
          style={{ animationDelay: '80ms' }}
        >
          {t('app.tagline')}
        </p>
        <p
          className="mt-5 text-center text-ink-soft dark:text-frost-soft leading-relaxed animate-rise"
          style={{ animationDelay: '140ms' }}
        >
          {t('home.description')}
        </p>

        <div
          className="mt-8 w-full flex flex-col gap-3 animate-rise"
          style={{ animationDelay: '200ms' }}
        >
          {hasSavedBadge && (
            <button
              type="button"
              className="btn btn-primary text-lg py-3.5"
              onClick={() => navigate(images.length > 0 ? 'stage' : 'edit')}
            >
              <Play className="size-5" aria-hidden="true" />
              {t('home.continue')}
            </button>
          )}
          <button
            type="button"
            className={`btn ${hasSavedBadge ? 'btn-secondary' : 'btn-primary'} text-lg py-3.5`}
            onClick={() => navigate('edit')}
          >
            <Pencil className="size-5" aria-hidden="true" />
            {t('home.create')}
          </button>
          {canInstall && (
            <button type="button" className="btn btn-ghost" onClick={() => void promptInstall()}>
              {t('home.install')}
            </button>
          )}
        </div>

        <div
          className="mt-auto pt-10 pb-6 flex flex-col items-center gap-3 animate-rise"
          style={{ animationDelay: '260ms' }}
        >
          {isIosSafariBrowser && (
            <p className="text-xs text-center text-ink-soft dark:text-frost-soft">
              {t('home.installHintIos')}
            </p>
          )}
          <p className="flex items-start gap-2 text-xs text-center text-ink-soft dark:text-frost-soft max-w-xs">
            <ShieldCheck className="size-4 shrink-0 text-accent" aria-hidden="true" />
            {t('home.privacy')}
          </p>
        </div>
      </main>
    </div>
  )
}

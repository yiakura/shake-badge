import { useEffect } from 'react'
import { useHashRoute } from '../hooks/useHashRoute'
import { initBadgeStore, useBadgeStore } from '../stores/badgeStore'
import { Toast } from '../components/Toast'
import { HomePage } from '../pages/HomePage'
import { EditorPage } from '../pages/EditorPage'
import { StagePage } from '../pages/StagePage'
import { t, useLocale } from '../i18n'

function Splash() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <span className="font-display font-extrabold text-3xl text-accent animate-pop">
        {t('app.name')}
      </span>
      <span className="text-sm text-ink-soft dark:text-frost-soft">{t('common.loading')}</span>
    </div>
  )
}

export default function App() {
  const route = useHashRoute()
  const { phase } = useBadgeStore()
  useLocale() // re-render the whole tree when the language changes

  useEffect(() => {
    void initBadgeStore()
  }, [])

  return (
    <>
      {phase !== 'ready' ? (
        <Splash />
      ) : route === 'edit' ? (
        <EditorPage />
      ) : route === 'stage' ? (
        <StagePage />
      ) : (
        <HomePage />
      )}
      <Toast />
    </>
  )
}

import { useState } from 'react'
import { ArrowLeft, Eraser, Play, Save } from 'lucide-react'
import { navigate } from '../hooks/useHashRoute'
import {
  clearAll,
  persistSettings,
  updateSettings,
  useBadgeStore,
} from '../stores/badgeStore'
import { showToast } from '../stores/toastStore'
import { nameLength, validateName } from '../utils/validation'
import { LIMITS } from '../config/limits'
import { BadgeCard } from '../components/BadgeCard'
import { ImageManager } from '../components/ImageManager'
import { StyleControls, ThemePicker } from '../components/StyleControls'
import { PhysicsControls } from '../components/PhysicsControls'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { t } from '../i18n'

export function EditorPage() {
  const { settings, images, backgroundImage } = useBadgeStore()
  const [confirmClear, setConfirmClear] = useState(false)
  const [saveAttempted, setSaveAttempted] = useState(false)

  const nameCheck = validateName(settings.name)
  const count = nameLength(settings.name.trim())
  const line2Count = nameLength(settings.nameLine2.trim())
  const line2TooLong = line2Count > LIMITS.maxNameLength
  const showNameError = !nameCheck.ok && (settings.name.length > 0 || saveAttempted)
  const nameErrorText = !nameCheck.ok
    ? nameCheck.reason === 'too-long'
      ? t('editor.nameTooLong', { max: LIMITS.maxNameLength })
      : t('editor.nameRequired')
    : ''
  const canStart = images.length >= 1

  /** trims the names and persists everything; returns false when a name is invalid */
  async function saveAll(): Promise<boolean> {
    setSaveAttempted(true)
    const check = validateName(settings.name)
    if (!check.ok) {
      showToast(nameErrorText || t('editor.nameRequired'))
      return false
    }
    if (line2TooLong) {
      showToast(t('editor.nameTooLong', { max: LIMITS.maxNameLength }))
      return false
    }
    const line2 = settings.nameLine2.trim()
    if (check.value !== settings.name || line2 !== settings.nameLine2) {
      updateSettings({ name: check.value, nameLine2: line2 })
    }
    const ok = await persistSettings()
    if (!ok) showToast(t('error.saveFailed'))
    return ok
  }

  async function onSave(): Promise<void> {
    if (await saveAll()) showToast(t('editor.savedToast'))
  }

  async function onStart(): Promise<void> {
    if (!canStart) return
    if (await saveAll()) navigate('stage')
  }

  async function onClearConfirmed(): Promise<void> {
    setConfirmClear(false)
    await clearAll()
    navigate('home')
  }

  return (
    <div className="h-full overflow-y-auto bg-dots">
      <div className="max-w-md mx-auto px-4 pt-safe">
        <header className="flex items-center gap-1 py-3">
          <button
            type="button"
            className="btn btn-icon btn-ghost -ml-2"
            onClick={() => navigate('home')}
            aria-label={t('editor.back')}
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </button>
          <h1 className="font-display font-extrabold text-2xl">{t('editor.title')}</h1>
          <LanguageSwitcher className="ml-auto" />
        </header>

        {/* live preview */}
        <section aria-label={t('editor.preview')} className="px-6 animate-pop">
          <BadgeCard
            settings={settings}
            images={images}
            backgroundBlob={backgroundImage}
            placeholderName={t('badge.namePlaceholder')}
          />
        </section>

        <section className="card p-5 mt-5">
          <label htmlFor="badge-name" className="field-label">
            {t('editor.nameLabel')}
          </label>
          <input
            id="badge-name"
            type="text"
            value={settings.name}
            placeholder={t('editor.namePlaceholder')}
            maxLength={60}
            autoComplete="nickname"
            onChange={(event) => updateSettings({ name: event.target.value })}
            aria-invalid={showNameError}
            aria-describedby="badge-name-meta"
            className="w-full min-h-12 px-4 rounded-xl border-2 border-ink/15 dark:border-frost/20
              bg-transparent focus:border-accent outline-none transition-colors"
          />
          <div id="badge-name-meta" className="mt-2 flex justify-between text-xs font-bold">
            <span className="text-accent-deep dark:text-accent" role="alert">
              {showNameError ? nameErrorText : ''}
            </span>
            <span className={count > LIMITS.maxNameLength ? 'text-accent' : 'text-ink-soft dark:text-frost-soft'}>
              {t('editor.nameCount', { current: count, max: LIMITS.maxNameLength })}
            </span>
          </div>

          <label htmlFor="badge-name-2" className="field-label mt-4">
            {t('editor.nameLine2Label')}
          </label>
          <input
            id="badge-name-2"
            type="text"
            value={settings.nameLine2}
            placeholder={t('editor.nameLine2Placeholder')}
            maxLength={60}
            onChange={(event) => updateSettings({ nameLine2: event.target.value })}
            aria-invalid={line2TooLong}
            className="w-full min-h-12 px-4 rounded-xl border-2 border-ink/15 dark:border-frost/20
              bg-transparent focus:border-accent outline-none transition-colors"
          />
          <div className="mt-2 flex justify-end text-xs font-bold">
            <span className={line2TooLong ? 'text-accent' : 'text-ink-soft dark:text-frost-soft'}>
              {t('editor.nameCount', { current: line2Count, max: LIMITS.maxNameLength })}
            </span>
          </div>

          <span className="field-label mt-4">{t('editor.nameDirection')}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className={`chip ${settings.nameDirection === 'horizontal' ? 'chip-on' : ''}`}
              aria-pressed={settings.nameDirection === 'horizontal'}
              onClick={() => updateSettings({ nameDirection: 'horizontal' })}
            >
              {t('direction.horizontal')}
            </button>
            <button
              type="button"
              className={`chip ${settings.nameDirection === 'vertical' ? 'chip-on' : ''}`}
              aria-pressed={settings.nameDirection === 'vertical'}
              onClick={() => updateSettings({ nameDirection: 'vertical' })}
            >
              {t('direction.vertical')}
            </button>
          </div>
        </section>

        <section className="card p-5 mt-4">
          <ImageManager />
        </section>

        <section className="card p-5 mt-4">
          <h2 className="font-extrabold mb-3">{t('editor.themeTitle')}</h2>
          <ThemePicker />
          <hr className="my-5 border-ink/10 dark:border-frost/10" />
          <h2 className="font-extrabold mb-4">{t('editor.styleTitle')}</h2>
          <StyleControls />
        </section>

        <section className="card p-5 mt-4">
          <h2 className="font-extrabold mb-4">{t('physics.title')}</h2>
          <PhysicsControls />
        </section>

        {/* danger zone — kept above the sticky bar so it is never overlapped */}
        <div className="flex justify-center pt-6 pb-2">
          <button type="button" className="btn btn-danger" onClick={() => setConfirmClear(true)}>
            <Eraser className="size-5" aria-hidden="true" />
            {t('editor.clearAll')}
          </button>
        </div>

        {/* sticky action bar — last child so it reserves its own space and covers nothing */}
        <div
          className="sticky bottom-0 -mx-4 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]
            bg-cream/90 dark:bg-night/90 backdrop-blur border-t border-ink/10 dark:border-frost/10"
        >
          <div className="flex gap-3 max-w-md mx-auto">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => void onSave()}>
              <Save className="size-5" aria-hidden="true" />
              {t('editor.saveBtn')}
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1"
              disabled={!canStart}
              onClick={() => void onStart()}
              title={canStart ? undefined : t('editor.needImage')}
            >
              <Play className="size-5" aria-hidden="true" />
              {t('editor.startBtn')}
            </button>
          </div>
          {!canStart && (
            <p className="text-center text-xs font-bold text-ink-soft dark:text-frost-soft mt-2">
              {t('editor.needImage')}
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title={t('editor.clearConfirmTitle')}
        body={t('editor.clearConfirmBody')}
        confirmLabel={t('editor.clearConfirmYes')}
        onConfirm={() => void onClearConfirmed()}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}

import { useId, useRef, useState, type ReactNode } from 'react'
import { ImagePlus, Loader2, Type, X } from 'lucide-react'
import { THEMES, backgroundCss } from '../config/themes'
import { ACCEPT_ATTRIBUTE, ACCEPT_FONT_ATTRIBUTE, RANGES } from '../config/limits'
import {
  applyTheme,
  clearCustomFont,
  persistSettings,
  setBackgroundImage,
  setCustomFont,
  updateSettings,
  updateStyle,
  useBadgeStore,
} from '../stores/badgeStore'
import { showToast } from '../stores/toastStore'
import { validateFontFile, validateImageFile } from '../utils/validation'
import { compressImage } from '../services/imageProcessing'
import { NAME_FONT_FAMILY } from '../services/fontService'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { Slider } from './Slider'
import { t } from '../i18n'

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`chip ${on ? 'chip-on' : ''}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  )
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between">
      <span className="field-label mb-0" id={id}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={id}
        onClick={onChange}
        className={`relative shrink-0 w-14 h-8 rounded-full transition-colors
          ${on ? 'bg-accent' : 'bg-ink/20 dark:bg-frost/20'}`}
      >
        <span
          className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform
            ${on ? 'translate-x-6' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-3">
      <span className="relative size-11 rounded-xl border-2 border-ink/15 dark:border-frost/20 overflow-hidden shrink-0">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="absolute -inset-2 size-[150%] cursor-pointer border-0 p-0"
        />
      </span>
      <span className="text-sm font-bold text-ink-soft dark:text-frost-soft">{label}</span>
    </label>
  )
}

export function ThemePicker() {
  const { settings } = useBadgeStore()
  return (
    <div className="grid grid-cols-4 gap-2">
      {THEMES.map((theme) => {
        const selected = settings.themeId === theme.id
        return (
          <button
            key={theme.id}
            type="button"
            aria-pressed={selected}
            onClick={() => applyTheme(theme.id)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-1.5 pb-2 border-2 transition-colors
              ${selected ? 'border-accent bg-accent/10' : 'border-transparent'}`}
          >
            <span
              className="w-full h-12 rounded-xl border border-black/10 flex items-center justify-center font-display font-bold"
              style={{ background: backgroundCss(theme.style.background), color: theme.style.textColor }}
              aria-hidden="true"
            >
              Aa
            </span>
            <span className="text-[0.7rem] font-bold text-ink-soft dark:text-frost-soft leading-tight">
              {t(theme.labelKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function StyleControls() {
  const { settings, backgroundImage } = useBadgeStore()
  const { style } = settings
  const { background } = style
  const bgInputRef = useRef<HTMLInputElement>(null)
  const [bgBusy, setBgBusy] = useState(false)
  const fontInputRef = useRef<HTMLInputElement>(null)
  const [fontBusy, setFontBusy] = useState(false)

  async function handleFontFile(files: FileList | null): Promise<void> {
    const file = files?.[0]
    if (!file) return
    const check = validateFontFile(file)
    if (!check.ok) {
      showToast(check.reason === 'size' ? t('editor.fontTooLarge') : t('editor.fontWrongType'))
      return
    }
    setFontBusy(true)
    try {
      const ok = await setCustomFont(file, file.name)
      if (!ok) showToast(t('editor.fontLoadError'))
    } catch {
      showToast(t('editor.fontLoadError'))
    } finally {
      setFontBusy(false)
    }
  }

  function selectBackgroundType(type: 'solid' | 'gradient'): void {
    // the uploaded blob stays in storage so the user can flip back without re-uploading
    updateStyle({
      background:
        type === 'gradient'
          ? { type, from: background.from, to: background.to ?? background.from, angle: background.angle ?? 180 }
          : { type, from: background.from },
    })
  }

  function selectImageBackground(): void {
    if (backgroundImage) {
      updateStyle({ background: { ...background, type: 'image' } })
    } else {
      bgInputRef.current?.click()
    }
  }

  async function handleBackgroundFile(files: FileList | null): Promise<void> {
    const file = files?.[0]
    if (!file) return
    const check = validateImageFile(file)
    if (!check.ok) {
      showToast(
        check.reason === 'size'
          ? t('editor.imageTooLarge', { name: file.name })
          : t('editor.imageWrongType', { name: file.name }),
      )
      return
    }
    setBgBusy(true)
    try {
      const { blob } = await compressImage(file)
      const ok = await setBackgroundImage(blob)
      if (!ok) showToast(t('error.saveFailed'))
      else void persistSettings()
    } catch {
      showToast(t('editor.imageReadError', { name: file.name }))
    } finally {
      setBgBusy(false)
    }
  }

  async function removeBackground(): Promise<void> {
    await setBackgroundImage(null)
    void persistSettings()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="field-label">{t('editor.background')}</span>
        <div className="flex flex-wrap gap-2 mb-3">
          <Chip on={background.type === 'solid'} onClick={() => selectBackgroundType('solid')}>
            {t('editor.solid')}
          </Chip>
          <Chip on={background.type === 'gradient'} onClick={() => selectBackgroundType('gradient')}>
            {t('editor.gradient')}
          </Chip>
          <Chip on={background.type === 'image'} onClick={selectImageBackground}>
            {t('editor.bgImage')}
          </Chip>
        </div>

        {background.type === 'image' ? (
          <div className="flex items-center gap-3">
            {backgroundImage && (
              <BgThumb blob={backgroundImage} />
            )}
            <button
              type="button"
              className="btn btn-secondary text-sm"
              disabled={bgBusy}
              onClick={() => bgInputRef.current?.click()}
            >
              {bgBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="size-4" aria-hidden="true" />
              )}
              {bgBusy ? t('editor.bgProcessing') : backgroundImage ? t('editor.bgReplace') : t('editor.bgUpload')}
            </button>
            {backgroundImage && (
              <button type="button" className="btn btn-ghost text-sm" onClick={() => void removeBackground()}>
                <X className="size-4" aria-hidden="true" />
                {t('editor.bgRemove')}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {background.type === 'solid' ? (
              <ColorField
                label={t('editor.background')}
                value={background.from}
                onChange={(from) => updateStyle({ background: { ...background, from } })}
              />
            ) : (
              <>
                <ColorField
                  label={t('editor.gradientFrom')}
                  value={background.from}
                  onChange={(from) => updateStyle({ background: { ...background, from } })}
                />
                <ColorField
                  label={t('editor.gradientTo')}
                  value={background.to ?? background.from}
                  onChange={(to) => updateStyle({ background: { ...background, to } })}
                />
              </>
            )}
          </div>
        )}
        <input
          ref={bgInputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          hidden
          onChange={(event) => {
            void handleBackgroundFile(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      <ColorField
        label={t('editor.textColor')}
        value={style.textColor}
        onChange={(textColor) => updateStyle({ textColor })}
      />

      <Slider
        label={t('editor.fontSize')}
        min={RANGES.fontSizePx.min}
        max={RANGES.fontSizePx.max}
        step={RANGES.fontSizePx.step}
        value={style.fontSizePx}
        onChange={(fontSizePx) => {
          updateStyle({ fontSizePx })
          updateSettings({ nameScale: 1 }) // editor slider is authoritative; drop any stage pinch scale
        }}
        format={(v) => `${v} px`}
      />

      <div>
        <span className="field-label">{t('editor.nameFont')}</span>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="text-lg font-bold px-3 py-1 rounded-lg bg-ink/5 dark:bg-frost/10 min-w-16 text-center"
            style={{ fontFamily: settings.customFontName ? `'${NAME_FONT_FAMILY}', var(--font-display)` : 'var(--font-display)' }}
          >
            Aa 名
          </span>
          <button
            type="button"
            className="btn btn-secondary text-sm"
            disabled={fontBusy}
            onClick={() => fontInputRef.current?.click()}
          >
            {fontBusy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Type className="size-4" aria-hidden="true" />
            )}
            {fontBusy
              ? t('editor.fontProcessing')
              : settings.customFontName
                ? t('editor.fontReplace')
                : t('editor.fontUpload')}
          </button>
          {settings.customFontName && (
            <button type="button" className="btn btn-ghost text-sm" onClick={() => void clearCustomFont()}>
              <X className="size-4" aria-hidden="true" />
              {t('editor.fontRemove')}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-soft dark:text-frost-soft break-all">
          {settings.customFontName ? settings.customFontName : t('editor.fontHint')}
        </p>
        <input
          ref={fontInputRef}
          type="file"
          accept={ACCEPT_FONT_ATTRIBUTE}
          hidden
          onChange={(event) => {
            void handleFontFile(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      <Slider
        label={t('editor.imageSize')}
        min={RANGES.imageBasePercent.min}
        max={RANGES.imageBasePercent.max}
        step={RANGES.imageBasePercent.step}
        value={settings.imageBasePercent}
        onChange={(imageBasePercent) => updateSettings({ imageBasePercent })}
        format={(v) => `${v}%`}
      />

      <div>
        <span className="field-label">{t('editor.imageShape')}</span>
        <div className="flex flex-wrap gap-2">
          <Chip on={settings.imageShape === 'circle'} onClick={() => updateSettings({ imageShape: 'circle' })}>
            {t('editor.shapeCircle')}
          </Chip>
          <Chip on={settings.imageShape === 'rounded'} onClick={() => updateSettings({ imageShape: 'rounded' })}>
            {t('editor.shapeRounded')}
          </Chip>
          <Chip on={settings.imageShape === 'sticker'} onClick={() => updateSettings({ imageShape: 'sticker' })}>
            {t('editor.shapeSticker')}
          </Chip>
        </div>
        {settings.imageShape === 'sticker' && (
          <p className="mt-2 text-xs text-ink-soft dark:text-frost-soft">{t('editor.shapeStickerHint')}</p>
        )}
      </div>

      <div>
        <span className="field-label">{t('editor.outline')}</span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex gap-2">
            <Chip on={settings.imageOutline === 'none'} onClick={() => updateSettings({ imageOutline: 'none' })}>
              {t('outline.none')}
            </Chip>
            <Chip on={settings.imageOutline === 'color'} onClick={() => updateSettings({ imageOutline: 'color' })}>
              {t('outline.color')}
            </Chip>
          </div>
          {settings.imageOutline === 'color' && (
            <ColorField
              label={t('editor.outlineColor')}
              value={settings.imageOutlineColor}
              onChange={(imageOutlineColor) => updateSettings({ imageOutlineColor })}
            />
          )}
        </div>
      </div>

      <ToggleRow
        label={t('editor.showName')}
        on={settings.showName}
        onChange={() => updateSettings({ showName: !settings.showName })}
      />

      {settings.showName && (
        <>
          <ToggleRow
            label={t('editor.nameShadow')}
            on={settings.nameShadow}
            onChange={() => updateSettings({ nameShadow: !settings.nameShadow })}
          />
          <div>
            <span className="field-label">{t('editor.namePosition')}</span>
            <div className="flex gap-2">
              <Chip
                on={settings.namePosition === 'top'}
                onClick={() => updateSettings({ namePosition: 'top', nameOffset: null })}
              >
                {t('position.top')}
              </Chip>
              <Chip
                on={settings.namePosition === 'bottom'}
                onClick={() => updateSettings({ namePosition: 'bottom', nameOffset: null })}
              >
                {t('position.bottom')}
              </Chip>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function BgThumb({ blob }: { blob: Blob }) {
  const url = useObjectUrl(blob)
  if (!url) return null
  return (
    <img
      src={url}
      alt=""
      className="size-11 rounded-xl object-cover border-2 border-ink/15 dark:border-frost/20"
    />
  )
}

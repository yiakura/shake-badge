import { useSyncExternalStore } from 'react'
import type {
  BadgeSettings,
  BadgeStyle,
  ImageRecord,
  LegacySettingsV1,
  NameLineLayout,
  StoredSettings,
} from '../types/badge'
import { SETTINGS_SCHEMA_VERSION } from '../types/badge'
import { DEFAULT_THEME, getTheme } from '../config/themes'
import { RANGES } from '../config/limits'
import { defaultPhysicsTuning } from '../config/physics'
import { registerNameFont, unregisterNameFont } from '../services/fontService'
import * as db from '../services/db'

export interface BadgeState {
  phase: 'idle' | 'loading' | 'ready'
  settings: BadgeSettings
  /** image records in display order */
  images: ImageRecord[]
  /** custom stage background (db 'assets' store), null = none */
  backgroundImage: Blob | null
  /** custom name font is loaded and ready to render */
  customFontReady: boolean
  /** a badge was previously saved on this device */
  hasSavedBadge: boolean
  /** unsaved name/style edits */
  dirty: boolean
}

export function defaultSettings(): BadgeSettings {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    name: '',
    nameLine2: '',
    nameDirection: 'horizontal',
    showName: true,
    nameShadow: false,
    namePosition: 'bottom',
    nameLayout: [
      { offset: null, scale: 1 },
      { offset: null, scale: 1 },
    ],
    themeId: DEFAULT_THEME.id,
    style: structuredClone(DEFAULT_THEME.style),
    imageShape: 'circle',
    imageBasePercent: RANGES.imageBasePercent.default,
    imageOutline: 'none',
    imageOutlineColor: '#ffffff',
    physics: defaultPhysicsTuning(),
    customFontName: '',
    imageIds: [],
    setupCompleted: false,
    updatedAt: 0,
  }
}

function initialState(): BadgeState {
  return {
    phase: 'idle',
    settings: defaultSettings(),
    images: [],
    backgroundImage: null,
    customFontReady: false,
    hasSavedBadge: false,
    dirty: false,
  }
}

let state: BadgeState = initialState()
const listeners = new Set<() => void>()

function emit(patch: Partial<BadgeState>): void {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getState(): BadgeState {
  return state
}

export function useBadgeStore(): BadgeState {
  return useSyncExternalStore(subscribe, getState, getState)
}

const V1_FONT_PX = { sm: 30, md: 48, lg: 60 } as const
const V1_SIZE_PERCENT = { sm: 16, md: 22, lg: 29 } as const

function isLegacyV1(saved: StoredSettings): saved is LegacySettingsV1 {
  return saved.schemaVersion === 1
}

/** always return exactly two valid line layouts, migrating the old single offset/scale onto line 0 */
function normalizeNameLayout(saved: StoredSettings): NameLineLayout[] {
  const legacy = saved as Partial<{
    nameLayout: NameLineLayout[]
    nameOffset: { x: number; y: number } | null
    nameScale: number
  }>
  const source = legacy.nameLayout ?? [
    { offset: legacy.nameOffset ?? null, scale: legacy.nameScale ?? 1 },
    { offset: null, scale: 1 },
  ]
  return [0, 1].map((i) => ({
    offset: source[i]?.offset ?? null,
    scale: source[i]?.scale ?? 1,
  }))
}

/** upgrade any stored record to the current schema (v1 chips → v2 sliders etc.) */
export function normalizeSettings(saved: StoredSettings): BadgeSettings {
  if (isLegacyV1(saved)) {
    const { fontSize, ...styleRest } = saved.style
    const { imageSize, ...rest } = saved
    return {
      ...defaultSettings(),
      ...rest,
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      style: { ...styleRest, fontSizePx: V1_FONT_PX[fontSize] ?? RANGES.fontSizePx.default },
      imageBasePercent: V1_SIZE_PERCENT[imageSize] ?? RANGES.imageBasePercent.default,
      nameLayout: normalizeNameLayout(saved),
    }
  }
  return {
    ...defaultSettings(),
    ...saved,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    // nested additive fields: merge so records saved before the field existed get defaults
    physics: { ...defaultPhysicsTuning(), ...saved.physics },
    nameLayout: normalizeNameLayout(saved),
  }
}

/** fill in fields added after a record was written (older records lack them at runtime) */
export function normalizeImageRecord(record: ImageRecord): ImageRecord {
  return {
    ...record,
    sizeScale: record.sizeScale ?? RANGES.imageScale.default,
    shapeMode: record.shapeMode ?? 'global',
    hasAlpha: record.hasAlpha ?? false,
  }
}

export async function initBadgeStore(): Promise<void> {
  if (state.phase !== 'idle') return
  emit({ phase: 'loading' })
  try {
    const [saved, imageMap, backgroundImage, fontBlob] = await Promise.all([
      db.loadSettings(),
      db.loadAllImages(),
      db.loadAsset(db.BACKGROUND_ASSET_KEY),
      db.loadAsset(db.FONT_ASSET_KEY),
    ])
    if (!saved) {
      emit({ phase: 'ready' })
      return
    }
    const settings = normalizeSettings(saved)
    const ordered = settings.imageIds
      .map((id) => imageMap.get(id))
      .filter((record): record is ImageRecord => record !== undefined)
    // defensive: keep images that exist in the db but fell out of the order list
    const orphans = [...imageMap.values()].filter((record) => !settings.imageIds.includes(record.id))
    const images = [...ordered, ...orphans].map(normalizeImageRecord)
    settings.imageIds = images.map((record) => record.id)
    emit({
      phase: 'ready',
      settings,
      images,
      backgroundImage: backgroundImage ?? null,
      hasSavedBadge: saved.setupCompleted,
    })
    // register the saved custom font, then flag ready so name text re-renders in it
    if (settings.customFontName && fontBlob) {
      const ok = await registerNameFont(fontBlob)
      if (ok) emit({ customFontReady: true })
    }
  } catch {
    // storage unavailable (e.g. locked-down private mode) → run in-memory
    emit({ phase: 'ready' })
  }
}

export function updateSettings(patch: Partial<BadgeSettings>): void {
  emit({ settings: { ...state.settings, ...patch }, dirty: true })
}

export function updateStyle(patch: Partial<BadgeStyle>): void {
  updateSettings({ style: { ...state.settings.style, ...patch } })
}

export function applyTheme(themeId: string): void {
  const theme = getTheme(themeId)
  if (!theme) return
  updateSettings({ themeId, style: structuredClone(theme.style) })
}

/** persist settings (with current image order) to IndexedDB */
export async function persistSettings(): Promise<boolean> {
  const settings: BadgeSettings = {
    ...state.settings,
    imageIds: state.images.map((record) => record.id),
    setupCompleted: true,
    updatedAt: Date.now(),
  }
  try {
    await db.saveSettings(settings)
    emit({ settings, dirty: false, hasSavedBadge: true })
    return true
  } catch {
    return false
  }
}

/** images are heavy — they persist immediately, not on the save button */
export async function addImage(record: ImageRecord): Promise<boolean> {
  try {
    await db.putImage(record)
  } catch {
    return false
  }
  emit({ images: [...state.images, record] })
  await persistSettings()
  return true
}

export async function updateImage(record: ImageRecord): Promise<boolean> {
  try {
    await db.putImage(record)
  } catch {
    return false
  }
  emit({ images: state.images.map((existing) => (existing.id === record.id ? record : existing)) })
  return true
}

/** in-memory record patch for live slider feedback; commit with updateImage */
export function updateImageLocal(record: ImageRecord): void {
  emit({ images: state.images.map((existing) => (existing.id === record.id ? record : existing)) })
}

export async function removeImage(id: string): Promise<void> {
  try {
    await db.deleteImage(id)
  } catch {
    // removing from the UI still proceeds; the orphan is re-adopted on next load
  }
  emit({ images: state.images.filter((record) => record.id !== id) })
  await persistSettings()
}

/** reorder in memory (live while dragging); call persistSettings() to commit */
export function reorderImages(from: number, to: number): void {
  if (from === to || from < 0 || to < 0 || from >= state.images.length || to >= state.images.length) {
    return
  }
  const images = [...state.images]
  const [moved] = images.splice(from, 1)
  images.splice(to, 0, moved)
  emit({ images })
}

/** store (or clear) the custom stage background and switch the style accordingly */
export async function setBackgroundImage(blob: Blob | null): Promise<boolean> {
  const background = state.settings.style.background
  try {
    if (blob) {
      await db.saveAsset(db.BACKGROUND_ASSET_KEY, blob)
    } else {
      await db.deleteAsset(db.BACKGROUND_ASSET_KEY)
    }
  } catch {
    return false
  }
  emit({ backgroundImage: blob })
  updateStyle({
    background: blob
      ? { type: 'image', from: background.from, to: background.to, angle: background.angle }
      : { ...background, type: background.to ? 'gradient' : 'solid' },
  })
  return true
}

/** upload + register a custom name font (persists immediately, like the background) */
export async function setCustomFont(blob: Blob, name: string): Promise<boolean> {
  const ok = await registerNameFont(blob)
  if (!ok) return false
  try {
    await db.saveAsset(db.FONT_ASSET_KEY, blob)
  } catch {
    return false
  }
  emit({ customFontReady: true })
  updateSettings({ customFontName: name })
  await persistSettings()
  return true
}

export async function clearCustomFont(): Promise<void> {
  unregisterNameFont()
  try {
    await db.deleteAsset(db.FONT_ASSET_KEY)
  } catch {
    // fall through — still clear from settings/UI
  }
  emit({ customFontReady: false })
  updateSettings({ customFontName: '' })
  await persistSettings()
}

export async function clearAll(): Promise<void> {
  unregisterNameFont()
  try {
    await db.clearAllData()
  } catch {
    // fall through — reset the in-memory state regardless
  }
  emit({ ...initialState(), phase: 'ready' })
}

export function __resetStoreForTests(): void {
  state = initialState()
}

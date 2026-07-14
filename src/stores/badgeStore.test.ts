import { describe, expect, it } from 'vitest'
import { defaultSettings, normalizeImageRecord, normalizeSettings } from './badgeStore'
import type { ImageRecord, LegacySettingsV1 } from '../types/badge'

function legacyV1(overrides: Partial<LegacySettingsV1> = {}): LegacySettingsV1 {
  return {
    schemaVersion: 1,
    name: '舊資料',
    showName: true,
    namePosition: 'top',
    themeId: 'pink-cute',
    style: {
      background: { type: 'gradient', from: '#ffe3ee', to: '#ffb6d3', angle: 180 },
      textColor: '#a62960',
      fontSize: 'sm',
    },
    imageShape: 'rounded',
    imageSize: 'lg',
    imageIds: ['a', 'b'],
    setupCompleted: true,
    updatedAt: 42,
    ...overrides,
  }
}

describe('normalizeSettings — v1 → v2 migration', () => {
  it('maps size chips to slider values and fills the new fields', () => {
    const migrated = normalizeSettings(legacyV1())
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.style.fontSizePx).toBe(30) // sm
    expect(migrated.imageBasePercent).toBe(29) // lg
    expect(migrated.nameLine2).toBe('')
    expect(migrated.nameDirection).toBe('horizontal')
    expect(migrated.imageOutline).toBe('none')
    // untouched fields survive
    expect(migrated.name).toBe('舊資料')
    expect(migrated.namePosition).toBe('top')
    expect(migrated.imageShape).toBe('rounded')
    expect(migrated.imageIds).toEqual(['a', 'b'])
    expect(migrated.style.textColor).toBe('#a62960')
  })

  it('drops the legacy chip fields from the migrated record', () => {
    const migrated = normalizeSettings(legacyV1()) as unknown as Record<string, unknown>
    expect(migrated.imageSize).toBeUndefined()
    expect((migrated.style as Record<string, unknown>).fontSize).toBeUndefined()
  })

  it('passes v2 records through unchanged', () => {
    const v2 = { ...defaultSettings(), name: '目前版', nameLine2: '第二行' }
    expect(normalizeSettings(v2)).toEqual(v2)
  })

  it('fills physics tuning defaults on records saved before the field existed', () => {
    const v2 = { ...defaultSettings(), name: '早期v2' } as Record<string, unknown>
    delete v2.physics
    const normalized = normalizeSettings(v2 as unknown as Parameters<typeof normalizeSettings>[0])
    expect(normalized.physics).toEqual({ gravity: 1, bounciness: 0.78, shakeStrength: 1, airDrag: 1 })
  })

  it('keeps saved physics tuning values', () => {
    const v2 = {
      ...defaultSettings(),
      physics: { gravity: 2, bounciness: 0.5, shakeStrength: 1.5, airDrag: 0.4 },
    }
    expect(normalizeSettings(v2).physics).toEqual({
      gravity: 2,
      bounciness: 0.5,
      shakeStrength: 1.5,
      airDrag: 0.4,
    })
  })

  it('always yields two name-line layouts and migrates a legacy single offset/scale onto line 0', () => {
    const legacy = {
      ...defaultSettings(),
      nameLayout: undefined,
      nameOffset: { x: 0.3, y: 0.7 },
      nameScale: 1.8,
    } as unknown as Parameters<typeof normalizeSettings>[0]
    const migrated = normalizeSettings(legacy)
    expect(migrated.nameLayout).toHaveLength(2)
    expect(migrated.nameLayout[0]).toEqual({ offset: { x: 0.3, y: 0.7 }, scale: 1.8 })
    expect(migrated.nameLayout[1]).toEqual({ offset: null, scale: 1 })
  })

  it('keeps an existing two-line nameLayout', () => {
    const layout = [
      { offset: { x: 0.2, y: 0.2 }, scale: 1.5 },
      { offset: { x: 0.8, y: 0.9 }, scale: 0.7 },
    ]
    expect(normalizeSettings({ ...defaultSettings(), nameLayout: layout }).nameLayout).toEqual(layout)
  })

  it('gives v1 records the default physics tuning', () => {
    expect(normalizeSettings(legacyV1()).physics).toEqual({
      gravity: 1,
      bounciness: 0.78,
      shakeStrength: 1,
      airDrag: 1,
    })
  })
})

describe('normalizeImageRecord', () => {
  it('fills defaults for records written before v2', () => {
    const legacy = {
      id: 'x',
      originalBlob: new Blob(['o']),
      croppedBlob: new Blob(['c']),
      crop: { x: 0, y: 0, size: 10 },
      createdAt: 1,
    } as ImageRecord
    const normalized = normalizeImageRecord(legacy)
    expect(normalized.sizeScale).toBe(1)
    expect(normalized.shapeMode).toBe('global')
    expect(normalized.hasAlpha).toBe(false)
  })

  it('keeps explicit values', () => {
    const record: ImageRecord = {
      id: 'x',
      originalBlob: new Blob(['o']),
      croppedBlob: new Blob(['c']),
      crop: { x: 0, y: 0, size: 10 },
      createdAt: 1,
      sizeScale: 1.5,
      shapeMode: 'source',
      hasAlpha: true,
    }
    expect(normalizeImageRecord(record)).toEqual(record)
  })
})

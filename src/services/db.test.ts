// @vitest-environment node
// node env: jsdom Blobs can't survive structured clone, Node's native ones can —
// letting this suite assert full blob content round-trips like a real browser does
import { beforeEach, describe, expect, it } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import {
  __resetDbForTests,
  BACKGROUND_ASSET_KEY,
  clearAllData,
  deleteAsset,
  deleteImage,
  loadAllImages,
  loadAsset,
  loadSettings,
  putImage,
  saveAsset,
  saveSettings,
} from './db'
import type { BadgeSettings, ImageRecord } from '../types/badge'

function sampleSettings(overrides: Partial<BadgeSettings> = {}): BadgeSettings {
  return {
    schemaVersion: 2,
    name: '測試名牌',
    nameLine2: '',
    nameDirection: 'horizontal',
    showName: true,
    nameShadow: false,
    namePosition: 'bottom',
    nameLayout: [
      { offset: null, scale: 1 },
      { offset: null, scale: 1 },
    ],
    themeId: 'neon-dark',
    style: {
      background: { type: 'gradient', from: '#000000', to: '#222222', angle: 160 },
      textColor: '#ffffff',
      fontSizePx: 48,
    },
    imageShape: 'circle',
    imageBasePercent: 22,
    imageOutline: 'none',
    imageOutlineColor: '#ffffff',
    physics: { gravity: 1, bounciness: 0.78, shakeStrength: 1, airDrag: 1 },
    customFontName: '',
    imageIds: [],
    setupCompleted: true,
    updatedAt: 123,
    ...overrides,
  }
}

function sampleImage(id: string, content = 'img'): ImageRecord {
  return {
    id,
    originalBlob: new Blob([`original-${content}`], { type: 'image/webp' }),
    croppedBlob: new Blob([`cropped-${content}`], { type: 'image/webp' }),
    crop: { x: 0, y: 0, size: 100 },
    createdAt: Date.now(),
    sizeScale: 1,
    shapeMode: 'global',
    hasAlpha: false,
  }
}

beforeEach(async () => {
  await __resetDbForTests()
  globalThis.indexedDB = new IDBFactory() as unknown as typeof globalThis.indexedDB
})

describe('settings store', () => {
  it('returns undefined when nothing was saved', async () => {
    expect(await loadSettings()).toBeUndefined()
  })

  it('round-trips settings', async () => {
    const settings = sampleSettings({ imageIds: ['a', 'b'] })
    await saveSettings(settings)
    expect(await loadSettings()).toEqual(settings)
  })

  it('overwrites instead of duplicating', async () => {
    await saveSettings(sampleSettings({ name: '第一版' }))
    await saveSettings(sampleSettings({ name: '第二版' }))
    expect((await loadSettings())?.name).toBe('第二版')
  })

  it('preserves image order in imageIds', async () => {
    const order = ['c', 'a', 'b']
    await saveSettings(sampleSettings({ imageIds: order }))
    expect((await loadSettings())?.imageIds).toEqual(order)
  })
})

describe('images store', () => {
  it('round-trips image records including blob content', async () => {
    await putImage(sampleImage('img-1', 'hello'))
    const images = await loadAllImages()
    const record = images.get('img-1')
    expect(record).toBeDefined()
    expect(record?.crop).toEqual({ x: 0, y: 0, size: 100 })
    expect(await record?.croppedBlob.text()).toBe('cropped-hello')
    expect(await record?.originalBlob.text()).toBe('original-hello')
    expect(record?.croppedBlob.type).toBe('image/webp')
  })

  it('stores multiple images and deletes one', async () => {
    await putImage(sampleImage('a'))
    await putImage(sampleImage('b'))
    await deleteImage('a')
    const images = await loadAllImages()
    expect([...images.keys()]).toEqual(['b'])
  })

  it('updates an existing image in place', async () => {
    await putImage(sampleImage('a', 'v1'))
    await putImage({ ...sampleImage('a', 'v2'), crop: { x: 5, y: 6, size: 50 } })
    const images = await loadAllImages()
    expect(images.size).toBe(1)
    expect(images.get('a')?.crop.size).toBe(50)
  })
})

describe('assets store', () => {
  it('round-trips the background image blob', async () => {
    await saveAsset(BACKGROUND_ASSET_KEY, new Blob(['bg-bytes'], { type: 'image/webp' }))
    const loaded = await loadAsset(BACKGROUND_ASSET_KEY)
    expect(await loaded?.text()).toBe('bg-bytes')
  })

  it('deletes an asset', async () => {
    await saveAsset(BACKGROUND_ASSET_KEY, new Blob(['x'], { type: 'image/webp' }))
    await deleteAsset(BACKGROUND_ASSET_KEY)
    expect(await loadAsset(BACKGROUND_ASSET_KEY)).toBeUndefined()
  })
})

describe('clearAllData', () => {
  it('empties all stores including assets', async () => {
    await saveSettings(sampleSettings())
    await putImage(sampleImage('a'))
    await saveAsset(BACKGROUND_ASSET_KEY, new Blob(['x'], { type: 'image/webp' }))
    await clearAllData()
    expect(await loadSettings()).toBeUndefined()
    expect((await loadAllImages()).size).toBe(0)
    expect(await loadAsset(BACKGROUND_ASSET_KEY)).toBeUndefined()
  })
})

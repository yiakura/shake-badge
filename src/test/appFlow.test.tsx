import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IDBFactory } from 'fake-indexeddb'
import App from '../app/App'
import { __resetStoreForTests } from '../stores/badgeStore'
import { __resetDbForTests, putImage, saveSettings } from '../services/db'
import { setLocale } from '../i18n'
import type { BadgeSettings, ImageRecord } from '../types/badge'

// jsdom has no canvas — stub the whole image pipeline
vi.mock('../services/imageProcessing', () => {
  let counter = 0
  return {
    createImageRecord: vi.fn(async (file: File): Promise<ImageRecord> => ({
      id: `mock-${counter++}-${file.name}`,
      originalBlob: new Blob(['original'], { type: 'image/webp' }),
      croppedBlob: new Blob(['cropped'], { type: 'image/webp' }),
      crop: { x: 0, y: 0, size: 64 },
      createdAt: Date.now(),
      sizeScale: 1,
      shapeMode: 'global' as const,
      hasAlpha: false,
    })),
    cropToSquare: vi.fn(async () => new Blob(['re-cropped'], { type: 'image/webp' })),
    compressImage: vi.fn(async () => ({
      blob: new Blob(['bg'], { type: 'image/webp' }),
      width: 64,
      height: 64,
      hasAlpha: false,
    })),
    decodeImage: vi.fn(),
    releaseDecoded: vi.fn(),
  }
})

function makeSettings(overrides: Partial<BadgeSettings> = {}): BadgeSettings {
  return {
    schemaVersion: 2,
    name: '小魚',
    nameLine2: '',
    nameDirection: 'horizontal',
    showName: true,
    nameShadow: false,
    namePosition: 'bottom',
    nameOffset: null,
    nameScale: 1,
    themeId: 'neon-dark',
    style: {
      background: { type: 'gradient', from: '#0d0221', to: '#2b0a4e', angle: 160 },
      textColor: '#ecfeff',
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
    updatedAt: Date.now(),
    ...overrides,
  }
}

function makeImage(id: string): ImageRecord {
  return {
    id,
    originalBlob: new Blob(['o'], { type: 'image/webp' }),
    croppedBlob: new Blob(['c'], { type: 'image/webp' }),
    crop: { x: 0, y: 0, size: 64 },
    createdAt: Date.now(),
    sizeScale: 1,
    shapeMode: 'global',
    hasAlpha: false,
  }
}

beforeEach(async () => {
  await __resetDbForTests()
  globalThis.indexedDB = new IDBFactory() as unknown as typeof globalThis.indexedDB
  __resetStoreForTests()
  setLocale('zh-TW') // assertions below are in Traditional Chinese
  window.location.hash = ''
  delete (window as { DeviceMotionEvent?: unknown }).DeviceMotionEvent
})

describe('建立名牌流程', () => {
  it('home → editor → 輸入名稱 → 預覽更新 → 儲存 → remount 後出現「繼續使用」', async () => {
    const user = userEvent.setup()
    const first = render(<App />)

    // fresh install: create button only
    expect(await screen.findByRole('button', { name: '建立我的名牌' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '繼續使用' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '建立我的名牌' }))
    expect(await screen.findByRole('heading', { name: '編輯名牌' })).toBeInTheDocument()

    // typing updates the live badge preview
    await user.type(screen.getByLabelText('暱稱'), '小魚')
    expect(await screen.findByText('小魚')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /儲存/ }))
    expect(await screen.findByText('已儲存！')).toBeInTheDocument()

    // simulate a fresh page load: store resets, IndexedDB survives
    first.unmount()
    __resetStoreForTests()
    window.location.hash = ''
    render(<App />)
    expect(await screen.findByRole('button', { name: '繼續使用' })).toBeInTheDocument()
  })

  it('儲存時擋下純空白名稱', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: '建立我的名牌' }))
    await user.type(await screen.findByLabelText('暱稱'), '   ')
    await user.click(screen.getByRole('button', { name: /儲存/ }))
    expect(await screen.findAllByText('請輸入暱稱（不能只有空白）')).not.toHaveLength(0)
  })
})

describe('上傳圖片', () => {
  it('接受合法圖片並更新張數，拒絕不支援的格式', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.click(await screen.findByRole('button', { name: '建立我的名牌' }))
    await screen.findByRole('heading', { name: '編輯名牌' })

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input).not.toBeNull()

    fireEvent.change(input!, {
      target: { files: [new File(['x'], 'photo.png', { type: 'image/png' })] },
    })
    expect(await screen.findByText('1 / 20')).toBeInTheDocument()

    fireEvent.change(input!, {
      target: { files: [new File(['x'], 'anim.gif', { type: 'image/gif' })] },
    })
    expect(await screen.findByText('「anim.gif」不是支援的圖片格式')).toBeInTheDocument()
    expect(screen.getByText('1 / 20')).toBeInTheDocument()

    // 開始展示 unlocks once an image exists
    expect(screen.getByRole('button', { name: /開始展示/ })).toBeEnabled()
  })
})

describe('展示頁', () => {
  it('無 DeviceMotion 時仍提供「搖一下」與拖曳畫布', async () => {
    await saveSettings(makeSettings({ imageIds: ['img-1'] }))
    await putImage(makeImage('img-1'))
    window.location.hash = '#/stage'

    render(<App />)

    expect(await screen.findByTestId('stage-canvas')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '搖一下' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重設位置' })).toBeInTheDocument()
    // badge name renders on stage
    expect(screen.getByText('小魚')).toBeInTheDocument()
  })

  it('iOS 權限流程：顯示「啟用搖晃效果」，允許後開始監聽', async () => {
    class FakeDeviceMotionEvent {
      static requestPermission = vi.fn(async () => 'granted' as const)
    }
    ;(window as { DeviceMotionEvent?: unknown }).DeviceMotionEvent = FakeDeviceMotionEvent

    await saveSettings(makeSettings({ imageIds: ['img-1'] }))
    await putImage(makeImage('img-1'))
    window.location.hash = '#/stage'

    const user = userEvent.setup()
    render(<App />)

    const enable = await screen.findByRole('button', { name: '啟用搖晃效果' })
    await user.click(enable)

    expect(FakeDeviceMotionEvent.requestPermission).toHaveBeenCalledOnce()
    // permission overlay closes; the stage stays interactive
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: '搖一下' })).toBeInTheDocument()
  })

  it('沒有圖片時導回編輯頁', async () => {
    await saveSettings(makeSettings({ imageIds: [] }))
    window.location.hash = '#/stage'
    render(<App />)
    expect(await screen.findByRole('heading', { name: '編輯名牌' })).toBeInTheDocument()
  })
})

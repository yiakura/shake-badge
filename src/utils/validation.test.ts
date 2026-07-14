import { describe, expect, it } from 'vitest'
import {
  nameLength,
  remainingImageSlots,
  validateFontFile,
  validateImageFile,
  validateName,
} from './validation'
import { LIMITS } from '../config/limits'

describe('validateName', () => {
  it('rejects empty input', () => {
    expect(validateName('')).toEqual({ ok: false, reason: 'empty' })
  })

  it('rejects whitespace-only input', () => {
    expect(validateName('   \t  ')).toEqual({ ok: false, reason: 'empty' })
  })

  it('trims surrounding whitespace', () => {
    expect(validateName('  小明  ')).toEqual({ ok: true, value: '小明' })
  })

  it('accepts exactly 20 characters', () => {
    const name = '名'.repeat(LIMITS.maxNameLength)
    expect(validateName(name)).toEqual({ ok: true, value: name })
  })

  it('rejects 21 characters', () => {
    expect(validateName('名'.repeat(LIMITS.maxNameLength + 1))).toEqual({
      ok: false,
      reason: 'too-long',
    })
  })

  it('counts emoji as single characters (code points, not UTF-16 units)', () => {
    const name = '🎈'.repeat(LIMITS.maxNameLength) // .length would be 40
    expect(validateName(name)).toEqual({ ok: true, value: name })
  })
})

describe('nameLength', () => {
  it('counts CJK and emoji by code point', () => {
    expect(nameLength('你好')).toBe(2)
    expect(nameLength('🎈🎈')).toBe(2)
    expect(nameLength('a你🎈')).toBe(3)
  })
})

describe('validateImageFile', () => {
  const file = (overrides: Partial<{ name: string; size: number; type: string }>) => ({
    name: 'photo.jpg',
    size: 1024,
    type: 'image/jpeg',
    ...overrides,
  })

  it('accepts jpg, jpeg, png, webp', () => {
    expect(validateImageFile(file({}))).toEqual({ ok: true })
    expect(validateImageFile(file({ name: 'a.jpeg' }))).toEqual({ ok: true })
    expect(validateImageFile(file({ name: 'a.png', type: 'image/png' }))).toEqual({ ok: true })
    expect(validateImageFile(file({ name: 'a.webp', type: 'image/webp' }))).toEqual({ ok: true })
  })

  it('accepts uppercase extensions', () => {
    expect(validateImageFile(file({ name: 'PHOTO.JPG' }))).toEqual({ ok: true })
  })

  it('rejects unsupported MIME types', () => {
    expect(validateImageFile(file({ name: 'a.gif', type: 'image/gif' }))).toEqual({
      ok: false,
      reason: 'type',
    })
    expect(validateImageFile(file({ name: 'a.svg', type: 'image/svg+xml' }))).toEqual({
      ok: false,
      reason: 'type',
    })
  })

  it('rejects extension/MIME mismatch', () => {
    expect(validateImageFile(file({ name: 'a.png', type: 'image/jpeg' }))).toEqual({
      ok: false,
      reason: 'type',
    })
  })

  it('accepts a valid MIME type when the filename has no extension', () => {
    expect(validateImageFile(file({ name: 'camera-capture' }))).toEqual({ ok: true })
  })

  it('enforces the 10 MB limit inclusively', () => {
    expect(validateImageFile(file({ size: LIMITS.maxFileBytes }))).toEqual({ ok: true })
    expect(validateImageFile(file({ size: LIMITS.maxFileBytes + 1 }))).toEqual({
      ok: false,
      reason: 'size',
    })
  })
})

describe('remainingImageSlots', () => {
  it('reflects the max-images limit (20)', () => {
    expect(LIMITS.maxImages).toBe(20)
    expect(remainingImageSlots(0)).toBe(20)
    expect(remainingImageSlots(7)).toBe(13)
    expect(remainingImageSlots(LIMITS.maxImages)).toBe(0)
    expect(remainingImageSlots(LIMITS.maxImages + 5)).toBe(0)
  })
})

describe('validateFontFile', () => {
  const file = (overrides: Partial<{ name: string; size: number; type: string }>) => ({
    name: 'MyFont.ttf',
    size: 1024,
    type: 'font/ttf',
    ...overrides,
  })

  it('accepts ttf, otf, woff, woff2 by extension', () => {
    for (const ext of ['.ttf', '.otf', '.woff', '.woff2']) {
      expect(validateFontFile(file({ name: `x${ext}` }))).toEqual({ ok: true })
    }
  })

  it('accepts uppercase extensions', () => {
    expect(validateFontFile(file({ name: 'X.WOFF2' }))).toEqual({ ok: true })
  })

  it('rejects non-font extensions regardless of MIME', () => {
    expect(validateFontFile(file({ name: 'a.png', type: 'font/ttf' }))).toEqual({
      ok: false,
      reason: 'type',
    })
    expect(validateFontFile(file({ name: 'noext' }))).toEqual({ ok: false, reason: 'type' })
  })

  it('enforces the size cap inclusively', () => {
    expect(validateFontFile(file({ size: LIMITS.maxFontBytes }))).toEqual({ ok: true })
    expect(validateFontFile(file({ size: LIMITS.maxFontBytes + 1 }))).toEqual({
      ok: false,
      reason: 'size',
    })
  })
})

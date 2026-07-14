import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SUPPORTED_LOCALES, getLocale, setLocale, t, type Locale } from './index'
import { zhTW } from './zh-TW'
import { en } from './en'
import { ja } from './ja'
import { ko } from './ko'

beforeEach(() => {
  setLocale('zh-TW')
})
afterEach(() => {
  setLocale('zh-TW')
})

describe('t()', () => {
  it('returns the zh-TW string for a key', () => {
    expect(t('editor.saveBtn')).toBe('儲存')
  })

  it('switches language when setLocale is called', () => {
    setLocale('en')
    expect(t('editor.saveBtn')).toBe('Save')
    setLocale('ja')
    expect(t('editor.saveBtn')).toBe('保存')
    setLocale('ko')
    expect(t('editor.saveBtn')).toBe('저장')
  })

  it('interpolates variables in every language', () => {
    for (const locale of ['zh-TW', 'en', 'ja', 'ko'] as Locale[]) {
      setLocale(locale)
      expect(t('editor.imagesCount', { current: 3, max: 20 })).toBe('3 / 20')
      expect(t('editor.nameTooLong', { max: 20 })).toContain('20')
    }
  })

  it('getLocale reflects the active language', () => {
    setLocale('ja')
    expect(getLocale()).toBe('ja')
  })
})

describe('dictionary parity', () => {
  const locales = { 'zh-TW': zhTW, en, ja, ko }
  const baseKeys = Object.keys(zhTW).sort()

  it('exposes the four supported locales', () => {
    expect(SUPPORTED_LOCALES.map((l) => l.code)).toEqual(['zh-TW', 'en', 'ja', 'ko'])
  })

  for (const [name, dict] of Object.entries(locales)) {
    it(`${name} has exactly the same keys as zh-TW`, () => {
      expect(Object.keys(dict).sort()).toEqual(baseKeys)
    })

    it(`${name} has no empty strings`, () => {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.length, `empty translation: ${name}.${key}`).toBeGreaterThan(0)
      }
    })
  }

  it('placeholder tokens match zh-TW in every language', () => {
    const tokensOf = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort()
    for (const dict of [en, ja, ko]) {
      for (const key of baseKeys as (keyof typeof zhTW)[]) {
        expect(tokensOf(dict[key]), `tokens differ for ${key}`).toEqual(tokensOf(zhTW[key]))
      }
    }
  })
})

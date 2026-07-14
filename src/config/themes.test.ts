import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, THEMES, backgroundCss, getTheme } from './themes'
import { t } from '../i18n'

describe('themes config', () => {
  it('ships the 4 built-in themes', () => {
    expect(THEMES).toHaveLength(4)
    expect(THEMES.map((theme) => theme.id)).toEqual([
      'neon-dark',
      'light-minimal',
      'pink-cute',
      'blue-tech',
    ])
  })

  it('has unique ids', () => {
    const ids = THEMES.map((theme) => theme.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every theme has a translated label and complete style', () => {
    for (const theme of THEMES) {
      expect(t(theme.labelKey)).not.toBe(theme.labelKey)
      expect(theme.style.textColor).toMatch(/^#/)
      expect(theme.style.background.from).toMatch(/^#/)
      expect(theme.style.fontSizePx).toBeGreaterThan(0)
      if (theme.style.background.type === 'gradient') {
        expect(theme.style.background.to).toMatch(/^#/)
      }
    }
  })

  it('getTheme finds by id and returns undefined otherwise', () => {
    expect(getTheme('pink-cute')?.labelKey).toBe('theme.pinkCute')
    expect(getTheme('nope')).toBeUndefined()
  })

  it('DEFAULT_THEME is the first theme', () => {
    expect(DEFAULT_THEME).toBe(THEMES[0])
  })
})

describe('backgroundCss', () => {
  it('renders solid backgrounds as the color itself', () => {
    expect(backgroundCss({ type: 'solid', from: '#123456' })).toBe('#123456')
  })

  it('renders gradients with angle and both stops', () => {
    expect(backgroundCss({ type: 'gradient', from: '#000000', to: '#ffffff', angle: 45 })).toBe(
      'linear-gradient(45deg, #000000, #ffffff)',
    )
  })

  it('defaults the gradient angle to 180deg', () => {
    expect(backgroundCss({ type: 'gradient', from: '#000', to: '#fff' })).toBe(
      'linear-gradient(180deg, #000, #fff)',
    )
  })

  it('falls back to solid when a gradient is missing its end color', () => {
    expect(backgroundCss({ type: 'gradient', from: '#abc' })).toBe('#abc')
  })
})

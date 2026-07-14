import type { BadgeBackground, BadgeStyle } from '../types/badge'
import type { I18nKey } from '../i18n'

export interface BadgeTheme {
  id: string
  labelKey: I18nKey
  style: BadgeStyle
}

/**
 * 內建主題。新增主題：在此陣列加一筆，並在 i18n 字典補上 labelKey 文字。
 */
export const THEMES: readonly BadgeTheme[] = [
  {
    id: 'neon-dark',
    labelKey: 'theme.neonDark',
    style: {
      background: { type: 'gradient', from: '#0d0221', to: '#2b0a4e', angle: 160 },
      textColor: '#ecfeff',
      nameGlow: '#22d3ee',
      fontSizePx: 48,
    },
  },
  {
    id: 'light-minimal',
    labelKey: 'theme.lightMinimal',
    style: {
      background: { type: 'solid', from: '#f6f5f1' },
      textColor: '#23272f',
      fontSizePx: 48,
    },
  },
  {
    id: 'pink-cute',
    labelKey: 'theme.pinkCute',
    style: {
      background: { type: 'gradient', from: '#ffe3ee', to: '#ffb6d3', angle: 180 },
      textColor: '#a62960',
      fontSizePx: 48,
    },
  },
  {
    id: 'blue-tech',
    labelKey: 'theme.blueTech',
    style: {
      background: { type: 'gradient', from: '#040f1f', to: '#0d3a75', angle: 205 },
      textColor: '#d6ecff',
      nameGlow: '#3b9eff',
      fontSizePx: 48,
    },
  },
]

export const DEFAULT_THEME = THEMES[0]

export function getTheme(id: string): BadgeTheme | undefined {
  return THEMES.find((theme) => theme.id === id)
}

/** turn a BadgeBackground into a CSS background value */
export function backgroundCss(bg: BadgeBackground): string {
  if (bg.type === 'gradient' && bg.to) {
    return `linear-gradient(${bg.angle ?? 180}deg, ${bg.from}, ${bg.to})`
  }
  return bg.from
}

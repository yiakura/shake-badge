/** stacked dark text-shadow that draws an outline + soft drop shadow for legibility */
export function textOutlineShadow(px: number): string {
  const o = Math.max(1, Math.round(px))
  return [
    `${o}px ${o}px 0 rgba(0,0,0,.7)`,
    `-${o}px ${o}px 0 rgba(0,0,0,.7)`,
    `${o}px -${o}px 0 rgba(0,0,0,.7)`,
    `-${o}px -${o}px 0 rgba(0,0,0,.7)`,
    `0 ${o * 2}px ${o * 3}px rgba(0,0,0,.55)`,
  ].join(', ')
}

interface NameShadowOptions {
  /** the user's outline/shadow toggle */
  outline: boolean
  /** outline thickness in px (scale with font size) */
  outlinePx: number
  /** optional theme glow color */
  glow?: string
  /** glow blur radii [inner, outer] */
  glowBlur?: [number, number]
  /** shadow used when neither outline nor glow apply */
  fallback?: string
}

/** compose the badge name's CSS text-shadow from the outline toggle and theme glow */
export function nameTextShadow(opts: NameShadowOptions): string | undefined {
  const parts: string[] = []
  if (opts.outline) parts.push(textOutlineShadow(opts.outlinePx))
  if (opts.glow) {
    const [inner, outer] = opts.glowBlur ?? [12, 30]
    parts.push(`0 0 ${inner}px ${opts.glow}`, `0 0 ${outer}px ${opts.glow}`)
  } else if (!opts.outline && opts.fallback) {
    parts.push(opts.fallback)
  }
  return parts.length ? parts.join(', ') : undefined
}

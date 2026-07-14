/** css font-family the custom name font registers under */
export const NAME_FONT_FAMILY = 'sb-user-font'

/** css font stack for the badge name, honoring an uploaded custom font */
export function nameFontFamily(customFontName: string): string | undefined {
  return customFontName ? `'${NAME_FONT_FAMILY}', var(--font-display)` : undefined
}

let current: FontFace | null = null

export function isFontApiSupported(): boolean {
  return typeof FontFace !== 'undefined' && typeof document !== 'undefined' && 'fonts' in document
}

/** load a font blob and register it as NAME_FONT_FAMILY; replaces any previous one */
export async function registerNameFont(blob: Blob): Promise<boolean> {
  if (!isFontApiSupported()) return false
  try {
    const buffer = await blob.arrayBuffer()
    const face = new FontFace(NAME_FONT_FAMILY, buffer)
    await face.load()
    if (current) document.fonts.delete(current)
    document.fonts.add(face)
    current = face
    return true
  } catch {
    return false
  }
}

export function unregisterNameFont(): void {
  if (current && isFontApiSupported()) document.fonts.delete(current)
  current = null
}

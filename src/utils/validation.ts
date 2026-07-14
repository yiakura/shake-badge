import { LIMITS } from '../config/limits'

export type NameValidation =
  | { ok: true; value: string }
  | { ok: false; reason: 'empty' | 'too-long' }

/** count user-perceived characters by code point (avoids splitting CJK/emoji surrogate pairs) */
export function nameLength(name: string): number {
  return Array.from(name).length
}

export function validateName(raw: string): NameValidation {
  const value = raw.trim()
  if (value.length === 0) return { ok: false, reason: 'empty' }
  if (nameLength(value) > LIMITS.maxNameLength) return { ok: false, reason: 'too-long' }
  return { ok: true, value }
}

export type FileValidation = { ok: true } | { ok: false; reason: 'type' | 'size' }

interface FileLike {
  name: string
  size: number
  type: string
}

export function validateImageFile(file: FileLike): FileValidation {
  const extensions = LIMITS.acceptedTypes[file.type as keyof typeof LIMITS.acceptedTypes]
  if (!extensions) return { ok: false, reason: 'type' }
  // some pickers/cameras hand over files without an extension — MIME check already passed
  const dot = file.name.lastIndexOf('.')
  if (dot > 0) {
    const ext = file.name.slice(dot).toLowerCase()
    if (!extensions.some((allowed) => allowed === ext)) return { ok: false, reason: 'type' }
  }
  if (file.size > LIMITS.maxFileBytes) return { ok: false, reason: 'size' }
  return { ok: true }
}

export function remainingImageSlots(currentCount: number): number {
  return Math.max(0, LIMITS.maxImages - currentCount)
}

export function validateFontFile(file: FileLike): FileValidation {
  const dot = file.name.lastIndexOf('.')
  const ext = dot > 0 ? file.name.slice(dot).toLowerCase() : ''
  // font MIME types are inconsistent across browsers — validate by extension
  if (!LIMITS.acceptedFontExtensions.some((allowed) => allowed === ext)) {
    return { ok: false, reason: 'type' }
  }
  if (file.size > LIMITS.maxFontBytes) return { ok: false, reason: 'size' }
  return { ok: true }
}

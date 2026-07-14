import type { BadgeSettings, ImageRecord } from '../types/badge'
import { backgroundCss } from '../config/themes'
import { nameFontFamily } from '../services/fontService'
import { nameTextShadow } from '../utils/badgeText'
import { useObjectUrl } from '../hooks/useObjectUrl'

interface ThumbProps {
  record: ImageRecord
  settings: BadgeSettings
  basePx: number
}

function BadgeThumb({ record, settings, basePx }: ThumbProps) {
  const url = useObjectUrl(record.croppedBlob)
  const px = Math.round(Math.min(Math.max(basePx * record.sizeScale, 24), 88))
  const useSource = record.shapeMode === 'source' && record.hasAlpha
  const sticker = !useSource && settings.imageShape === 'sticker'
  const hasColorEdge = settings.imageOutline === 'color'
  const radius = useSource
    ? ''
    : sticker
      ? 'rounded-lg'
      : settings.imageShape === 'circle'
        ? 'rounded-full'
        : 'rounded-xl'
  // preview approximation of the die-cut margin; the stage bakes the exact contour.
  // edge is transparent by default, colored only when 色線 is chosen
  const decoration = sticker
    ? { backgroundColor: hasColorEdge ? settings.imageOutlineColor : 'transparent', padding: 2 }
    : hasColorEdge && !useSource
      ? { border: `3px solid ${settings.imageOutlineColor}` }
      : undefined

  if (!url) {
    return <div className={`${radius} bg-white/20`} style={{ width: px, height: px }} />
  }
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      className={`${radius} object-cover select-none ${useSource ? '' : 'shadow-md'}`}
      style={{ width: px, height: px, ...decoration }}
    />
  )
}

interface BadgeCardProps {
  settings: BadgeSettings
  images: ImageRecord[]
  backgroundBlob?: Blob | null
  /** shown when the name is empty (e.g. demo badge on the home page) */
  placeholderName?: string
  className?: string
}

/** live miniature of the badge — used by the home hero and the editor preview */
export function BadgeCard({ settings, images, backgroundBlob, placeholderName, className = '' }: BadgeCardProps) {
  const { style, namePosition, showName, nameDirection } = settings
  const backgroundUrl = useObjectUrl(style.background.type === 'image' ? backgroundBlob : null)
  const line1 = settings.name || placeholderName || ''
  const lines = [line1, settings.nameLine2].filter((line) => line.trim().length > 0)
  const shown = images.slice(0, 3)
  const extra = images.length - shown.length
  const previewFontPx = Math.max(12, Math.round(style.fontSizePx * 0.45))
  const thumbBasePx = 30 + settings.imageBasePercent * 1.1

  const nameNode =
    showName && lines.length > 0 ? (
      <div
        className={`font-display font-extrabold text-center px-4 ${
          nameDirection === 'vertical' ? '[writing-mode:vertical-rl] max-h-36' : 'break-all'
        }`}
        style={{
          color: style.textColor,
          fontSize: previewFontPx,
          fontFamily: nameFontFamily(settings.customFontName),
          textShadow: nameTextShadow({
            outline: settings.nameShadow,
            outlinePx: 1,
            glow: style.nameGlow,
            glowBlur: [10, 26],
          }),
        }}
      >
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    ) : null

  return (
    <div
      className={`relative rounded-3xl border border-black/10 shadow-xl overflow-hidden ${className}`}
      style={
        backgroundUrl
          ? {
              backgroundColor: style.background.from,
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { background: backgroundCss(style.background) }
      }
    >
      {/* lanyard punch slot */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-2 rounded-full bg-black/25 shadow-inner" />
      <div className="flex flex-col items-center justify-center gap-4 px-5 pt-8 pb-6 min-h-44">
        {namePosition === 'top' && nameNode}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {shown.length > 0 ? (
            <>
              {shown.map((record) => (
                <BadgeThumb key={record.id} record={record} settings={settings} basePx={thumbBasePx} />
              ))}
              {extra > 0 && (
                <span className="text-sm font-bold opacity-80" style={{ color: style.textColor }}>
                  +{extra}
                </span>
              )}
            </>
          ) : (
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${settings.imageShape === 'circle' ? 'rounded-full' : 'rounded-xl'} border-2 border-dashed opacity-40`}
                style={{ borderColor: style.textColor, width: thumbBasePx, height: thumbBasePx }}
              />
            ))
          )}
        </div>
        {namePosition === 'bottom' && nameNode}
      </div>
    </div>
  )
}

import { Crop, Trash2 } from 'lucide-react'
import type { ImageRecord } from '../types/badge'
import { RANGES } from '../config/limits'
import { removeImage, updateImage, updateImageLocal, useBadgeStore } from '../stores/badgeStore'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { Slider } from './Slider'
import { Chip } from './StyleControls'
import { t } from '../i18n'

interface ImageSheetProps {
  recordId: string
  onCrop: () => void
  onClose: () => void
}

/** bottom sheet with the per-image controls: size, PNG silhouette, crop, delete */
export function ImageSheet({ recordId, onCrop, onClose }: ImageSheetProps) {
  const { images } = useBadgeStore()
  const record: ImageRecord | undefined = images.find((image) => image.id === recordId)
  const url = useObjectUrl(record?.croppedBlob)

  if (!record) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center animate-fade" role="presentation">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('sheet.title')}
        className="relative w-full max-w-md card rounded-b-none p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] animate-rise"
      >
        <div className="flex items-center gap-3 mb-5">
          {url && (
            <img
              src={url}
              alt=""
              className={`size-12 object-cover ${
                record.shapeMode === 'source' && record.hasAlpha ? '' : 'rounded-xl'
              }`}
            />
          )}
          <h2 className="font-extrabold">{t('sheet.title')}</h2>
        </div>

        <Slider
          label={t('sheet.size')}
          min={RANGES.imageScale.min}
          max={RANGES.imageScale.max}
          step={RANGES.imageScale.step}
          value={record.sizeScale}
          onChange={(sizeScale) => updateImageLocal({ ...record, sizeScale })}
          onCommit={() => void updateImage({ ...record })}
          format={(v) => `${Math.round(v * 100)}%`}
        />

        {record.hasAlpha && (
          <div className="mt-5">
            <span className="field-label">{t('sheet.shape')}</span>
            <div className="flex gap-2">
              <Chip
                on={record.shapeMode === 'global'}
                onClick={() => void updateImage({ ...record, shapeMode: 'global' })}
              >
                {t('sheet.shapeGlobal')}
              </Chip>
              <Chip
                on={record.shapeMode === 'source'}
                onClick={() => void updateImage({ ...record, shapeMode: 'source' })}
              >
                {t('sheet.shapeSource')}
              </Chip>
            </div>
            <p className="mt-2 text-xs text-ink-soft dark:text-frost-soft">{t('sheet.shapeSourceHint')}</p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button type="button" className="btn btn-secondary flex-1" onClick={onCrop}>
            <Crop className="size-5" aria-hidden="true" />
            {t('editor.cropAction')}
          </button>
          <button
            type="button"
            className="btn btn-danger flex-1"
            onClick={() => {
              void removeImage(record.id)
              onClose()
            }}
          >
            <Trash2 className="size-5" aria-hidden="true" />
            {t('editor.deleteAction')}
          </button>
        </div>
        <button type="button" className="btn btn-primary w-full mt-3" onClick={onClose}>
          {t('sheet.done')}
        </button>
      </div>
    </div>
  )
}

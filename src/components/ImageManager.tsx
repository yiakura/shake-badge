import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import type { ImageRecord, ImageShape } from '../types/badge'
import { ACCEPT_ATTRIBUTE, LIMITS } from '../config/limits'
import { remainingImageSlots, validateImageFile } from '../utils/validation'
import { createImageRecord } from '../services/imageProcessing'
import {
  addImage,
  getState,
  persistSettings,
  removeImage,
  reorderImages,
  useBadgeStore,
} from '../stores/badgeStore'
import { showToast } from '../stores/toastStore'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { t } from '../i18n'
import { CropDialog } from './CropDialog'
import { ImageSheet } from './ImageSheet'

interface TileProps {
  record: ImageRecord
  index: number
  count: number
  shape: ImageShape
  dragging: boolean
  onCrop: () => void
  onDragStart: (event: React.PointerEvent<HTMLButtonElement>) => void
  onDragMove: (event: React.PointerEvent<HTMLButtonElement>) => void
  onDragEnd: () => void
}

function Tile({ record, index, count, shape, dragging, onCrop, onDragStart, onDragMove, onDragEnd }: TileProps) {
  const url = useObjectUrl(record.croppedBlob)
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-2xl'

  return (
    <div
      data-tile-index={index}
      className={`relative aspect-square transition-[transform,opacity] ${dragging ? 'scale-90 opacity-60 z-10' : ''}`}
    >
      <button
        type="button"
        className={`absolute inset-0 w-full h-full overflow-hidden ${radius} border-2 border-ink/10 dark:border-frost/15 bg-ink/5`}
        onClick={onCrop}
        aria-label={`${t('sheet.title')} ${index + 1}`}
      >
        {url && <img src={url} alt="" draggable={false} className="w-full h-full object-cover select-none" />}
      </button>

      {/* drag handle */}
      <button
        type="button"
        aria-label={`${t('editor.dragToReorder')} ${index + 1}`}
        className="absolute -top-1.5 -left-1.5 size-11 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <span className="size-7 rounded-full bg-ink/70 text-white flex items-center justify-center shadow">
          <GripVertical className="size-4" aria-hidden="true" />
        </span>
      </button>

      {/* delete */}
      <button
        type="button"
        aria-label={`${t('editor.deleteAction')} ${index + 1}`}
        className="absolute -top-1.5 -right-1.5 size-11 flex items-center justify-center"
        onClick={() => void removeImage(record.id)}
      >
        <span className="size-7 rounded-full bg-accent-deep text-white flex items-center justify-center shadow">
          <Trash2 className="size-4" aria-hidden="true" />
        </span>
      </button>

      {/* a11y reorder fallback */}
      <div className="absolute bottom-0 inset-x-0 flex justify-between">
        <button
          type="button"
          aria-label={`${t('editor.moveLeft')} ${index + 1}`}
          disabled={index === 0}
          className="size-11 flex items-end justify-start p-1 disabled:opacity-0"
          onClick={() => {
            reorderImages(index, index - 1)
            void persistSettings()
          }}
        >
          <span className="size-7 rounded-full bg-black/45 text-white flex items-center justify-center">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </span>
        </button>
        <button
          type="button"
          aria-label={`${t('editor.moveRight')} ${index + 1}`}
          disabled={index === count - 1}
          className="size-11 flex items-end justify-end p-1 disabled:opacity-0"
          onClick={() => {
            reorderImages(index, index + 1)
            void persistSettings()
          }}
        >
          <span className="size-7 rounded-full bg-black/45 text-white flex items-center justify-center">
            <ChevronRight className="size-4" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>
  )
}

export function ImageManager() {
  const { settings, images } = useBadgeStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [cropTarget, setCropTarget] = useState<ImageRecord | null>(null)

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return
    const selected = Array.from(files)
    setProcessing(true)
    try {
      for (const file of selected) {
        if (remainingImageSlots(getState().images.length) === 0) {
          showToast(t('editor.imageLimitReached', { max: LIMITS.maxImages }))
          break
        }
        const check = validateImageFile(file)
        if (!check.ok) {
          showToast(
            check.reason === 'size'
              ? t('editor.imageTooLarge', { name: file.name })
              : t('editor.imageWrongType', { name: file.name }),
          )
          continue
        }
        try {
          const record = await createImageRecord(file)
          const stored = await addImage(record)
          if (!stored) showToast(t('error.saveFailed'))
        } catch {
          showToast(t('editor.imageReadError', { name: file.name }))
        }
      }
    } finally {
      setProcessing(false)
    }
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, id: string): void {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraggingId(id)
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>, id: string): void {
    if (draggingId !== id) return
    const under = document.elementFromPoint(event.clientX, event.clientY)
    const tile = under?.closest('[data-tile-index]')
    if (!tile) return
    const to = Number(tile.getAttribute('data-tile-index'))
    const from = getState().images.findIndex((record) => record.id === id)
    if (from !== -1 && Number.isInteger(to) && to !== from) reorderImages(from, to)
  }

  function endDrag(id: string): void {
    if (draggingId !== id) return
    setDraggingId(null)
    void persistSettings()
  }

  const full = images.length >= LIMITS.maxImages

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-extrabold">{t('editor.imagesTitle')}</h2>
        <span
          className={`text-sm font-bold ${full ? 'text-accent' : 'text-ink-soft dark:text-frost-soft'}`}
          aria-live="polite"
        >
          {t('editor.imagesCount', { current: images.length, max: LIMITS.maxImages })}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {images.map((record, index) => (
          <Tile
            key={record.id}
            record={record}
            index={index}
            count={images.length}
            shape={settings.imageShape}
            dragging={draggingId === record.id}
            onCrop={() => setSheetId(record.id)}
            onDragStart={(event) => startDrag(event, record.id)}
            onDragMove={(event) => moveDrag(event, record.id)}
            onDragEnd={() => endDrag(record.id)}
          />
        ))}

        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={processing}
            className="aspect-square rounded-2xl border-2 border-dashed border-ink/25 dark:border-frost/25
              flex flex-col items-center justify-center gap-1 text-ink-soft dark:text-frost-soft
              active:scale-95 transition-transform"
          >
            {processing ? (
              <>
                <Loader2 className="size-6 animate-spin" aria-hidden="true" />
                <span className="text-xs font-bold">{t('editor.processing')}</span>
              </>
            ) : (
              <>
                <ImagePlus className="size-6" aria-hidden="true" />
                <span className="text-xs font-bold">{t('editor.addImage')}</span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-soft dark:text-frost-soft">
        {t('editor.uploadHint')}
        {images.length > 1 ? ` · ${t('editor.dragToReorder')}` : ''}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        multiple
        hidden
        onChange={(event) => {
          void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />

      {sheetId && (
        <ImageSheet
          recordId={sheetId}
          onCrop={() => {
            const record = images.find((image) => image.id === sheetId)
            setSheetId(null)
            if (record) setCropTarget(record)
          }}
          onClose={() => setSheetId(null)}
        />
      )}
      {cropTarget && <CropDialog record={cropTarget} onClose={() => setCropTarget(null)} />}
    </div>
  )
}

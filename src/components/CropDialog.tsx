import { useRef, useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { Check, Loader2, X } from 'lucide-react'
import type { ImageRecord } from '../types/badge'
import { cropToSquare } from '../services/imageProcessing'
import { updateImage } from '../stores/badgeStore'
import { showToast } from '../stores/toastStore'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { t } from '../i18n'

interface CropDialogProps {
  record: ImageRecord
  onClose: () => void
}

export function CropDialog({ record, onClose }: CropDialogProps) {
  const imageUrl = useObjectUrl(record.originalBlob)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [busy, setBusy] = useState(false)
  const areaRef = useRef<Area | null>(null)

  async function apply(): Promise<void> {
    const area = areaRef.current
    if (!area || busy) return
    setBusy(true)
    try {
      const cropParams = { x: Math.round(area.x), y: Math.round(area.y), size: Math.round(area.width) }
      const croppedBlob = await cropToSquare(record.originalBlob, cropParams)
      const saved = await updateImage({ ...record, croppedBlob, crop: cropParams })
      if (!saved) {
        showToast(t('error.saveFailed'))
        return
      }
      onClose()
    } catch {
      showToast(t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-night flex flex-col animate-fade" role="dialog" aria-modal="true" aria-label={t('crop.title')}>
      <header className="flex items-center justify-between px-4 pt-safe">
        <button type="button" className="btn btn-icon text-frost" onClick={onClose} aria-label={t('common.close')}>
          <X className="size-6" aria-hidden="true" />
        </button>
        <h2 className="font-bold text-frost">{t('crop.title')}</h2>
        <span className="w-11" aria-hidden="true" />
      </header>

      <div className="relative flex-1 m-4 rounded-2xl overflow-hidden bg-black/40">
        {imageUrl && (
          <Cropper
            image={imageUrl}
            aspect={1}
            crop={crop}
            zoom={zoom}
            minZoom={1}
            maxZoom={5}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_area, areaPixels) => {
              areaRef.current = areaPixels
            }}
            initialCroppedAreaPixels={
              // a contain-crop extends past the image (negative offset); let the
              // cropper default to a centered window rather than choke on it
              record.crop.x >= 0 && record.crop.y >= 0
                ? { x: record.crop.x, y: record.crop.y, width: record.crop.size, height: record.crop.size }
                : undefined
            }
          />
        )}
      </div>

      <footer className="px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] flex flex-col items-center gap-4">
        <p className="text-xs text-frost-soft">{t('crop.hint')}</p>
        <button type="button" className="btn btn-primary w-full max-w-sm text-lg" onClick={() => void apply()} disabled={busy}>
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Check className="size-5" aria-hidden="true" />}
          {t('crop.apply')}
        </button>
      </footer>
    </div>
  )
}

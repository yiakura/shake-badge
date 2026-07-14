import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ImageRecord, StoredSettings } from '../types/badge'

const DB_NAME = 'shake-badge-db'
const DB_VERSION = 2
const SETTINGS_KEY = 'badge'
export const BACKGROUND_ASSET_KEY = 'background'
export const FONT_ASSET_KEY = 'nameFont'

interface ShakeBadgeDB extends DBSchema {
  settings: { key: string; value: StoredSettings }
  images: { key: string; value: ImageRecord }
  /** binary side-data (e.g. the custom background image) */
  assets: { key: string; value: Blob }
}

let dbPromise: Promise<IDBPDatabase<ShakeBadgeDB>> | null = null

function getDb(): Promise<IDBPDatabase<ShakeBadgeDB>> {
  dbPromise ??= openDB<ShakeBadgeDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('settings')
        db.createObjectStore('images', { keyPath: 'id' })
      }
      if (oldVersion < 2) {
        db.createObjectStore('assets')
      }
      // future migrations continue here: if (oldVersion < 3) { ... }
    },
  })
  return dbPromise
}

export async function loadSettings(): Promise<StoredSettings | undefined> {
  return (await getDb()).get('settings', SETTINGS_KEY)
}

export async function saveSettings(settings: StoredSettings): Promise<void> {
  await (await getDb()).put('settings', settings, SETTINGS_KEY)
}

export async function saveAsset(key: string, blob: Blob): Promise<void> {
  await (await getDb()).put('assets', blob, key)
}

export async function loadAsset(key: string): Promise<Blob | undefined> {
  return (await getDb()).get('assets', key)
}

export async function deleteAsset(key: string): Promise<void> {
  await (await getDb()).delete('assets', key)
}

export async function putImage(record: ImageRecord): Promise<void> {
  await (await getDb()).put('images', record)
}

export async function deleteImage(id: string): Promise<void> {
  await (await getDb()).delete('images', id)
}

export async function loadAllImages(): Promise<Map<string, ImageRecord>> {
  const records = await (await getDb()).getAll('images')
  return new Map(records.map((record) => [record.id, record]))
}

export async function clearAllData(): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['settings', 'images', 'assets'], 'readwrite')
  await Promise.all([
    tx.objectStore('settings').clear(),
    tx.objectStore('images').clear(),
    tx.objectStore('assets').clear(),
  ])
  await tx.done
}

/** drop the cached connection so tests can swap in a fresh fake IndexedDB */
export async function __resetDbForTests(): Promise<void> {
  if (dbPromise) {
    ;(await dbPromise).close()
    dbPromise = null
  }
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { profile, track } from './data'

export type Settings = {
  views: string
  location: string
  locationGlow: boolean
  about: string
  trackSrc: string
  trackTitle: string
  trackArtist: string
  customTrack: boolean
}

type SettingsContextValue = {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  reset: () => Promise<void>
  setTrackFile: (file: File) => Promise<void>
  clearTrackFile: () => Promise<void>
}

const STORAGE_KEY = 'apollo:admin:settings'
const DB_NAME = 'apollo-admin'
const STORE_NAME = 'files'
const TRACK_KEY = 'track'

export const defaultSettings: Settings = {
  views: profile.views,
  location: profile.location,
  locationGlow: false,
  about: "i stay with the 5's",
  trackSrc: track.src,
  trackTitle: track.title,
  trackArtist: track.artist,
  customTrack: false,
}

type StoredTrack = { name: string; blob: Blob }

function openTrackDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readTrack(): Promise<StoredTrack | null> {
  const db = await openTrackDb()
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .get(TRACK_KEY)
      request.onsuccess = () =>
        resolve((request.result as StoredTrack | undefined) ?? null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

async function writeTrack(value: StoredTrack): Promise<void> {
  const db = await openTrackDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
        .put(value, TRACK_KEY)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

async function clearTrack(): Promise<void> {
  const db = await openTrackDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
        .delete(TRACK_KEY)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultSettings }
    const saved = JSON.parse(raw) as Partial<Settings>
    return {
      ...defaultSettings,
      views: typeof saved.views === 'string' ? saved.views : defaultSettings.views,
      location:
        typeof saved.location === 'string'
          ? saved.location
          : defaultSettings.location,
      locationGlow: saved.locationGlow === true,
      about: typeof saved.about === 'string' ? saved.about : defaultSettings.about,
      trackTitle:
        typeof saved.trackTitle === 'string'
          ? saved.trackTitle
          : defaultSettings.trackTitle,
      trackArtist:
        typeof saved.trackArtist === 'string'
          ? saved.trackArtist
          : defaultSettings.trackArtist,
      customTrack: saved.customTrack === true,
    }
  } catch {
    return { ...defaultSettings }
  }
}

function persist(settings: Settings) {
  const saved: Omit<Settings, 'trackSrc'> = {
    views: settings.views,
    location: settings.location,
    locationGlow: settings.locationGlow,
    about: settings.about,
    trackTitle: settings.trackTitle,
    trackArtist: settings.trackArtist,
    customTrack: settings.customTrack,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {
    // Storage can be unavailable; edits still apply for this visit.
  }
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const objectUrl = useRef<string | null>(null)

  useEffect(() => {
    persist(settings)
  }, [settings])

  useEffect(() => {
    let cancelled = false

    readTrack()
      .then((stored) => {
        if (cancelled || !stored) return
        const url = URL.createObjectURL(stored.blob)
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
        objectUrl.current = url
        setSettings((prev) => ({ ...prev, trackSrc: url }))
      })
      .catch(() => {
        // No stored track; the bundled default keeps playing.
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(
    () => () => {
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current)
        objectUrl.current = null
      }
    },
    [],
  )

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const setTrackFile = useCallback(async (file: File) => {
    await writeTrack({ name: file.name, blob: file })
    const url = URL.createObjectURL(file)
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = url
    const title = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim()

    setSettings((prev) => ({
      ...prev,
      trackSrc: url,
      trackTitle: title || 'custom track',
      trackArtist: 'custom upload',
      customTrack: true,
    }))
  }, [])

  const clearTrackFile = useCallback(async () => {
    await clearTrack()
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = null
    }
    setSettings((prev) => ({
      ...prev,
      trackSrc: track.src,
      trackTitle: track.title,
      trackArtist: track.artist,
      customTrack: false,
    }))
  }, [])

  const reset = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage failures.
    }
    await clearTrack().catch(() => undefined)
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = null
    }
    setSettings({ ...defaultSettings })
  }, [])

  const value = useMemo(
    () => ({ settings, update, reset, setTrackFile, clearTrackFile }),
    [settings, update, reset, setTrackFile, clearTrackFile],
  )

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used inside SettingsProvider')
  }
  return context
}

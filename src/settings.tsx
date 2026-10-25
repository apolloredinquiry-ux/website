import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchProfile,
  saveProfile,
  trackUrl,
  uploadTrack,
  type RemoteProfile,
} from './api'
import { profile, track } from './data'

export type Settings = {
  views: string
  location: string
  locationGlow: boolean
  about: string
  trackKey: string | null
  trackSrc: string
  trackTitle: string
  trackArtist: string
  customTrack: boolean
}

type SettingsContextValue = {
  settings: Settings
  loading: boolean
  save: (patch: Partial<Settings>, key: string) => Promise<void>
  upload: (file: File, key: string) => Promise<void>
  reset: (key: string) => Promise<void>
}

const CACHE_KEY = 'apollo:profile:v2'

export const defaultSettings: Settings = {
  views: profile.views,
  location: profile.location,
  locationGlow: false,
  about: "i stay with the 5's",
  trackKey: null,
  trackSrc: track.src,
  trackTitle: track.title,
  trackArtist: track.artist,
  customTrack: false,
}

function fromRemote(remote: RemoteProfile): Settings {
  return {
    views: remote.views,
    location: remote.location,
    locationGlow: remote.locationGlow,
    about: remote.about,
    trackKey: remote.trackKey,
    trackSrc: remote.trackKey ? trackUrl(remote.trackKey) : track.src,
    trackTitle: remote.trackTitle || track.title,
    trackArtist: remote.trackArtist || track.artist,
    customTrack: remote.customTrack,
  }
}

function toRemote(settings: Settings): RemoteProfile {
  return {
    views: settings.views,
    location: settings.location,
    locationGlow: settings.locationGlow,
    about: settings.about,
    trackKey: settings.trackKey,
    trackTitle: settings.trackTitle,
    trackArtist: settings.trackArtist,
    customTrack: settings.customTrack,
  }
}

function readCache(): Settings {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return { ...defaultSettings }
    const remote = JSON.parse(raw) as Partial<RemoteProfile>
    if (
      !remote ||
      typeof remote.views !== 'string' ||
      typeof remote.location !== 'string' ||
      typeof remote.about !== 'string'
    ) {
      return { ...defaultSettings }
    }
    return fromRemote({
      ...toRemote(defaultSettings),
      ...remote,
    } as RemoteProfile)
  } catch {
    return { ...defaultSettings }
  }
}

function writeCache(remote: RemoteProfile) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(remote))
  } catch {
    // Caching is best-effort; the API remains the source of truth.
  }
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(readCache)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetchProfile()
      .then((remote) => {
        if (cancelled) return
        if (!remote) {
          setSettings({ ...defaultSettings })
          try {
            localStorage.removeItem(CACHE_KEY)
          } catch {
            // Ignore storage failures.
          }
          return
        }
        setSettings(fromRemote(remote))
        writeCache(remote)
      })
      .catch(() => {
        // Keep the cached profile when the API is unreachable.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(
    async (patch: Partial<Settings>, key: string) => {
      const saved = await saveProfile(toRemote({ ...settings, ...patch }), key)
      setSettings(fromRemote(saved))
      writeCache(saved)
    },
    [settings],
  )

  const upload = useCallback(
    async (file: File, key: string) => {
      const trackKey = await uploadTrack(file, key)
      const title =
        file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .trim() || 'custom track'

      const saved = await saveProfile(
        toRemote({
          ...settings,
          trackKey,
          trackSrc: trackUrl(trackKey),
          trackTitle: title,
          trackArtist: 'custom upload',
          customTrack: true,
        }),
        key,
      )
      setSettings(fromRemote(saved))
      writeCache(saved)
    },
    [settings],
  )

  const reset = useCallback(async (key: string) => {
    const saved = await saveProfile(toRemote(defaultSettings), key)
    setSettings(fromRemote(saved))
    writeCache(saved)
  }, [])

  const value = useMemo(
    () => ({ settings, loading, save, upload, reset }),
    [settings, loading, save, upload, reset],
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

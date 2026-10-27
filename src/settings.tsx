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
  uploadAsset,
  uploadTrack,
  type AssetKind,
  type RandomTrack,
  type RemoteProfile,
} from './api'
import { profile, track } from './data'

export type Settings = {
  views: string
  location: string
  locationGlow: boolean
  discord: string
  displayName: string
  avatarKey: string | null
  about: string
  trackKey: string | null
  trackSrc: string
  trackTitle: string
  trackArtist: string
  customTrack: boolean
  playlistUrl: string | null
  randomTracks: RandomTrack[]
  imageKey: string | null
  imageCaption: string
  imageRadius: number
  imageGlow: boolean
  imageFit: 'cover' | 'contain'
  backgroundKey: string | null
  backgroundKind: AssetKind | null
}

type SettingsContextValue = {
  settings: Settings
  loading: boolean
  save: (patch: Partial<Settings>, key: string) => Promise<void>
  upload: (file: File, key: string) => Promise<void>
  uploadImage: (file: File, key: string) => Promise<void>
  uploadAvatar: (file: File, key: string) => Promise<void>
  uploadBackground: (file: File, key: string) => Promise<void>
  uploadRandomTrack: (file: File, key: string) => Promise<void>
  removeRandomTrack: (trackKey: string, key: string) => Promise<void>
  reset: (key: string) => Promise<void>
}

const CACHE_KEY = 'apollo:profile:v2'

export const defaultSettings: Settings = {
  views: profile.views,
  location: profile.location,
  locationGlow: false,
  discord: profile.discord,
  displayName: '',
  avatarKey: null,
  about: "i stay with the 5's",
  trackKey: null,
  trackSrc: track.src,
  trackTitle: track.title,
  trackArtist: track.artist,
  customTrack: false,
  playlistUrl: null,
  randomTracks: [],
  imageKey: null,
  imageCaption: '',
  imageRadius: 32,
  imageGlow: false,
  imageFit: 'cover',
  backgroundKey: null,
  backgroundKind: null,
}

function fromRemote(remote: RemoteProfile): Settings {
  return {
    views: remote.views,
    location: remote.location,
    locationGlow: remote.locationGlow,
    discord:
      typeof remote.discord === 'string' && remote.discord
        ? remote.discord
        : profile.discord,
    displayName: remote.displayName ?? '',
    avatarKey: remote.avatarKey ?? null,
    about: remote.about,
    trackKey: remote.trackKey,
    trackSrc: remote.trackKey ? trackUrl(remote.trackKey) : track.src,
    trackTitle: remote.trackTitle || track.title,
    trackArtist: remote.trackArtist || track.artist,
    customTrack: remote.customTrack,
    playlistUrl: remote.playlistUrl ?? null,
    randomTracks: remote.randomTracks ?? [],
    imageKey: remote.imageKey ?? null,
    imageCaption: remote.imageCaption ?? '',
    imageRadius: remote.imageRadius ?? 32,
    imageGlow: remote.imageGlow ?? false,
    imageFit: remote.imageFit === 'contain' ? 'contain' : 'cover',
    backgroundKey: remote.backgroundKey ?? null,
    backgroundKind: remote.backgroundKey
      ? remote.backgroundKind === 'video'
        ? 'video'
        : 'image'
      : null,
  }
}

function toRemote(settings: Settings): RemoteProfile {
  return {
    views: settings.views,
    location: settings.location,
    locationGlow: settings.locationGlow,
    discord: settings.discord,
    displayName: settings.displayName,
    avatarKey: settings.avatarKey,
    about: settings.about,
    trackKey: settings.trackKey,
    trackTitle: settings.trackTitle,
    trackArtist: settings.trackArtist,
    customTrack: settings.customTrack,
    playlistUrl: settings.playlistUrl,
    randomTracks: settings.randomTracks,
    imageKey: settings.imageKey,
    imageCaption: settings.imageCaption,
    imageRadius: settings.imageRadius,
    imageGlow: settings.imageGlow,
    imageFit: settings.imageFit,
    backgroundKey: settings.backgroundKey,
    backgroundKind: settings.backgroundKind,
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
          playlistUrl: null,
        }),
        key,
      )
      setSettings(fromRemote(saved))
      writeCache(saved)
    },
    [settings],
  )

  const uploadRandomTrack = useCallback(
    async (file: File, key: string) => {
      const trackKey = await uploadTrack(file, key)
      const title =
        file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]+/g, ' ')
          .trim() || 'track'
      const saved = await saveProfile(
        toRemote({
          ...settings,
          randomTracks: [...settings.randomTracks, { key: trackKey, title }],
        }),
        key,
      )
      setSettings(fromRemote(saved))
      writeCache(saved)
    },
    [settings],
  )

  const removeRandomTrack = useCallback(
    async (trackKey: string, key: string) => {
      const saved = await saveProfile(
        toRemote({
          ...settings,
          randomTracks: settings.randomTracks.filter((item) => item.key !== trackKey),
        }),
        key,
      )
      setSettings(fromRemote(saved))
      writeCache(saved)
    },
    [settings],
  )

  const uploadImage = useCallback(
    async (file: File, key: string) => {
      const asset = await uploadAsset(file, key)
      const saved = await saveProfile(
        toRemote({ ...settings, imageKey: asset.assetKey }),
        key,
      )
      setSettings(fromRemote(saved))
      writeCache(saved)
    },
    [settings],
  )

  const uploadAvatar = useCallback(
    async (file: File, key: string) => {
      const asset = await uploadAsset(file, key)
      const saved = await saveProfile(
        toRemote({ ...settings, avatarKey: asset.assetKey }),
        key,
      )
      setSettings(fromRemote(saved))
      writeCache(saved)
    },
    [settings],
  )

  const uploadBackground = useCallback(
    async (file: File, key: string) => {
      const asset = await uploadAsset(file, key)
      const saved = await saveProfile(
        toRemote({
          ...settings,
          backgroundKey: asset.assetKey,
          backgroundKind: asset.kind,
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
    () => ({
      settings,
      loading,
      save,
      upload,
      uploadImage,
      uploadAvatar,
      uploadBackground,
      uploadRandomTrack,
      removeRandomTrack,
      reset,
    }),
    [settings, loading, save, upload, uploadImage, uploadAvatar, uploadBackground, uploadRandomTrack, removeRandomTrack, reset],
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

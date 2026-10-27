export const API_BASE =
  'https://site-c5a002a802034f98a93ed1d0f3360266.freebuff.page'

export type AssetKind = 'image' | 'video'

export type RandomTrack = { key: string; title: string }

export type RemoteProfile = {
  views: string
  location: string
  locationGlow: boolean
  discord?: string
  displayName?: string
  avatarKey?: string | null
  about: string
  trackKey: string | null
  trackTitle: string
  trackArtist: string
  customTrack: boolean
  playlistUrl?: string | null
  randomTracks?: RandomTrack[]
  imageKey?: string | null
  imageCaption?: string
  imageRadius?: number
  imageGlow?: boolean
  imageFit?: 'cover' | 'contain'
  backgroundKey?: string | null
  backgroundKind?: AssetKind | null
}

export function trackUrl(key: string) {
  return `${API_BASE}/api/track/${key}`
}

export function assetUrl(key: string) {
  return `${API_BASE}/api/asset/${key}`
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string }
    return payload.error || `request failed (${response.status})`
  } catch {
    return `request failed (${response.status})`
  }
}

export async function fetchProfile(): Promise<RemoteProfile | null> {
  const response = await fetch(`${API_BASE}/api/profile`, { cache: 'no-store' })
  if (!response.ok) throw new Error(await readError(response))
  const payload = (await response.json()) as { profile: RemoteProfile | null }
  return payload.profile ?? null
}

export async function verifyKey(key: string): Promise<boolean> {
  const response = await fetch(`${API_BASE}/api/verify`, {
    method: 'POST',
    headers: { 'x-admin-key': key },
  })
  if (response.status === 401) return false
  if (!response.ok) throw new Error(await readError(response))
  return true
}

export async function saveProfile(
  profile: RemoteProfile,
  key: string,
): Promise<RemoteProfile> {
  const response = await fetch(`${API_BASE}/api/profile`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'x-admin-key': key,
    },
    body: JSON.stringify(profile),
  })
  if (response.status === 401) throw new Error('key rejected')
  if (!response.ok) throw new Error(await readError(response))
  const payload = (await response.json()) as { profile: RemoteProfile }
  return payload.profile
}

export async function uploadAsset(
  file: File,
  key: string,
): Promise<{ assetKey: string; kind: AssetKind }> {
  const form = new FormData()
  form.append('file', file)

  const response = await fetch(`${API_BASE}/api/asset`, {
    method: 'POST',
    headers: { 'x-admin-key': key },
    body: form,
  })
  if (response.status === 401) throw new Error('key rejected')
  if (!response.ok) throw new Error(await readError(response))
  const payload = (await response.json()) as {
    assetKey: string
    kind: AssetKind
  }
  return payload
}

export async function uploadTrack(file: File, key: string): Promise<string> {
  const form = new FormData()
  form.append('file', file)

  const response = await fetch(`${API_BASE}/api/track`, {
    method: 'POST',
    headers: { 'x-admin-key': key },
    body: form,
  })
  if (response.status === 401) throw new Error('key rejected')
  if (!response.ok) throw new Error(await readError(response))
  const payload = (await response.json()) as { trackKey: string }
  return payload.trackKey
}

export const API_BASE =
  'https://site-257c6e06c7b74a449ec9935688df3722.freebuff.page'

export type RemoteProfile = {
  views: string
  location: string
  locationGlow: boolean
  about: string
  trackKey: string | null
  trackTitle: string
  trackArtist: string
  customTrack: boolean
}

export function trackUrl(key: string) {
  return `${API_BASE}/api/track/${key}`
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

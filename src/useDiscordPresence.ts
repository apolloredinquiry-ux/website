import { useEffect, useState } from 'react'
import { profile } from './data'

export const DISCORD_ID = '692925166761672716'
const PRESENCE_ENDPOINT = `https://api.lanyard.rest/v1/users/${DISCORD_ID}`

export type LanyardActivity = {
  type: number
  name: string
  details?: string
  state?: string
}

export type LanyardPresence = {
  discord_user: {
    id: string
    username: string
    global_name?: string | null
    display_name?: string | null
    avatar?: string | null
  }
  discord_status: 'online' | 'idle' | 'dnd' | 'offline'
  activities: LanyardActivity[]
  spotify: { song: string; artist: string } | null
}

let cached: LanyardPresence | null = null
let polling = false
const subscribers = new Set<(presence: LanyardPresence) => void>()

async function fetchPresence() {
  try {
    const response = await fetch(PRESENCE_ENDPOINT, { cache: 'no-store' })
    const payload = (await response.json()) as {
      success?: boolean
      data?: LanyardPresence
    }
    if (!payload.success || !payload.data) return

    const next = payload.data
    cached = next
    subscribers.forEach((subscriber) => subscriber(next))
  } catch {
    // Keep the last known presence when the API cannot be reached.
  }
}

function startPolling() {
  if (polling) return
  polling = true
  void fetchPresence()
  window.setInterval(fetchPresence, 30000)
}

export function useDiscordPresence() {
  const [presence, setPresence] = useState<LanyardPresence | null>(cached)

  useEffect(() => {
    startPolling()
    subscribers.add(setPresence)
    if (cached) setPresence(cached)

    return () => {
      subscribers.delete(setPresence)
    }
  }, [])

  return presence
}

export function displayName(presence: LanyardPresence | null) {
  const user = presence?.discord_user
  return (
    user?.display_name?.trim() ||
    user?.global_name?.trim() ||
    user?.username?.trim() ||
    ''
  )
}

export function avatarUrl(presence: LanyardPresence | null) {
  const user = presence?.discord_user
  if (!user) return '/avatar.svg'
  if (!user.avatar) return 'https://cdn.discordapp.com/embed/avatars/0.png'

  const extension = user.avatar.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=256`
}

export function useDisplayName() {
  return displayName(useDiscordPresence()) || profile.fallbackName
}

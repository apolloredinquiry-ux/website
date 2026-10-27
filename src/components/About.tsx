import { useEffect, useState } from 'react'
import { FaDiscord, FaLastfm, FaRegClock } from 'react-icons/fa'
import { timezone } from '../data'
import { useSettings } from '../settings'
import { assetUrl, fetchLastfm, type LastfmTrack } from '../api'
import {
  avatarUrl,
  displayName as presenceName,
  useDiscordPresence,
  type LanyardPresence,
} from '../useDiscordPresence'
import MusicPlayer from './MusicPlayer'
import Reveal from './Reveal'

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: timezone.zone,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: timezone.zone,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const gmtFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: timezone.zone,
  timeZoneName: 'shortOffset',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDiff(hours: number) {
  const rounded = Math.round(hours * 2) / 2
  const value = Number.isInteger(rounded) ? rounded : rounded.toFixed(1)
  return `${rounded >= 0 ? '+' : ''}${value}h`
}

const statusColors = {
  online: '#23a55a',
  idle: '#f0b232',
  dnd: '#f23f43',
  offline: '#80848e',
} as const

const statusLabels = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do not disturb',
  offline: 'Offline',
} as const

function presenceText(presence: LanyardPresence) {
  if (presence.spotify) {
    return `Listening to ${presence.spotify.song} by ${presence.spotify.artist}`
  }

  const activity = presence.activities.find((item) => item.type !== 4)
  if (activity) {
    return activity.details
      ? `${activity.name} — ${activity.details}`
      : activity.name
  }

  const customStatus = presence.activities.find((item) => item.type === 4)?.state
  return customStatus || statusLabels[presence.discord_status]
}

export default function About() {
  const [now, setNow] = useState(() => new Date())
  const [scrobbles, setScrobbles] = useState<LastfmTrack[] | null>(null)
  const presence = useDiscordPresence()
  const { settings } = useSettings()
  const discordName =
    settings.displayName || presenceName(presence) || 'apollo'
  const aboutParagraphs = settings.about
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let active = true
    const load = () =>
      fetchLastfm()
        .then((tracks) => active && setScrobbles(tracks))
        .catch(() => active && setScrobbles(null))
    load()
    const id = window.setInterval(load, 60000)
    return () => {
      active = false
      window.clearInterval(id)
    }
  }, [])

  const parts = Object.fromEntries(
    timeFormatter.formatToParts(now).map((part) => [part.type, part.value]),
  ) as Record<string, string>

  const hours = Number(parts.hour)
  const minutes = Number(parts.minute)
  const seconds = Number(parts.second)

  const digital = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0',
  )}:${String(seconds).padStart(2, '0')}`

  const dateText = dateFormatter.format(now)
  const gmt =
    gmtFormatter
      .formatToParts(now)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  const zoneAbbr =
    new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone.zone,
      timeZoneName: 'short',
    })
      .formatToParts(now)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'BST'

  const zonedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hours,
    minutes,
    seconds,
  )
  const zoneOffsetMs = zonedAsUtc - Math.floor(now.getTime() / 1000) * 1000
  const localOffsetMs = (-now.getTimezoneOffset() / 60) * 3600000
  const diffHours = (zoneOffsetMs - localOffsetMs) / 3600000
  const yourTime = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const hoursAngle = ((hours % 12) + minutes / 60) * 30
  const minutesAngle = minutes * 6 + seconds * 0.1
  const secondsAngle = seconds * 6

  const discordStatus = presence?.discord_status ?? 'offline'
  const discordAvatar = settings.avatarKey
    ? assetUrl(settings.avatarKey)
    : avatarUrl(presence)
  const discordStatusText = presence ? presenceText(presence) : 'apollo.ceo'
  const discordStatusColor = statusColors[discordStatus]

  return (
    <section className="section about-section" id="about">
      <Reveal>
        <h2 className="section-title">About me</h2>
      </Reveal>

      <Reveal delay={60}>
        <div className="about-card">
          {aboutParagraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </Reveal>

      <MusicPlayer />

      <Reveal delay={80}>
        <a
          className="lastfm-button"
          href="https://www.last.fm/user/ogcera"
          target="_blank"
          rel="noreferrer"
        >
          <FaLastfm aria-hidden="true" /> last.fm/ogcera
        </a>
      </Reveal>

      {scrobbles && scrobbles.length > 0 && (
        <Reveal delay={90}>
          <div className="scrobbles-card">
            <div className="scrobbles-head">
              <span className="scrobbles-title">
                <FaLastfm aria-hidden="true" /> recent scrobbles
              </span>
              <a
                className="scrobbles-user"
                href="https://www.last.fm/user/ogcera"
                target="_blank"
                rel="noreferrer"
              >
                last.fm/ogcera
              </a>
            </div>
            <ul className="scrobbles-list">
              {scrobbles.map((track, index) => (
                <li key={`${track.url}-${index}`} className="scrobble">
                  {track.image ? (
                    <img src={track.image} alt="" loading="lazy" />
                  ) : (
                    <span className="scrobble-blank" aria-hidden="true" />
                  )}
                  <div className="scrobble-info">
                    <a href={track.url} target="_blank" rel="noreferrer">
                      {track.name}
                    </a>
                    <span>{track.artist}</span>
                  </div>
                  <span className="scrobble-when">
                    {track.nowPlaying
                      ? 'now playing'
                      : track.playedAt
                        ? new Date(track.playedAt).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}

      <Reveal delay={110}>
        <div className="about-grid">
          <a
            className="discord-card"
            href={settings.discord}
            target="_blank"
            rel="noreferrer"
          >
            <div className="discord-avatar-wrap">
              <img
                className="discord-avatar"
                src={discordAvatar}
                alt={`${discordName} Discord avatar`}
              />
              <span className="discord-badge" aria-hidden="true">
                <FaDiscord />
              </span>
              <span
                className="presence-dot"
                style={{ background: discordStatusColor }}
                aria-hidden="true"
              />
            </div>
            <div className="discord-info">
              <span className="discord-name">{discordName}</span>
              <span className="discord-status" title={discordStatusText}>
                <span className="discord-status-text">
                  {discordStatusText}
                </span>
              </span>
            </div>
          </a>

          <div className="tz-card">
            <span className="tz-label">
              <FaRegClock aria-hidden="true" /> {zoneAbbr}
            </span>
            <div
              className="tz-clock"
              role="img"
              aria-label={`Analog clock showing ${digital} in ${timezone.zone}`}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <span
                  key={index}
                  className={`clock-tick ${index % 3 === 0 ? 'is-major' : ''}`}
                  style={{ transform: `rotate(${index * 30}deg)` }}
                />
              ))}
              <span
                className="clock-hand clock-hour"
                style={{ transform: `rotate(${hoursAngle}deg)` }}
              />
              <span
                className="clock-hand clock-minute"
                style={{ transform: `rotate(${minutesAngle}deg)` }}
              />
              <span
                className="clock-hand clock-second"
                style={{ transform: `rotate(${secondsAngle}deg)` }}
              />
              <span className="clock-center" />
            </div>
            <div className="tz-info">
              <span className="tz-time">{digital}</span>
              <span className="tz-date">
                {dateText} <span className="tz-sep">·</span> {gmt}
              </span>
              <span className="tz-your">
                Your time: {yourTime}{' '}
                <span className="tz-diff">({formatDiff(diffHours)})</span>
              </span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

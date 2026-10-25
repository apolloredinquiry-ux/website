import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { FaArrowDown, FaEye, FaMapMarkerAlt } from 'react-icons/fa'
import { badges, profile, socials } from '../data'
import {
  avatarUrl,
  useDiscordPresence,
  useDisplayName,
} from '../useDiscordPresence'

export default function Hero() {
  const cardRef = useRef<HTMLDivElement>(null)
  const name = useDisplayName()
  const presence = useDiscordPresence()
  const avatar = avatarUrl(presence)

  const scrollToContent = () => {
    document.getElementById('about')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    })
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return
    if (!window.matchMedia('(hover: hover)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const rect = card.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height

    card.style.setProperty('--rx', `${((0.5 - y) * 11).toFixed(2)}deg`)
    card.style.setProperty('--ry', `${((x - 0.5) * 13).toFixed(2)}deg`)
    card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
  }

  const resetCard = () => {
    const card = cardRef.current
    if (!card) return
    card.style.setProperty('--rx', '0deg')
    card.style.setProperty('--ry', '0deg')
    card.style.setProperty('--mx', '50%')
    card.style.setProperty('--my', '40%')
  }

  return (
    <section className="hero" id="top" aria-label="Profile">
      <div
        className="hero-inner profile-card"
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetCard}
      >
        <div className="avatar-shell">
          <img
            className="avatar"
            src={avatar}
            alt={`${name} avatar`}
            draggable={false}
          />
          <span className="avatar-ring" />
        </div>

        <h1 className="hero-name">{name}</h1>

        <ul className="badge-pill" aria-label="Profile badges">
          {badges.map(({ label, viewBox, path }) => (
            <li key={label} className="badge" title={label}>
              <svg viewBox={viewBox} role="img" aria-label={label}>
                <path fill="currentColor" d={path} />
              </svg>
            </li>
          ))}
        </ul>

        <a
          className="hero-status"
          href={profile.status}
          target="_blank"
          rel="noreferrer"
        >
          {profile.status.replace('https://', '')}
          <span className="status-caret" aria-hidden="true">
            |
          </span>
        </a>

        <nav className="socials" aria-label="Social links">
          {socials.map(({ label, href, Icon }) => (
            <a
              key={label}
              className="social-link"
              href={href}
              aria-label={label}
              title={label}
              target={href.startsWith('mailto:') ? undefined : '_blank'}
              rel={href.startsWith('mailto:') ? undefined : 'noreferrer'}
            >
              <Icon aria-hidden="true" />
            </a>
          ))}
        </nav>
      </div>

      <div className="hero-meta">
        <span className="meta-item meta-views">
          <FaEye aria-hidden="true" /> {profile.views}
        </span>
        <span className="meta-divider" aria-hidden="true">
          |
        </span>
        <span className="meta-item">
          <FaMapMarkerAlt aria-hidden="true" /> {profile.location}
        </span>
      </div>

      <button className="scroll-cue" type="button" onClick={scrollToContent}>
        <span>Scroll for more</span>
        <FaArrowDown className="scroll-arrow" aria-hidden="true" />
      </button>
    </section>
  )
}

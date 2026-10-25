import { useEffect, useState, type ChangeEvent } from 'react'
import { track } from '../data'
import { defaultSettings, useSettings } from '../settings'

const MAX_FILE_BYTES = 25 * 1024 * 1024

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { settings, update, reset, setTrackFile, clearTrackFile } = useSettings()
  const [views, setViews] = useState(settings.views)
  const [location, setLocation] = useState(settings.location)
  const [about, setAbout] = useState(settings.about)
  const [glow, setGlow] = useState(settings.locationGlow)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!saved) return
    const id = window.setTimeout(() => setSaved(false), 2000)
    return () => window.clearTimeout(id)
  }, [saved])

  const save = () => {
    update({
      views: views.trim() || '0',
      location: location.trim(),
      locationGlow: glow,
      about: about.trim(),
    })
    setError('')
    setSaved(true)
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (
      !file.type.startsWith('audio/') &&
      !/\.(mp3|wav|ogg|oga|m4a|aac|flac)$/i.test(file.name)
    ) {
      setError('choose an audio file')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('audio must be under 25 MB')
      return
    }

    setError('')
    setBusy(true)
    try {
      await setTrackFile(file)
    } catch {
      setError('could not store that file')
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async () => {
    await reset()
    setViews(defaultSettings.views)
    setLocation(defaultSettings.location)
    setAbout(defaultSettings.about)
    setGlow(defaultSettings.locationGlow)
    setError('')
    setSaved(true)
  }

  const songLabel = settings.customTrack
    ? settings.trackTitle
    : `${track.title} — ${track.artist}`

  return (
    <div
      className="admin-overlay admin-overlay-panel"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="admin-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
      >
        <header className="admin-head">
          <div>
            <span className="admin-kicker">apollo.ceo</span>
            <h2 className="admin-title" id="admin-title">
              Admin panel
            </h2>
          </div>
          <button
            className="admin-close"
            type="button"
            aria-label="Close admin panel"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="admin-body">
          <label className="admin-field">
            <span className="admin-label">Views</span>
            <input
              className="admin-input"
              value={views}
              inputMode="numeric"
              spellCheck={false}
              onChange={(event) => setViews(event.target.value)}
            />
          </label>

          <label className="admin-field">
            <span className="admin-label">Location</span>
            <input
              className="admin-input"
              value={location}
              spellCheck={false}
              onChange={(event) => setLocation(event.target.value)}
            />
          </label>

          <div className="admin-switch-row">
            <div className="admin-switch-copy">
              <span className="admin-label">Location glow</span>
              <span className="admin-hint">
                Same halo the view counter uses
              </span>
            </div>
            <button
              className={`admin-switch ${glow ? 'is-on' : ''}`}
              type="button"
              role="switch"
              aria-checked={glow}
              aria-label="Location glow"
              onClick={() => setGlow((value) => !value)}
            >
              <span />
            </button>
          </div>

          <label className="admin-field">
            <span className="admin-label">About me</span>
            <textarea
              className="admin-input admin-textarea"
              rows={4}
              value={about}
              spellCheck={false}
              onChange={(event) => setAbout(event.target.value)}
            />
          </label>

          <div className="admin-field">
            <span className="admin-label">Song file</span>
            <div className="admin-song">
              <span className="admin-song-name" title={songLabel}>
                {songLabel}
              </span>
              <label className={`admin-upload ${busy ? 'is-busy' : ''}`}>
                {busy ? 'Saving…' : 'Upload'}
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
                  onChange={handleFile}
                  disabled={busy}
                />
              </label>
            </div>
            {settings.customTrack && (
              <button
                className="admin-link"
                type="button"
                onClick={() => void clearTrackFile()}
              >
                Use the default track
              </button>
            )}
          </div>

          {error && <p className="admin-error">{error}</p>}
        </div>

        <footer className="admin-actions">
          <button
            className="admin-reset"
            type="button"
            onClick={() => void handleReset()}
          >
            Reset defaults
          </button>
          <button className="admin-save" type="button" onClick={save}>
            {saved ? 'Saved' : 'Save changes'}
          </button>
        </footer>

        <p className="admin-note">Changes are stored in this browser.</p>
      </div>
    </div>
  )
}

import { useEffect, useState, type ChangeEvent } from 'react'
import { track } from '../data'
import { defaultSettings, useSettings } from '../settings'

const MAX_FILE_BYTES = 25 * 1024 * 1024

export default function AdminPanel({
  adminKey,
  onClose,
}: {
  adminKey: string
  onClose: () => void
}) {
  const { settings, save, upload, reset } = useSettings()
  const [views, setViews] = useState(settings.views)
  const [location, setLocation] = useState(settings.location)
  const [about, setAbout] = useState(settings.about)
  const [glow, setGlow] = useState(settings.locationGlow)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'save' | 'upload' | 'reset' | null>(null)

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

  const handleSave = async () => {
    setBusy('save')
    setError('')
    try {
      await save(
        {
          views: views.trim() || '0',
          location: location.trim(),
          locationGlow: glow,
          about: about.trim(),
        },
        adminKey,
      )
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'could not save')
    } finally {
      setBusy(null)
    }
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
    setBusy('upload')
    try {
      await upload(file, adminKey)
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'could not upload')
    } finally {
      setBusy(null)
    }
  }

  const handleReset = async () => {
    setBusy('reset')
    setError('')
    try {
      await reset(adminKey)
      setViews(defaultSettings.views)
      setLocation(defaultSettings.location)
      setAbout(defaultSettings.about)
      setGlow(defaultSettings.locationGlow)
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'could not reset')
    } finally {
      setBusy(null)
    }
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
        aria-busy={busy !== null}
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
              <label
                className={`admin-upload ${busy === 'upload' ? 'is-busy' : ''}`}
              >
                {busy === 'upload' ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
                  onChange={handleFile}
                  disabled={busy !== null}
                />
              </label>
            </div>
          </div>

          {error && <p className="admin-error">{error}</p>}
        </div>

        <footer className="admin-actions">
          <button
            className="admin-reset"
            type="button"
            disabled={busy !== null}
            onClick={() => void handleReset()}
          >
            {busy === 'reset' ? 'Resetting…' : 'Reset defaults'}
          </button>
          <button
            className="admin-save"
            type="button"
            disabled={busy !== null}
            onClick={() => void handleSave()}
          >
            {busy === 'save' ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
          </button>
        </footer>

        <p className="admin-note">Changes save for everyone visiting apollo.ceo.</p>
      </div>
    </div>
  )
}

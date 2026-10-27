import { useEffect, useState, type ChangeEvent } from 'react'
import { track } from '../data'
import { defaultSettings, useSettings } from '../settings'

const MAX_FILE_BYTES = 25 * 1024 * 1024

function normalizeLink(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return url.toString()
  } catch {
    return ''
  }
}

export default function AdminPanel({
  adminKey,
  onClose,
}: {
  adminKey: string
  onClose: () => void
}) {
  const { settings, save, upload, uploadImage, uploadBackground, reset } =
    useSettings()
  const [views, setViews] = useState(settings.views)
  const [location, setLocation] = useState(settings.location)
  const [discord, setDiscord] = useState(settings.discord)
  const [about, setAbout] = useState(settings.about)
  const [glow, setGlow] = useState(settings.locationGlow)
  const [caption, setCaption] = useState(settings.imageCaption)
  const [radius, setRadius] = useState(settings.imageRadius)
  const [imageGlow, setImageGlow] = useState(settings.imageGlow)
  const [fit, setFit] = useState<'cover' | 'contain'>(settings.imageFit)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<
    'save' | 'upload' | 'image' | 'background' | 'reset' | null
  >(null)

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
    const discordLink = normalizeLink(discord)
    if (!discordLink) {
      setError('enter a valid link, e.g. https://discord.gg/lurkin')
      return
    }

    setBusy('save')
    setError('')
    try {
      await save(
        {
          views: views.trim() || '0',
          location: location.trim(),
          locationGlow: glow,
          discord: discordLink,
          about: about.trim(),
          imageCaption: caption.trim(),
          imageRadius: radius,
          imageGlow,
          imageFit: fit,
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

  const handleImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (
      !file.type.startsWith('image/') &&
      !/\.(jpe?g|png|webp|gif|avif)$/i.test(file.name)
    ) {
      setError('choose an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('image must be under 10 MB')
      return
    }

    setError('')
    setBusy('image')
    try {
      await uploadImage(file, adminKey)
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'could not upload')
    } finally {
      setBusy(null)
    }
  }

  const handleBackgroundFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    if (
      !isVideo &&
      !isImage &&
      !/\.(jpe?g|png|webp|gif|avif|mp4|webm|mov|m4v)$/i.test(file.name)
    ) {
      setError('choose an image or video file')
      return
    }
    if (file.size > (isVideo ? 25 : 10) * 1024 * 1024) {
      setError(isVideo ? 'video must be under 25 MB' : 'image must be under 10 MB')
      return
    }

    setError('')
    setBusy('background')
    try {
      await uploadBackground(file, adminKey)
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'could not upload')
    } finally {
      setBusy(null)
    }
  }

  const removeImage = async () => {
    setBusy('image')
    setError('')
    try {
      await save({ imageKey: null }, adminKey)
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'could not remove')
    } finally {
      setBusy(null)
    }
  }

  const removeBackground = async () => {
    setBusy('background')
    setError('')
    try {
      await save({ backgroundKey: null, backgroundKind: null }, adminKey)
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'could not remove')
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
      setDiscord(defaultSettings.discord)
      setAbout(defaultSettings.about)
      setGlow(defaultSettings.locationGlow)
      setCaption(defaultSettings.imageCaption)
      setRadius(defaultSettings.imageRadius)
      setImageGlow(defaultSettings.imageGlow)
      setFit(defaultSettings.imageFit)
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

          <label className="admin-field">
            <span className="admin-label">Discord link</span>
            <input
              className="admin-input"
              value={discord}
              type="text"
              inputMode="url"
              spellCheck={false}
              placeholder="https://discord.gg/lurkin"
              onChange={(event) => setDiscord(event.target.value)}
            />
            <span className="admin-hint">
              Used by the Discord card in the About section
            </span>
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

          <div className="admin-divider" />

          <div className="admin-group">
            <span className="admin-group-title">Image box</span>

            <div className="admin-song">
              <span className="admin-song-name">
                {settings.imageKey ? 'Custom image' : 'No image set'}
              </span>
              <label
                className={`admin-upload ${busy === 'image' ? 'is-busy' : ''}`}
              >
                {busy === 'image' ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif"
                  onChange={handleImageFile}
                  disabled={busy !== null}
                />
              </label>
            </div>
            {settings.imageKey && (
              <button
                className="admin-link"
                type="button"
                disabled={busy !== null}
                onClick={() => void removeImage()}
              >
                Remove image
              </button>
            )}

            <label className="admin-field">
              <span className="admin-label">Caption</span>
              <input
                className="admin-input"
                value={caption}
                maxLength={140}
                spellCheck={false}
                placeholder="optional caption"
                onChange={(event) => setCaption(event.target.value)}
              />
            </label>

            <label className="admin-field">
              <span className="admin-label">
                Corners <span className="admin-value">{radius}px</span>
              </span>
              <input
                className="admin-range"
                type="range"
                min={0}
                max={64}
                step={2}
                value={radius}
                onChange={(event) => setRadius(Number(event.target.value))}
              />
            </label>

            <div className="admin-switch-row">
              <div className="admin-switch-copy">
                <span className="admin-label">Image glow</span>
                <span className="admin-hint">White halo around the frame</span>
              </div>
              <button
                className={`admin-switch ${imageGlow ? 'is-on' : ''}`}
                type="button"
                role="switch"
                aria-checked={imageGlow}
                aria-label="Image glow"
                onClick={() => setImageGlow((value) => !value)}
              >
                <span />
              </button>
            </div>

            <div className="admin-field">
              <span className="admin-label">Fit</span>
              <div className="admin-segment" role="group" aria-label="Image fit">
                <button
                  className={`admin-segment-item ${fit === 'cover' ? 'is-on' : ''}`}
                  type="button"
                  aria-pressed={fit === 'cover'}
                  onClick={() => setFit('cover')}
                >
                  Cover
                </button>
                <button
                  className={`admin-segment-item ${fit === 'contain' ? 'is-on' : ''}`}
                  type="button"
                  aria-pressed={fit === 'contain'}
                  onClick={() => setFit('contain')}
                >
                  Contain
                </button>
              </div>
            </div>
          </div>

          <div className="admin-divider" />

          <div className="admin-group">
            <span className="admin-group-title">Page background</span>

            <div className="admin-song">
              <span className="admin-song-name">
                {settings.backgroundKey
                  ? `Custom ${settings.backgroundKind}`
                  : 'No background set'}
              </span>
              <label
                className={`admin-upload ${
                  busy === 'background' ? 'is-busy' : ''
                }`}
              >
                {busy === 'background' ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  accept="image/*,video/*,.mp4,.webm,.mov,.m4v"
                  onChange={handleBackgroundFile}
                  disabled={busy !== null}
                />
              </label>
            </div>
            {settings.backgroundKey && (
              <button
                className="admin-link"
                type="button"
                disabled={busy !== null}
                onClick={() => void removeBackground()}
              >
                Remove background
              </button>
            )}
            <span className="admin-hint">
              Image up to 10 MB or video up to 25 MB. Fills the page behind the
              cards.
            </span>
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

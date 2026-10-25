import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  FaBackward,
  FaForward,
  FaMusic,
  FaPause,
  FaPlay,
} from 'react-icons/fa'
import { useSettings } from '../settings'
import Reveal from './Reveal'

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const safe = Math.floor(seconds)
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export default function MusicPlayer() {
  const { settings } = useSettings()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    setPosition(0)
    setDuration(0)
    setIsPlaying(false)
  }, [settings.trackSrc])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const syncTime = () => setPosition(audio.currentTime)
    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    syncDuration()
    audio.addEventListener('timeupdate', syncTime)
    audio.addEventListener('loadedmetadata', syncDuration)
    audio.addEventListener('durationchange', syncDuration)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onPause)

    return () => {
      audio.removeEventListener('timeupdate', syncTime)
      audio.removeEventListener('loadedmetadata', syncDuration)
      audio.removeEventListener('durationchange', syncDuration)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onPause)
    }
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      if (audio.ended) {
        audio.currentTime = 0
        setPosition(0)
      }
      void audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return
    }
    const clamped = Math.min(audio.duration, Math.max(0, seconds))
    audio.currentTime = clamped
    setPosition(clamped)
  }, [])

  const skip = useCallback(
    (seconds: number) => {
      const audio = audioRef.current
      if (!audio) return
      seek(audio.currentTime + seconds)
    },
    [seek],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.code === 'Space' && !event.repeat) {
        const music = document.getElementById('music')
        if (!music) return
        const rect = music.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          event.preventDefault()
          togglePlay()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay])

  const progress = duration > 0 ? (position / duration) * 100 : 0

  const handleSeekClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    seek(ratio * duration)
  }

  const handleSeekKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      seek(position + 5)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      seek(position - 5)
    }
    if (event.key === 'Home') {
      event.preventDefault()
      seek(0)
    }
  }

  return (
    <section className="music-section" aria-label="Music">
      <Reveal>
        <div className="music-card">
          <div className="music-head">
            <span className="music-cover" aria-hidden="true">
              <FaMusic />
            </span>

            <div className="music-meta">
              <span className="music-title">{settings.trackTitle}</span>
              <span className="music-artist">{settings.trackArtist}</span>
            </div>

            <div className="music-controls">
              <button
                className="icon-button"
                type="button"
                aria-label="Back 15 seconds"
                title="Back 15 seconds"
                onClick={() => skip(-15)}
              >
                <FaBackward aria-hidden="true" />
              </button>
              <button
                className="icon-button icon-button-play"
                type="button"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                title={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <FaPause aria-hidden="true" />
                ) : (
                  <FaPlay aria-hidden="true" />
                )}
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="Forward 15 seconds"
                title="Forward 15 seconds"
                onClick={() => skip(15)}
              >
                <FaForward aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="music-progress">
            <span className="music-time">{formatTime(position)}</span>
            <div
              className="progress-track"
              role="slider"
              tabIndex={0}
              aria-label="Seek in track"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(position)}
              aria-valuetext={`${formatTime(position)} of ${formatTime(
                duration,
              )}`}
              onClick={handleSeekClick}
              onKeyDown={handleSeekKey}
            >
              <div className="progress-fill" style={{ width: `${progress}%` }}>
                <span className="progress-thumb" />
              </div>
            </div>
            <span className="music-time music-time-end">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </Reveal>

      <audio
        ref={audioRef}
        src={settings.trackSrc}
        preload="auto"
        data-track
      />
    </section>
  )
}

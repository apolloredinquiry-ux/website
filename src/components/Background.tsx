import { useEffect, useRef } from 'react'
import { assetUrl } from '../api'
import { useSettings } from '../settings'

export default function Background() {
  const { settings } = useSettings()
  const videoRef = useRef<HTMLVideoElement>(null)
  const isVideo =
    settings.backgroundKind === 'video' && settings.backgroundKey !== null

  useEffect(() => {
    if (!isVideo) return
    const video = videoRef.current
    if (!video) return

    const play = () => {
      void video.play().catch(() => {})
    }

    play()
    document.addEventListener('pointerdown', play, { passive: true })
    document.addEventListener('keydown', play)

    return () => {
      document.removeEventListener('pointerdown', play)
      document.removeEventListener('keydown', play)
    }
  }, [isVideo, settings.backgroundKey])

  if (!settings.backgroundKey || !settings.backgroundKind) return null

  const src = assetUrl(settings.backgroundKey)

  return (
    <div
      className={`page-background is-${settings.backgroundKind}`}
      aria-hidden="true"
    >
      {settings.backgroundKind === 'video' ? (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : (
        <img src={src} alt="" />
      )}
      <span className="page-background-veil" />
    </div>
  )
}

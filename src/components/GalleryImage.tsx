import { FaImage } from 'react-icons/fa'
import { assetUrl } from '../api'
import { useSettings } from '../settings'
import Reveal from './Reveal'

export default function GalleryImage() {
  const { settings } = useSettings()
  const src = settings.imageKey ? assetUrl(settings.imageKey) : null

  return (
    <Reveal>
      <figure
        className={`image-box ${src && settings.imageGlow ? 'is-glow' : ''}`}
        style={{ borderRadius: `${settings.imageRadius}px` }}
      >
        {src ? (
          <img
            src={src}
            alt={settings.imageCaption || 'Gallery image'}
            style={{ objectFit: settings.imageFit }}
            draggable={false}
          />
        ) : (
          <div className="image-box-empty">
            <FaImage aria-hidden="true" />
            <span>Set an image in the admin panel</span>
          </div>
        )}

        {settings.imageCaption && (
          <figcaption className="image-caption">
            {settings.imageCaption}
          </figcaption>
        )}
      </figure>
    </Reveal>
  )
}

import type { IconType } from 'react-icons'
import { FaDiscord, FaEnvelope } from 'react-icons/fa'

export type Badge = {
  label: string
  viewBox: string
  path: string
}

export type Social = {
  label: string
  href: string
  Icon: IconType
}

export type Track = {
  id: string
  title: string
  artist: string
  src: string
}

export const profile = {
  fallbackName: 'apollo',
  discord: 'https://discord.gg/lurkin',
  views: '81,149',
  location: 'Paris, France',
}

export const badges: Badge[] = [
  {
    label: 'Staff',
    viewBox: '2.3 2 19.39 20',
    path: 'm16.06 13.09l5.63 5.59l-3.32 3.28l-5.59-5.59v-.92l2.36-2.36h.92m.91-2.53L16 9.6l-4.79 4.8v1.97L5.58 22L2.3 18.68l5.59-5.59h1.97l.78-.78L6.8 8.46H5.5L2.69 5.62L5.31 3l2.8 2.8v1.31L12 10.95l2.66-2.66l-.96-1.01L15 5.97h-2.66l-.65-.65L15 2l.66.66v2.66L16.97 4l3.28 3.28c1.09 1.1 1.09 2.89 0 3.98l-1.97-2.01l-1.31 1.31Z',
  },
  {
    label: 'Verified',
    viewBox: '1 1.5 22 21',
    path: 'm8.6 22.5l-1.9-3.2l-3.6-.8l.35-3.7L1 12l2.45-2.8l-.35-3.7l3.6-.8l1.9-3.2L12 2.95l3.4-1.45l1.9 3.2l3.6.8l-.35 3.7L23 12l-2.45 2.8l.35 3.7l-3.6.8l-1.9 3.2l-3.4-1.45l-3.4 1.45Zm2.35-6.95L16.6 9.9l-1.4-1.45l-4.25 4.25l-2.15-2.1L7.4 12l3.55 3.55Z',
  },
  {
    label: 'OG',
    viewBox: '4.39 2 15.22 20.97',
    path: 'm12 8.5l2.116 5.088l5.492.44l-4.184 3.585l1.278 5.36L12 20.1l-4.702 2.872l1.278-5.36l-4.184-3.584l5.492-.44L12 8.5ZM8 2v9H6V2h2Zm10 0v9h-2V2h2Zm-5 0v5h-2V2h2Z',
  },
]

export const socials: Social[] = [
  { label: 'Discord', href: profile.discord, Icon: FaDiscord },
  { label: 'Email', href: 'mailto:apollo@apollo.ceo', Icon: FaEnvelope },
]

export const track: Track = {
  id: 'i-wanna-rage',
  title: 'I Wanna Rage',
  artist: 'Apollo Red x OsamaSon',
  src: '/i-wanna-rage.mp3',
}

export const timezone = {
  zone: 'Europe/London',
}

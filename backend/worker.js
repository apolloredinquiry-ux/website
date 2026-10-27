// apollo.ceo profile API
//
// GET  /api/profile     public profile JSON (or null when nothing is saved)
// PUT  /api/profile     replace the profile (requires x-admin-key)
// POST /api/verify      check the panel key (requires x-admin-key)
// POST /api/track       upload an audio file (requires x-admin-key, multipart "file")
// GET  /api/track/<key> streams a stored track with range support
// POST /api/asset       upload an image or video (requires x-admin-key, multipart "file")
// GET  /api/asset/<key> serves a stored image or video with range support
//
// Bindings: DB (D1), FILES (R2), ADMIN_KEY (secret).

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
}

const MAX_TRACK_BYTES = 25 * 1024 * 1024
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 25 * 1024 * 1024
const MAX_BODY_BYTES = 32 * 1024
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac'])
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v'])
const DEFAULT_DISCORD = 'https://discord.gg/lurkin'
const TRACK_KEY = /^tracks\/[a-zA-Z0-9-]+\.[a-z0-9]{2,5}$/
const ASSET_KEY = /^assets\/[a-zA-Z0-9-]+\.[a-z0-9]{2,5}$/

let schemaReady = null

function ensureSchema(env) {
  if (!schemaReady) {
    schemaReady = env.DB.exec(
      'CREATE TABLE IF NOT EXISTS profile (' +
        'id INTEGER PRIMARY KEY CHECK (id = 1), ' +
        'data TEXT NOT NULL, ' +
        'updated_at TEXT NOT NULL' +
        ')',
    ).catch((error) => {
      schemaReady = null
      throw error
    })
  }
  return schemaReady
}

function allowedOrigin(origin) {
  if (!origin) return null
  if (origin === 'https://apollo.ceo' || origin === 'https://www.apollo.ceo') {
    return origin
  }
  if (origin === 'https://site-6bec7ccfa23e4c03b68ab6ca06119ec1.freebuff.page') {
    return origin
  }
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return null
}

function withCors(response, origin) {
  const headers = new Headers(response.headers)
  if (origin) {
    headers.set('access-control-allow-origin', origin)
    headers.set('access-control-allow-headers', 'content-type,x-admin-key')
    headers.set('access-control-allow-methods', 'GET,POST,PUT,OPTIONS')
    headers.set('access-control-max-age', '86400')
    headers.set('vary', 'Origin')
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function json(data, status, origin) {
  return withCors(
    new Response(JSON.stringify(data), { status, headers: JSON_HEADERS }),
    origin,
  )
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const left = new TextEncoder().encode(a)
  const right = new TextEncoder().encode(b)
  if (left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i]
  return diff === 0
}

function authorized(request, env) {
  const supplied = request.headers.get('x-admin-key')
  return Boolean(env.ADMIN_KEY) && safeEqual(supplied, env.ADMIN_KEY)
}

function text(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : null
}

function link(value, max = 300) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, max)
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}

function parseKey(value, pattern) {
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  return pattern.test(value) ? value : undefined
}

function keptKey(value, pattern) {
  return typeof value === 'string' && pattern.test(value) ? value : null
}

// Returns the canonical Spotify playlist URL, null to clear, or undefined when invalid.
function playlistLink(value) {
  if (value === null || value === '') return null
  if (typeof value !== 'string') return undefined
  const match = /^(?:https:\/\/open\.spotify\.com\/playlist\/|spotify:playlist:)([A-Za-z0-9]{22})/.exec(
    value.trim(),
  )
  return match ? `https://open.spotify.com/playlist/${match[1]}` : undefined
}

function sanitizeProfile(input, previous) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const base = previous && typeof previous === 'object' ? previous : {}

  const views = text(input.views, 32)
  const location = text(input.location, 80)
  const about = text(input.about, 1200)
  // Older clients omit the Discord link; keep the stored one instead of resetting it.
  const discordValue =
    input.discord === undefined ? base.discord : input.discord
  const discord = link(
    typeof discordValue === 'string' ? discordValue : DEFAULT_DISCORD,
  )
  if (discord === null) return null

  const trackTitle = text(input.trackTitle, 120)
  const trackArtist = text(input.trackArtist, 120)
  // Older clients do not send the newer fields; keep what is already stored.
  const trackKey =
    input.trackKey === undefined
      ? keptKey(base.trackKey, TRACK_KEY)
      : parseKey(input.trackKey, TRACK_KEY)

  // Older clients do not send the playlist; keep what is already stored.
  const playlistUrl =
    input.playlistUrl === undefined
      ? playlistLink(base.playlistUrl) ?? null
      : playlistLink(input.playlistUrl)

  if (views === null || location === null || about === null) return null
  if (typeof input.locationGlow !== 'boolean') return null
  if (typeof input.customTrack !== 'boolean') return null
  if (trackKey === undefined) return null
  if (playlistUrl === undefined) return null

  const imageKey =
    input.imageKey === undefined
      ? keptKey(base.imageKey, ASSET_KEY)
      : parseKey(input.imageKey, ASSET_KEY)
  const imageCaption =
    input.imageCaption === undefined
      ? typeof base.imageCaption === 'string'
        ? base.imageCaption.slice(0, 140)
        : ''
      : text(input.imageCaption, 140)
  const radiusInput =
    input.imageRadius === undefined ? base.imageRadius : input.imageRadius
  const imageRadius = Number.isFinite(radiusInput)
    ? Math.min(64, Math.max(0, Math.round(radiusInput)))
    : 32
  const imageGlow =
    input.imageGlow === undefined ? base.imageGlow === true : input.imageGlow
  const fitInput = input.imageFit === undefined ? base.imageFit : input.imageFit
  const imageFit = fitInput === 'contain' ? 'contain' : 'cover'

  const backgroundKey =
    input.backgroundKey === undefined
      ? keptKey(base.backgroundKey, ASSET_KEY)
      : parseKey(input.backgroundKey, ASSET_KEY)
  const kindInput =
    input.backgroundKind === undefined
      ? base.backgroundKind
      : input.backgroundKind
  const backgroundKind = backgroundKey
    ? kindInput === 'video'
      ? 'video'
      : 'image'
    : null

  if (
    imageKey === undefined ||
    backgroundKey === undefined ||
    imageCaption === null ||
    typeof imageGlow !== 'boolean'
  ) {
    return null
  }

  return {
    views,
    location,
    locationGlow: input.locationGlow,
    discord,
    about,
    trackKey,
    trackTitle: trackTitle ?? '',
    trackArtist: trackArtist ?? '',
    customTrack: input.customTrack && trackKey !== null,
    playlistUrl,
    imageKey,
    imageCaption,
    imageRadius,
    imageGlow,
    imageFit,
    backgroundKey,
    backgroundKind,
  }
}

async function loadProfile(env) {
  await ensureSchema(env)
  const row = await env.DB.prepare('SELECT data FROM profile WHERE id = 1').first()
  if (!row || typeof row.data !== 'string') return null
  try {
    return JSON.parse(row.data)
  } catch {
    return null
  }
}

async function saveProfile(env, profile) {
  await ensureSchema(env)
  await env.DB.prepare(
    'INSERT INTO profile (id, data, updated_at) VALUES (1, ?, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
  )
    .bind(JSON.stringify(profile), new Date().toISOString())
    .run()
}

async function trackResponse(object, request, origin) {
  const headers = new Headers()
  headers.set('content-type', object.httpMetadata?.contentType || 'audio/mpeg')
  headers.set('accept-ranges', 'bytes')
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('x-content-type-options', 'nosniff')

  const range = request.headers.get('range')
  const size = object.size

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
    if (match) {
      let start = match[1] === '' ? NaN : Number(match[1])
      let end = match[2] === '' ? NaN : Number(match[2])

      if (Number.isNaN(start) && Number.isNaN(end)) {
        return json({ error: 'bad range' }, 416, origin)
      }
      if (Number.isNaN(start)) {
        start = Math.max(0, size - end)
        end = size - 1
      } else if (Number.isNaN(end) || end >= size) {
        end = size - 1
      }
      if (start > end || start >= size) {
        return json({ error: 'bad range' }, 416, origin)
      }

      const buffer = await object.arrayBuffer()
      headers.set('content-range', `bytes ${start}-${end}/${size}`)
      headers.set('content-length', String(end - start + 1))
      return withCors(
        new Response(buffer.slice(start, end + 1), { status: 206, headers }),
        origin,
      )
    }
  }

  headers.set('content-length', String(size))
  return withCors(new Response(object.body, { status: 200, headers }), origin)
}

async function readJsonBody(request) {
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return { tooLarge: true }
  try {
    return { value: JSON.parse(raw) }
  } catch {
    return { invalid: true }
  }
}

function objectKeyFromPath(pathname) {
  const trackPrefix = '/api/track/'
  const assetPrefix = '/api/asset/'
  if (pathname.startsWith(trackPrefix)) {
    const key = decodeURIComponent(pathname.slice(trackPrefix.length))
    return TRACK_KEY.test(key) ? key : null
  }
  if (pathname.startsWith(assetPrefix)) {
    const key = decodeURIComponent(pathname.slice(assetPrefix.length))
    return ASSET_KEY.test(key) ? key : null
  }
  return null
}

function uploadKind(file) {
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  const extension = (file.name.split('.').pop() || '').toLowerCase()
  if (IMAGE_EXTENSIONS.has(extension)) return 'image'
  if (VIDEO_EXTENSIONS.has(extension)) return 'video'
  return null
}

async function handleRequest(request, env) {
  const url = new URL(request.url)
  const origin = allowedOrigin(request.headers.get('origin'))
  const pathname = url.pathname.replace(/\/+$/, '') || '/'

  if (request.method === 'OPTIONS') {
    if (!origin) return new Response(null, { status: 403 })
    return withCors(new Response(null, { status: 204 }), origin)
  }

  if (pathname === '/') {
    return json(
      {
        ok: true,
        service: 'apollo profile api',
        endpoints: [
          '/api/profile',
          '/api/verify',
          '/api/track',
          '/api/track/<key>',
          '/api/asset',
          '/api/asset/<key>',
        ],
      },
      200,
      origin,
    )
  }

  if (pathname === '/api/profile' && request.method === 'GET') {
    try {
      const profile = await loadProfile(env)
      return json({ profile }, 200, origin)
    } catch {
      return json({ error: 'storage unavailable' }, 503, origin)
    }
  }

  if (pathname === '/api/verify' && request.method === 'POST') {
    if (!authorized(request, env)) return json({ ok: false }, 401, origin)
    return json({ ok: true }, 200, origin)
  }

  if (pathname === '/api/profile' && request.method === 'PUT') {
    if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401, origin)

    const body = await readJsonBody(request)
    if (body.tooLarge) return json({ error: 'body too large' }, 413, origin)
    if (body.invalid) return json({ error: 'invalid json' }, 400, origin)

    try {
      const previous = await loadProfile(env)
      const profile = sanitizeProfile(body.value, previous)
      if (!profile) return json({ error: 'invalid profile' }, 400, origin)

      await saveProfile(env, profile)

      // Drop uploads the new profile no longer references.
      const keep = new Set(
        [profile.trackKey, profile.imageKey, profile.backgroundKey].filter(
          (key) => typeof key === 'string',
        ),
      )
      const stale = [
        previous && previous.trackKey,
        previous && previous.imageKey,
        previous && previous.backgroundKey,
      ].filter((key) => typeof key === 'string' && !keep.has(key))
      await Promise.allSettled(stale.map((key) => env.FILES.delete(key)))

      return json({ ok: true, profile }, 200, origin)
    } catch {
      return json({ error: 'storage unavailable' }, 503, origin)
    }
  }

  if (pathname === '/api/asset' && request.method === 'POST') {
    if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401, origin)

    let form
    try {
      form = await request.formData()
    } catch {
      return json({ error: 'invalid upload' }, 400, origin)
    }

    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return json({ error: 'missing file' }, 400, origin)
    }

    const kind = uploadKind(file)
    if (!kind) return json({ error: 'unsupported media type' }, 415, origin)

    const limit = kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
    if (file.size > limit) {
      return json(
        { error: kind === 'video' ? 'video must be under 25 MB' : 'image must be under 10 MB' },
        413,
        origin,
      )
    }

    const extension =
      (file.name.split('.').pop() || '').toLowerCase() ||
      (file.type.split('/')[1] || '').toLowerCase()
    const allowed = kind === 'video' ? VIDEO_EXTENSIONS : IMAGE_EXTENSIONS
    if (!allowed.has(extension)) {
      return json({ error: 'unsupported media type' }, 415, origin)
    }

    const assetKey = `assets/${crypto.randomUUID()}.${extension}`
    try {
      const bytes = await file.arrayBuffer()
      await env.FILES.put(assetKey, bytes, {
        httpMetadata: {
          contentType: file.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
          cacheControl: 'public, max-age=31536000, immutable',
        },
      })
    } catch {
      return json({ error: 'storage unavailable' }, 503, origin)
    }

    return json({ assetKey, kind, size: file.size }, 201, origin)
  }

  if (pathname === '/api/track' && request.method === 'POST') {
    if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401, origin)

    let form
    try {
      form = await request.formData()
    } catch {
      return json({ error: 'invalid upload' }, 400, origin)
    }

    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return json({ error: 'missing file' }, 400, origin)
    }
    if (file.size > MAX_TRACK_BYTES) {
      return json({ error: 'file too large' }, 413, origin)
    }

    const extension =
      (file.name.split('.').pop() || '').toLowerCase() ||
      (file.type.split('/')[1] || '').toLowerCase()
    if (!AUDIO_EXTENSIONS.has(extension)) {
      return json({ error: 'unsupported audio type' }, 415, origin)
    }

    const key = `tracks/${crypto.randomUUID()}.${extension}`
    try {
      const bytes = await file.arrayBuffer()
      await env.FILES.put(key, bytes, {
        httpMetadata: {
          contentType: file.type || 'audio/mpeg',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      })
    } catch {
      return json({ error: 'storage unavailable' }, 503, origin)
    }

    return json({ trackKey: key, size: file.size }, 201, origin)
  }

  if (request.method === 'GET') {
    const key = objectKeyFromPath(pathname)
    if (key) {
      const object = await env.FILES.get(key)
      if (!object) return json({ error: 'not found' }, 404, origin)
      return trackResponse(object, request, origin)
    }
  }

  return json({ error: 'not found' }, 404, origin)
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env)
    } catch {
      return json({ error: 'internal error' }, 500, null)
    }
  },
}

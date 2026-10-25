import { useEffect, useRef, useState, type FormEvent } from 'react'
import AdminPanel from './AdminPanel'

const KEY_ENDPOINT = '/api/admin.json'

type Phase = 'granted' | 'key' | 'panel'

async function hashKey(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export default function AdminAccess({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('granted')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (phase !== 'granted') return
    const id = window.setTimeout(() => setPhase('key'), 1500)
    return () => window.clearTimeout(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'key') inputRef.current?.focus()
  }, [phase])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = key.trim()
    if (!value || checking) return

    setChecking(true)
    setError('')

    try {
      const response = await fetch(KEY_ENDPOINT, { cache: 'no-store' })
      if (!response.ok) throw new Error('unavailable')
      const payload = (await response.json()) as { keyHash?: string }
      if (!payload.keyHash) throw new Error('unavailable')

      const digest = await hashKey(value)
      if (digest !== payload.keyHash.toLowerCase()) {
        setError('invalid key')
        setKey('')
        inputRef.current?.focus()
        return
      }

      setPhase('panel')
    } catch {
      setError('key service unavailable')
    } finally {
      setChecking(false)
    }
  }

  if (phase === 'panel') {
    return <AdminPanel onClose={onClose} />
  }

  return (
    <div
      className={`admin-overlay ${phase === 'granted' ? 'is-granted' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={phase === 'granted' ? 'Access granted' : 'Restricted access'}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {phase === 'granted' ? (
        <button
          className="admin-granted"
          type="button"
          onClick={() => setPhase('key')}
        >
          <span className="admin-granted-dot" aria-hidden="true" />
          <span className="admin-granted-label">access granted</span>
        </button>
      ) : (
        <div className="admin-gate">
          <span className="admin-gate-kicker">
            <span className="admin-granted-dot" aria-hidden="true" />
            restricted
          </span>
          <h2 className="admin-gate-title">Enter panel key</h2>

          <form className="admin-key-form" onSubmit={submit}>
            <input
              ref={inputRef}
              className="admin-input admin-key-input"
              type="password"
              value={key}
              autoComplete="off"
              spellCheck={false}
              placeholder="panel key"
              aria-label="Panel key"
              onChange={(event) => setKey(event.target.value)}
            />
            <button
              className="admin-save admin-key-submit"
              type="submit"
              disabled={checking || !key.trim()}
            >
              {checking ? 'Checking…' : 'Unlock'}
            </button>
          </form>

          {error && <p className="admin-error">{error}</p>}

          <button className="admin-link" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

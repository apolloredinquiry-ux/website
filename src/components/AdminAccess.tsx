import { useEffect, useRef, useState, type FormEvent } from 'react'
import { verifyKey } from '../api'
import AdminPanel from './AdminPanel'

type Phase = 'granted' | 'key' | 'panel'

export default function AdminAccess({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('granted')
  const [key, setKey] = useState('')
  const [adminKey, setAdminKey] = useState<string | null>(null)
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
      const accepted = await verifyKey(value)
      if (!accepted) {
        setError('invalid key')
        setKey('')
        inputRef.current?.focus()
        return
      }

      setAdminKey(value)
      setPhase('panel')
    } catch {
      setError('could not reach the server')
    } finally {
      setChecking(false)
    }
  }

  if (phase === 'panel' && adminKey) {
    return <AdminPanel adminKey={adminKey} onClose={onClose} />
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

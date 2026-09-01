import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase'

interface AuthGateProps {
  children: React.ReactNode
}

export default function AuthGate({ children }: AuthGateProps) {
  const [isValid, setIsValid] = useState(pb.authStore.isValid)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  // Keep the gate in sync with the auth store — covers both a fresh login
  // and the token expiring/being cleared (e.g. via logout).
  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      setIsValid(pb.authStore.isValid)
    })
    return unsubscribe
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await pb.collection('users').authWithPassword(email, password)
    } catch {
      setError('Invalid email or password')
    } finally {
      setSubmitting(false)
    }
  }

  if (isValid) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm bg-surface-container-lowest p-8 border border-outline-variant/20 shadow-xl">
        <div className="text-center mb-6">
          <span className="material-symbols-outlined text-4xl text-tertiary mb-3 block">lock</span>
          <h1 className="font-display text-lg font-bold text-primary uppercase tracking-widest">
            Restricted Access
          </h1>
          <p className="tactical-label mt-2 normal-case tracking-normal">
            Sign in with your crew account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              className="w-full px-1 py-2 bg-surface-container-lowest text-on-surface border-b-2 border-outline-variant/40 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="font-label text-xs uppercase tracking-widest text-on-surface-variant block mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              className="w-full px-1 py-2 bg-surface-container-lowest text-on-surface border-b-2 border-outline-variant/40 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="h-5 text-center">
            {error && (
              <p className="font-label text-xs text-error uppercase tracking-widest">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-1 px-4 py-2.5 bg-primary text-on-primary font-label text-xs uppercase tracking-widest hover:brightness-90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 text-on-surface-variant hover:text-on-surface font-label text-xs uppercase tracking-widest transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to landing
        </button>
      </div>
    </div>
  )
}

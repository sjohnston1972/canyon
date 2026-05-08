import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const PIN = '1066'
const STORAGE_KEY = 'canyon_pin_unlocked'

interface PinGateProps {
  children: React.ReactNode
}

export default function PinGate({ children }: PinGateProps) {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [digits, setDigits] = useState<string[]>(['', '', '', ''])
  const [error, setError] = useState(false)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const navigate = useNavigate()

  // Auto-focus first input when locked
  useEffect(() => {
    if (!unlocked) {
      inputsRef.current[0]?.focus()
    }
  }, [unlocked])

  const trySubmit = useCallback((current: string[]) => {
    const code = current.join('')
    if (code.length === 4) {
      if (code === PIN) {
        try {
          localStorage.setItem(STORAGE_KEY, '1')
        } catch {
          // ignore storage errors
        }
        setUnlocked(true)
        setError(false)
      } else {
        setError(true)
        setDigits(['', '', '', ''])
        setTimeout(() => {
          inputsRef.current[0]?.focus()
        }, 50)
      }
    }
  }, [])

  const handleChange = (i: number, v: string) => {
    // Only accept a single digit
    const digit = v.replace(/[^0-9]/g, '').slice(-1)
    const next = [...digits]
    next[i] = digit
    setDigits(next)
    setError(false)
    if (digit && i < 3) {
      inputsRef.current[i + 1]?.focus()
    }
    if (digit && i === 3) {
      trySubmit(next)
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
    if (e.key === 'Enter') {
      trySubmit(digits)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4)
    if (!pasted) return
    const next = ['', '', '', '']
    pasted.split('').forEach((c, idx) => { next[idx] = c })
    setDigits(next)
    if (pasted.length === 4) {
      trySubmit(next)
    } else {
      inputsRef.current[pasted.length]?.focus()
    }
  }

  if (unlocked) {
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
            Enter the 4-digit PIN to continue
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputsRef.current[i] = el }}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className={`w-12 h-14 text-center font-mono text-2xl bg-surface-container-lowest text-on-surface border-b-2 focus:outline-none transition-colors ${
                error ? 'border-error text-error' : 'border-outline-variant/40 focus:border-primary'
              }`}
            />
          ))}
        </div>

        <div className="h-5 text-center">
          {error && (
            <p className="font-label text-xs text-error uppercase tracking-widest">
              Incorrect PIN
            </p>
          )}
        </div>

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

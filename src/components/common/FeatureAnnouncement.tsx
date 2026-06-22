import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CURRENT_RELEASE, RELEASES } from '@/data/releases'

const SEEN_KEY = 'canyon_features_seen'

// Full-screen "New Features" announcement. Shows on app access whenever the current
// release is newer than what this device has acknowledged. Bumping CURRENT_RELEASE
// re-triggers it for everyone (see src/data/releases.ts).
export default function FeatureAnnouncement() {
  const [dismissed, setDismissed] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(true)

  const alreadySeen = (() => {
    try {
      return localStorage.getItem(SEEN_KEY) === CURRENT_RELEASE
    } catch {
      return false
    }
  })()

  const release = RELEASES[0]
  if (!release || alreadySeen || dismissed) return null

  function close() {
    if (dontShowAgain) {
      try { localStorage.setItem(SEEN_KEY, CURRENT_RELEASE) } catch { /* ignore */ }
    }
    // If "don't show again" is unticked we leave storage alone, so it reappears next access.
    setDismissed(true)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-surface-container-low w-full max-w-2xl max-h-[92vh] flex flex-col border border-outline-variant/30 shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-outline-variant/20 flex-shrink-0">
          <span className="material-symbols-outlined text-tertiary text-3xl">auto_awesome</span>
          <div className="flex-1 min-w-0">
            <p className="tactical-label">What's New · {release.date}</p>
            <h2 className="font-display text-xl md:text-2xl font-bold text-primary tracking-tight mt-0.5">
              {release.headline}
            </h2>
          </div>
        </div>

        {/* Features */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {release.features.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="w-10 h-10 flex-shrink-0 bg-tertiary-container text-on-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-sm font-bold text-on-surface uppercase tracking-wider">{f.title}</h3>
                <p className="font-body text-sm text-on-surface-variant mt-1 leading-relaxed">{f.body}</p>
                {f.route && (
                  <Link
                    to={f.route}
                    onClick={close}
                    className="inline-flex items-center gap-1 mt-2 font-label text-[11px] uppercase tracking-widest text-tertiary hover:brightness-110 transition-colors"
                  >
                    Open {f.route}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
          <p className="tactical-label text-[10px] normal-case tracking-normal text-outline pt-1">
            Tip: ask Hance (the chat button, bottom-right) about any of these — it can even fix currency
            conversions in the ledger for you.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-outline-variant/20 flex-shrink-0 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
              Don't show this again
            </span>
          </label>
          <button
            onClick={close}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-on-primary font-label text-xs uppercase tracking-widest hover:brightness-90 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

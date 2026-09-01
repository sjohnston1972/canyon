import { useRef, useState } from 'react'
import { toGbp, fxRateFor, type FxRates } from '@/lib/currency'
import pb from '@/lib/pocketbase'

// Mirrors the server-side cap in pocketbase/pb_hooks/parse_ledger.pb.js (~14MB of
// base64 ≈ 10MB binary) — checked client-side before we even read the file, so the
// user gets an immediate, friendly error instead of a round trip to the server.
const MAX_FILE_BYTES = 10 * 1024 * 1024

// Mirrors the ledger fields the import writes. Kept local to avoid coupling to Finances.tsx.
interface LedgerEntryInput {
  description: string
  category: string
  amount: number
  paid_by: string
  date: string
  direction: string
  ccy: string
  fx_gbp: number
  amount_gbp: number
  note: string
}

interface ParsedEntry {
  date?: string
  direction?: string
  category?: string
  paid_by?: string
  amount?: number
  ccy?: string
  description?: string
  confidence?: string
}

interface StagedRow extends ParsedEntry {
  _id: number
  keep: boolean
}

const LEDGER_CATEGORIES = ['BANK', 'Lottery', 'NPS', 'Outfitter', 'Travel', 'Food', 'Fuel', 'Misc', 'Refund']
const CCYS = ['GBP', 'USD', 'EUR']

const inputClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-xs border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1'
const selectClasses = inputClasses + ' appearance-none cursor-pointer'

const confStyle: Record<string, string> = {
  high: 'bg-tertiary-container text-on-tertiary',
  med: 'bg-surface-container-highest text-on-surface-variant',
  low: 'bg-error-container text-error',
}

// Read a File into the shape the /api/parse-ledger hook expects.
function readFile(file: File): Promise<{ kind: string; text?: string; data?: string; mediaType?: string }> {
  const name = file.name.toLowerCase()
  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf')

  if (isImage || isPdf) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.onload = () => {
        const result = String(reader.result || '')
        const base64 = result.includes(',') ? result.split(',')[1] : result
        resolve({
          kind: isPdf ? 'pdf' : 'image',
          data: base64,
          mediaType: isPdf ? 'application/pdf' : file.type,
        })
      }
      reader.readAsDataURL(file)
    })
  }

  // Treat everything else (txt, csv, unknown) as plain text.
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = () => resolve({ kind: 'text', text: String(reader.result || '') })
    reader.readAsText(file)
  })
}

export default function LedgerImport({ rates, createLedger, onClose }: {
  rates: FxRates
  createLedger: (data: Partial<LedgerEntryInput>) => Promise<unknown>
  onClose: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [phase, setPhase] = useState<'pick' | 'parsing' | 'review' | 'committing'>('pick')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState('')
  const [rows, setRows] = useState<StagedRow[]>([])
  // Rows already written to PocketBase this commit pass, keyed by staged row id —
  // lets a retry after a partial failure skip re-writing rows that already succeeded.
  const committedIdsRef = useRef<Set<number>>(new Set())

  async function handleFile(file: File) {
    setError('')
    setFileName(file.name)

    if (file.size > MAX_FILE_BYTES) {
      setError(`That file is ${(file.size / (1024 * 1024)).toFixed(1)}MB — please upload a file under 10MB.`)
      return
    }

    setPhase('parsing')
    try {
      const payload = await readFile(file)
      const res = await fetch('/api/parse-ledger', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Authorization': `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({ ...payload, today: new Date().toISOString().slice(0, 10) }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(json.error || 'Too many import requests — wait a minute and try again.')
        }
        if (res.status === 413) {
          throw new Error(json.error || 'That file is too large to import.')
        }
        throw new Error(json.error || `Parse failed (HTTP ${res.status})`)
      }
      const parsed: ParsedEntry[] = json.entries || []
      if (parsed.length === 0) {
        setError('The agent found no transactions in that file. Try a clearer file or add entries manually.')
        setPhase('pick')
        return
      }
      setSummary(json.summary || '')
      setRows(parsed.map((p, i) => ({
        ...p,
        _id: i,
        keep: true,
        direction: p.direction || 'OUT',
        category: p.category || 'Misc',
        ccy: p.ccy || 'GBP',
        amount: typeof p.amount === 'number' ? p.amount : 0,
        date: p.date || '',
        paid_by: p.paid_by || '',
        description: p.description || '',
      })))
      setPhase('review')
    } catch (err) {
      console.error('Ledger import failed', err)
      setError(err instanceof Error ? err.message : 'Import failed')
      setPhase('pick')
    }
  }

  function patchRow(id: number, patch: Partial<StagedRow>) {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)))
  }

  const kept = rows.filter((r) => r.keep)

  async function commit() {
    setPhase('committing')
    setError('')
    let failedCount = 0
    try {
      for (const r of kept) {
        // Resumable commit: skip rows already written by a previous (partially failed) pass.
        if (committedIdsRef.current.has(r._id)) continue
        const amount = Number(r.amount) || 0
        const ccy = r.ccy || 'GBP'
        const fx_gbp = fxRateFor(ccy, rates)
        const amount_gbp = toGbp(amount, ccy, rates)
        try {
          await createLedger({
            description: r.description || '',
            category: r.category || 'Misc',
            amount,
            paid_by: r.paid_by || '',
            date: r.date || '',
            direction: r.direction || 'OUT',
            ccy,
            fx_gbp,
            amount_gbp,
            note: 'Imported from ' + fileName,
          })
          committedIdsRef.current.add(r._id)
        } catch (rowErr) {
          failedCount++
          console.error(`Commit failed for row ${r._id}`, rowErr)
        }
      }
      if (failedCount > 0) {
        setError(
          `${failedCount} of ${kept.length} ${failedCount === 1 ? 'entry' : 'entries'} failed to write. ` +
          `The rest were saved — fix the issue and commit again to retry just the failed rows.`
        )
        setPhase('review')
        return
      }
      onClose()
    } catch (err) {
      console.error('Commit failed', err)
      setError(err instanceof Error ? err.message : 'Failed to write entries')
      setPhase('review')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-surface-container-low w-full max-w-4xl max-h-[90vh] flex flex-col border border-outline-variant/30 shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">smart_toy</span>
            <h2 className="font-display text-lg font-bold text-primary tracking-tight">Import to Ledger</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 px-3 py-2 bg-error-container/60 border border-error/30 text-error font-mono text-xs">
              {error}
            </div>
          )}

          {/* Pick file */}
          {phase === 'pick' && (
            <div>
              <p className="font-body text-sm text-on-surface-variant mb-4">
                Upload a bank statement, receipt, or transaction list. The agent reads it and proposes ledger entries
                for you to review before anything is saved.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-outline-variant/40 hover:border-primary hover:bg-surface-container-high/40 transition-colors py-12 flex flex-col items-center gap-2"
              >
                <span className="material-symbols-outlined text-4xl text-tertiary">upload_file</span>
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Choose a file</span>
                <span className="tactical-label text-[9px]">TXT · CSV · JPG / PNG · PDF</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,text/plain,text/csv,image/*,application/pdf"
                className="hidden"
                onChange={(ev) => {
                  const f = ev.target.files?.[0]
                  if (f) handleFile(f)
                  ev.target.value = '' // allow re-selecting the same file
                }}
              />
            </div>
          )}

          {/* Parsing */}
          {phase === 'parsing' && (
            <div className="py-16 flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-tertiary animate-spin">progress_activity</span>
              <p className="tactical-label">Agent reading {fileName}...</p>
              <p className="tactical-label text-[9px] text-outline">Statements with many rows can take a moment</p>
            </div>
          )}

          {/* Review */}
          {(phase === 'review' || phase === 'committing') && (
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="font-body text-sm text-on-surface-variant">
                  {summary || `Found ${rows.length} transactions in ${fileName}.`}
                </p>
                <span className="tactical-label">{kept.length} of {rows.length} selected</span>
              </div>

              {/* Desktop header */}
              <div className="hidden md:grid grid-cols-[28px_104px_56px_92px_120px_84px_56px_1fr_44px] gap-2 px-2 py-1.5 bg-surface-container-highest">
                <span />
                <span className="tactical-label">Date</span>
                <span className="tactical-label">Dir</span>
                <span className="tactical-label">Category</span>
                <span className="tactical-label">Paid By</span>
                <span className="tactical-label text-right">Amount</span>
                <span className="tactical-label">CCY</span>
                <span className="tactical-label">Description</span>
                <span className="tactical-label">Conf</span>
              </div>

              {rows.map((r) => (
                <div key={r._id} className={`border-b border-outline-variant/10 ${r.keep ? '' : 'opacity-40'}`}>
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[28px_104px_56px_92px_120px_84px_56px_1fr_44px] gap-2 items-center px-2 py-1.5">
                    <input type="checkbox" checked={r.keep} onChange={(ev) => patchRow(r._id, { keep: ev.target.checked })} />
                    <input type="date" className={inputClasses} value={r.date} onChange={(ev) => patchRow(r._id, { date: ev.target.value })} />
                    <select className={selectClasses} value={r.direction} onChange={(ev) => patchRow(r._id, { direction: ev.target.value })}>
                      <option value="IN">IN</option>
                      <option value="OUT">OUT</option>
                    </select>
                    <select className={selectClasses} value={r.category} onChange={(ev) => patchRow(r._id, { category: ev.target.value })}>
                      {LEDGER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input className={inputClasses} value={r.paid_by} onChange={(ev) => patchRow(r._id, { paid_by: ev.target.value })} placeholder="—" />
                    <input className={inputClasses + ' text-right'} type="number" step="0.01" value={r.amount} onChange={(ev) => patchRow(r._id, { amount: parseFloat(ev.target.value) || 0 })} />
                    <select className={selectClasses} value={r.ccy} onChange={(ev) => patchRow(r._id, { ccy: ev.target.value })}>
                      {CCYS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input className={inputClasses} value={r.description} onChange={(ev) => patchRow(r._id, { description: ev.target.value })} />
                    <span className={`font-label text-[8px] uppercase tracking-widest px-1 py-0.5 text-center ${confStyle[r.confidence || 'med'] || confStyle.med}`}>
                      {r.confidence || 'med'}
                    </span>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 tactical-label">
                        <input type="checkbox" checked={r.keep} onChange={(ev) => patchRow(r._id, { keep: ev.target.checked })} />
                        Keep
                      </label>
                      <span className={`font-label text-[8px] uppercase tracking-widest px-1.5 py-0.5 ${confStyle[r.confidence || 'med'] || confStyle.med}`}>
                        {r.confidence || 'med'} confidence
                      </span>
                    </div>
                    <input className={inputClasses} value={r.description} onChange={(ev) => patchRow(r._id, { description: ev.target.value })} placeholder="Description" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" className={inputClasses} value={r.date} onChange={(ev) => patchRow(r._id, { date: ev.target.value })} />
                      <select className={selectClasses} value={r.direction} onChange={(ev) => patchRow(r._id, { direction: ev.target.value })}>
                        <option value="IN">IN</option>
                        <option value="OUT">OUT</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input className={inputClasses + ' text-right'} type="number" step="0.01" value={r.amount} onChange={(ev) => patchRow(r._id, { amount: parseFloat(ev.target.value) || 0 })} />
                      <select className={selectClasses} value={r.ccy} onChange={(ev) => patchRow(r._id, { ccy: ev.target.value })}>
                        {CCYS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select className={selectClasses} value={r.category} onChange={(ev) => patchRow(r._id, { category: ev.target.value })}>
                        {LEDGER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input className={inputClasses} value={r.paid_by} onChange={(ev) => patchRow(r._id, { paid_by: ev.target.value })} placeholder="Paid by" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {(phase === 'review' || phase === 'committing') && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-outline-variant/20 flex-shrink-0">
            <p className="tactical-label text-[9px] text-outline normal-case tracking-normal">
              USD rows convert at {rates.usdGbp.toFixed(4)}, EUR rows at {rates.eurGbp.toFixed(4)} on commit.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-surface-container-high text-on-surface-variant font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={commit}
                disabled={phase === 'committing' || kept.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary font-label text-xs uppercase tracking-widest hover:brightness-90 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">{phase === 'committing' ? 'hourglass_empty' : 'playlist_add_check'}</span>
                {phase === 'committing' ? 'Writing...' : `Commit ${kept.length} ${kept.length === 1 ? 'entry' : 'entries'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

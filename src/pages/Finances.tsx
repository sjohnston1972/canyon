import { useState, useEffect, useMemo } from 'react'
import { useCollection } from '@/hooks/useCollection'
import { loadFxData, type FxData, type FxHistoryPoint } from '@/lib/fx'
import type { RecordModel } from 'pocketbase'

// --- Types ---

interface FinanceCost extends RecordModel {
  name: string
  category: string
  amount: number
  ccy: string
  shared: boolean
  refundable: boolean
  due_code: string
  notes: string
  sort_order: number
}

interface LedgerEntry extends RecordModel {
  description: string
  category: string
  amount: number
  paid_by: string
  date: string
  split_type: string
  direction: string
  ccy: string
  fx_gbp: number
  amount_gbp: number
  note: string
}

interface TeamMemberRecord extends RecordModel {
  first_name: string
  last_name: string
}

// --- Constants ---

const CATEGORIES = ['Travel', 'NPS', 'Outfitter', 'Food', 'Fuel', 'Misc', 'Contingency', 'Refund'] as const
const DUE_CODES = ['IMMED', 'T-90', 'T-30', 'T-7', 'POST_TRIP'] as const
const CCYS = ['GBP', 'USD', 'EUR'] as const
const LEDGER_CATEGORIES = ['BANK', 'Lottery', 'NPS', 'Outfitter', 'Travel', 'Food', 'Fuel', 'Misc', 'Refund'] as const
const DEFAULT_FX_USD_GBP = 0.75

// --- Small UI helpers ---

const inputClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5'
const selectClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 appearance-none cursor-pointer'

function gbp(n: number): string {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function usd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function toGbp(amount: number, ccy: string, fx: number): number {
  if (ccy === 'GBP') return amount
  if (ccy === 'USD') return amount * fx
  return amount // unknown — leave as-is
}

// --- Main page ---

type Section = 'overview' | 'budget' | 'ledger' | 'paddlers'

// Compact SVG sparkline
function Sparkline({ values, width = 100, height = 24, color = 'currentColor', showRange = false }: {
  values: number[]
  width?: number
  height?: number
  color?: string
  showRange?: boolean
}) {
  if (values.length < 2) {
    return <span className="tactical-label text-[9px] text-outline">no history</span>
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = width / (values.length - 1)
  const points = values.map((v, i) => {
    const x = i * step
    const y = height - 2 - ((v - min) / range) * (height - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const path = `M ${points.join(' L ')}`
  const area = `${path} L ${width},${height} L 0,${height} Z`
  const first = values[0]
  const last = values[values.length - 1]
  const trendUp = last > first

  return (
    <div className="flex items-center gap-1.5">
      <svg width={width} height={height} className="block" style={{ color }}>
        <path d={area} fill="currentColor" opacity={0.15} />
        <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={(values.length - 1) * step} cy={height - 2 - ((last - min) / range) * (height - 4)} r={2} fill="currentColor" />
      </svg>
      {showRange && (
        <span className={`font-mono text-[9px] ${trendUp ? 'text-tertiary' : 'text-error'}`}>
          {trendUp ? '▲' : '▼'}
        </span>
      )}
    </div>
  )
}

// Compact FX card — shows current rate, sparkline of last 30 days, refresh button
function FxCard({ fxData, fx, loading, onRefresh }: {
  fxData: FxData | null
  fx: number
  loading: boolean
  onRefresh: () => void
}) {
  const history = fxData?.history ?? []
  const values = history.map((h) => h.rate)
  const first = values[0]
  const last = values[values.length - 1]
  const changePct = first && last ? ((last - first) / first) * 100 : 0
  const trendUp = changePct > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="tactical-label">USD → GBP</p>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1 hover:bg-surface-container-high text-outline disabled:opacity-30"
          title="Refresh rate"
        >
          <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-2xl font-bold text-on-surface">{fx.toFixed(4)}</p>
        {values.length > 1 && (
          <span className={`font-mono text-[10px] ${trendUp ? 'text-tertiary' : 'text-error'}`}>
            {trendUp ? '+' : ''}{changePct.toFixed(2)}%
          </span>
        )}
      </div>

      <div className={`mt-2 ${trendUp ? 'text-tertiary' : 'text-error'}`}>
        <Sparkline values={values} width={200} height={28} />
      </div>

      {fxData ? (
        <p className="tactical-label text-[9px] mt-2 normal-case tracking-normal text-outline">
          30-day trend · as of {fxData.date}
        </p>
      ) : (
        <p className="tactical-label text-[9px] mt-2 normal-case tracking-normal text-outline">
          {loading ? 'Fetching rate...' : 'Cached rate (Frankfurter unreachable)'}
        </p>
      )}
      <p className="tactical-label text-[9px] mt-1 normal-case tracking-normal text-outline">
        Source: Frankfurter / ECB · cached 6h
      </p>
    </div>
  )
}

export default function Finances() {
  const { records: costs, loading: costsLoading, create: createCost, update: updateCost, remove: removeCost } =
    useCollection<FinanceCost>('finance_costs', { sort: '+sort_order' })
  const { records: ledger, loading: ledgerLoading, create: createLedger, update: updateLedger, remove: removeLedger } =
    useCollection<LedgerEntry>('finances', { sort: '-date' })
  const { records: team } = useCollection<TeamMemberRecord>('team_members')

  const [fxData, setFxData] = useState<FxData | null>(null)
  const [fxLoading, setFxLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const fx = fxData?.rate ?? DEFAULT_FX_USD_GBP

  // Load live FX data (cached 6h)
  useEffect(() => {
    setFxLoading(true)
    loadFxData(false)
      .then(setFxData)
      .catch((err) => console.warn('FX load failed, using fallback:', err))
      .finally(() => setFxLoading(false))
  }, [])

  const refreshFx = async () => {
    setFxLoading(true)
    try {
      const fresh = await loadFxData(true)
      setFxData(fresh)
    } catch (err) {
      console.warn('FX refresh failed:', err)
    } finally {
      setFxLoading(false)
    }
  }

  const attendeeCount = Math.max(1, team.length)

  // --- Derived finance figures ---

  const derivedCosts = useMemo(() => costs.map((c) => {
    const amount_gbp = toGbp(c.amount, c.ccy || 'USD', fx)
    const per_person = c.shared ? amount_gbp / attendeeCount : amount_gbp
    return { ...c, amount_gbp, per_person }
  }), [costs, fx, attendeeCount])

  const totalBudgetGbp = derivedCosts.reduce((s, c) => s + c.amount_gbp, 0)
  const perPersonTargetGbp = derivedCosts.reduce((s, c) => s + c.per_person, 0)
  const refundableGbp = derivedCosts.filter((c) => c.refundable).reduce((s, c) => s + c.amount_gbp, 0)

  // FX-driven cost variance — what the total budget in GBP would have been at each historical FX rate.
  // Shows how much the GBP cost has moved purely due to exchange-rate swings, with today's line items.
  const costVarianceHistory: FxHistoryPoint[] = useMemo(() => {
    if (!fxData?.history?.length) return []
    const usdTotal = costs.filter((c) => (c.ccy || 'USD') === 'USD').reduce((s, c) => s + c.amount, 0)
    const gbpTotal = costs.filter((c) => c.ccy === 'GBP').reduce((s, c) => s + c.amount, 0)
    return fxData.history.map((h) => ({
      date: h.date,
      rate: usdTotal * h.rate + gbpTotal, // reuse shape, but "rate" is really "budget at this rate"
    })).map((p) => ({ date: p.date, rate: p.rate }))
  }, [fxData, costs])

  // Re-shape for sparkline: we need { date, value } points
  const costVarianceSparkline: Array<{ date: string; value: number }> = useMemo(
    () => costVarianceHistory.map((h) => ({ date: h.date, value: h.rate })),
    [costVarianceHistory]
  )

  const paidIn = ledger.filter((e) => e.direction === 'IN').reduce((s, e) => s + (e.amount_gbp || 0), 0)
  const spentOut = ledger.filter((e) => e.direction === 'OUT').reduce((s, e) => s + (e.amount_gbp || 0), 0)
  const collectionPct = perPersonTargetGbp > 0 && attendeeCount > 0
    ? Math.round((paidIn / (perPersonTargetGbp * attendeeCount)) * 100)
    : 0

  if (costsLoading || ledgerLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-outline animate-spin">progress_activity</span>
          <span className="tactical-label">Loading finances...</span>
        </div>
      </div>
    )
  }

  const sections: Array<{ key: Section; label: string; icon: string }> = [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'budget', label: 'Budget Plan', icon: 'request_quote' },
    { key: 'ledger', label: 'Ledger', icon: 'receipt_long' },
    { key: 'paddlers', label: 'Paddlers', icon: 'groups' },
  ]

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant/20 overflow-y-auto">
        <div className="p-3 space-y-1">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 font-label text-xs uppercase tracking-widest text-left transition-colors ${
                activeSection === s.key
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-base">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex-1 border-t border-outline-variant/20 p-3 mt-3">
          <FxCard fxData={fxData} fx={fx} loading={fxLoading} onRefresh={refreshFx} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
          {/* Mobile section tabs */}
          <div className="lg:hidden flex gap-1 bg-surface-container-lowest p-1 overflow-x-auto">
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 font-label text-[10px] uppercase tracking-widest transition-colors flex-shrink-0 ${
                  activeSection === s.key
                    ? 'bg-surface-container-high text-on-surface'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          <div>
            <p className="tactical-label">Financial Tracking · {attendeeCount} paddlers · FX {fx.toFixed(4)}</p>
            <h1 className="font-display text-2xl lg:text-4xl font-bold text-primary uppercase tracking-tight mt-2">
              Expedition Treasury
            </h1>
          </div>

          {/* KPI strip — always visible */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Budget (Total)"
              value={gbp(totalBudgetGbp)}
              caption={`${derivedCosts.length} line items`}
              sparkline={costVarianceSparkline.map((h) => h.value)}
              sparklineTrend
            />
            <KpiCard
              label="Per-Person Target"
              value={gbp(perPersonTargetGbp)}
              caption={`at FX ${fx.toFixed(4)}`}
              sparkline={costVarianceSparkline.map((h) => h.value / Math.max(1, attendeeCount))}
              sparklineTrend
            />
            <KpiCard label="Paid In" value={gbp(paidIn)} caption={`${collectionPct}% of target`} />
            <KpiCard label="Spent" value={gbp(spentOut)} caption={refundableGbp > 0 ? `${gbp(refundableGbp)} refundable` : '—'} />
          </div>

          {/* Mobile-only FX card — sidebar only shows on desktop */}
          <div className="lg:hidden surface-card">
            <FxCard fxData={fxData} fx={fx} loading={fxLoading} onRefresh={refreshFx} />
          </div>

          {activeSection === 'overview' && (
            <OverviewSection
              derivedCosts={derivedCosts}
              ledger={ledger}
              attendeeCount={attendeeCount}
              totalBudgetGbp={totalBudgetGbp}
              perPersonTargetGbp={perPersonTargetGbp}
              paidIn={paidIn}
              spentOut={spentOut}
            />
          )}

          {activeSection === 'budget' && (
            <BudgetSection
              costs={derivedCosts}
              fx={fx}
              attendeeCount={attendeeCount}
              createCost={createCost}
              updateCost={updateCost}
              removeCost={removeCost}
            />
          )}

          {activeSection === 'ledger' && (
            <LedgerSection
              ledger={ledger}
              team={team}
              fx={fx}
              createLedger={createLedger}
              updateLedger={updateLedger}
              removeLedger={removeLedger}
            />
          )}

          {activeSection === 'paddlers' && (
            <PaddlersSection
              team={team}
              ledger={ledger}
              perPersonTargetGbp={perPersonTargetGbp}
              sharedSpentPerPerson={
                derivedCosts.filter((c) => c.shared).reduce((s, c) => s + c.per_person, 0)
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ==========================================================================
// SECTIONS
// ==========================================================================

function KpiCard({ label, value, caption, sparkline, sparklineTrend }: {
  label: string
  value: string
  caption: string
  sparkline?: number[]
  sparklineTrend?: boolean
}) {
  const hasSpark = sparkline && sparkline.length > 1
  const first = hasSpark ? sparkline![0] : 0
  const last = hasSpark ? sparkline![sparkline!.length - 1] : 0
  const delta = hasSpark && first !== 0 ? ((last - first) / first) * 100 : 0
  const trendUp = delta > 0
  return (
    <div className="surface-card-elevated border border-outline-variant/20">
      <span className="tactical-label">{label}</span>
      <p className="font-mono text-lg sm:text-2xl font-bold mt-2 text-on-surface break-all">
        {value}
      </p>
      {hasSpark ? (
        <div className={`mt-2 ${trendUp ? 'text-tertiary' : 'text-error'}`}>
          <Sparkline values={sparkline!} width={120} height={22} />
        </div>
      ) : null}
      <div className="flex items-baseline justify-between mt-1 gap-2">
        <p className="tactical-label text-[9px] normal-case tracking-normal truncate">{caption}</p>
        {hasSpark && sparklineTrend && (
          <span className={`font-mono text-[9px] flex-shrink-0 ${trendUp ? 'text-tertiary' : 'text-error'}`}>
            {trendUp ? '+' : ''}{delta.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  )
}

function OverviewSection({ derivedCosts, ledger, attendeeCount, totalBudgetGbp, perPersonTargetGbp, paidIn, spentOut }: {
  derivedCosts: (FinanceCost & { amount_gbp: number; per_person: number })[]
  ledger: LedgerEntry[]
  attendeeCount: number
  totalBudgetGbp: number
  perPersonTargetGbp: number
  paidIn: number
  spentOut: number
}) {
  // Category breakdown
  const byCategory = new Map<string, number>()
  derivedCosts.forEach((c) => {
    byCategory.set(c.category || 'Uncategorised', (byCategory.get(c.category || 'Uncategorised') || 0) + c.amount_gbp)
  })
  const catEntries = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])
  const maxCat = Math.max(1, ...catEntries.map(([, v]) => v))

  // Recent transactions (last 5)
  const recent = [...ledger].slice(0, 5)

  const cashflowExposure = paidIn - spentOut

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Budget breakdown by category */}
      <div className="surface-card">
        <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider mb-3">
          Budget Breakdown by Category
        </h2>
        <div className="space-y-2">
          {catEntries.map(([cat, total]) => {
            const pct = Math.round((total / totalBudgetGbp) * 100)
            const widthPct = (total / maxCat) * 100
            return (
              <div key={cat}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">{cat}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-sm text-on-surface">{gbp(total)}</span>
                    <span className="font-mono text-[10px] text-outline">{pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-surface-container-highest overflow-hidden">
                  <div className="h-full bg-tertiary transition-all" style={{ width: `${widthPct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Collection progress */}
      <div className="surface-card">
        <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider mb-3">
          Collection vs Spend
        </h2>
        <div className="space-y-3">
          <StatBar label="Total Paid In" value={paidIn} max={perPersonTargetGbp * attendeeCount} color="bg-tertiary" />
          <StatBar label="Total Spent" value={spentOut} max={totalBudgetGbp} color="bg-error" />
          <div className="pt-3 border-t border-outline-variant/20 flex items-baseline justify-between">
            <span className="tactical-label">Net float (IN − OUT)</span>
            <span className={`font-mono text-lg font-bold ${cashflowExposure >= 0 ? 'text-tertiary' : 'text-error'}`}>
              {cashflowExposure >= 0 ? '+' : ''}{gbp(cashflowExposure)}
            </span>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      {recent.length > 0 && (
        <div className="surface-card">
          <h2 className="font-display text-sm font-bold text-primary uppercase tracking-wider mb-3">
            Recent Transactions
          </h2>
          <div className="space-y-0">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`font-label text-[10px] uppercase tracking-widest px-2 py-0.5 ${
                    e.direction === 'IN' ? 'bg-tertiary-container text-on-tertiary' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {e.direction || '—'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-on-surface truncate">{e.description || e.note || '(no description)'}</p>
                    <p className="tactical-label text-[9px]">{e.paid_by || '—'} · {e.category || 'Misc'} · {e.date || '—'}</p>
                  </div>
                </div>
                <span className={`font-mono text-sm flex-shrink-0 ml-3 ${e.direction === 'IN' ? 'text-tertiary' : 'text-on-surface'}`}>
                  {e.direction === 'IN' ? '+' : '−'}{gbp(e.amount_gbp || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="tactical-label">{label}</span>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm text-on-surface">{gbp(value)}</span>
          <span className="font-mono text-[10px] text-outline">of {gbp(max)} · {Math.round(pct)}%</span>
        </div>
      </div>
      <div className="h-2 bg-surface-container-highest overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// --- Budget Plan section ---

function BudgetSection({ costs, fx, attendeeCount, createCost, updateCost, removeCost }: {
  costs: (FinanceCost & { amount_gbp: number; per_person: number })[]
  fx: number
  attendeeCount: number
  createCost: (data: Partial<FinanceCost>) => Promise<FinanceCost>
  updateCost: (id: string, data: Partial<FinanceCost>) => Promise<FinanceCost>
  removeCost: (id: string) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<FinanceCost>>({})

  const startEdit = (c: FinanceCost) => {
    setEditingId(c.id)
    setDraft({
      name: c.name, category: c.category, amount: c.amount, ccy: c.ccy,
      shared: c.shared, refundable: c.refundable, due_code: c.due_code, notes: c.notes,
      sort_order: c.sort_order,
    })
  }

  const startNew = () => {
    setEditingId('__new__')
    const maxOrder = Math.max(0, ...costs.map((c) => c.sort_order || 0))
    setDraft({
      name: '', category: 'Travel', amount: 0, ccy: 'USD',
      shared: false, refundable: false, due_code: 'T-7', notes: '',
      sort_order: maxOrder + 1,
    })
  }

  const save = async () => {
    try {
      if (editingId === '__new__') await createCost(draft)
      else if (editingId) await updateCost(editingId, draft)
      setEditingId(null)
      setDraft({})
    } catch (err) {
      console.error('Failed to save cost:', err)
    }
  }

  const totalUsd = costs.filter((c) => c.ccy === 'USD').reduce((s, c) => s + c.amount, 0)
  const totalGbp = costs.reduce((s, c) => s + c.amount_gbp, 0)
  const perPersonTotal = costs.reduce((s, c) => s + c.per_person, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-primary tracking-tight">Budget Plan</h2>
        <button
          onClick={startNew}
          disabled={editingId !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest disabled:opacity-40 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add Cost
        </button>
      </div>

      <div className="surface-card p-0 overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[2fr_90px_80px_70px_70px_70px_90px_70px_70px] gap-2 px-4 py-2.5 bg-surface-container-highest border-b border-outline-variant/20 text-right">
          <span className="tactical-label text-left">Item</span>
          <span className="tactical-label">Category</span>
          <span className="tactical-label">Amount</span>
          <span className="tactical-label">CCY</span>
          <span className="tactical-label">In GBP</span>
          <span className="tactical-label">Per Person</span>
          <span className="tactical-label">Flags</span>
          <span className="tactical-label">Due</span>
          <span className="tactical-label">Actions</span>
        </div>

        {editingId === '__new__' && (
          <CostEditRow draft={draft} setDraft={setDraft} save={save} cancel={() => { setEditingId(null); setDraft({}) }} />
        )}

        {costs.map((c) => {
          const isEditing = editingId === c.id
          if (isEditing) {
            return <CostEditRow key={c.id} draft={draft} setDraft={setDraft} save={save} cancel={() => { setEditingId(null); setDraft({}) }} />
          }
          return (
            <div key={c.id}>
              {/* Desktop row */}
              <div className="hidden md:grid grid-cols-[2fr_90px_80px_70px_70px_70px_90px_70px_70px] gap-2 items-center px-4 py-2.5 border-b border-outline-variant/10 hover:bg-surface-container-high/30 transition-colors text-right">
                <div className="text-left min-w-0">
                  <p className="text-sm text-on-surface truncate">{c.name}</p>
                  {c.notes && <p className="tactical-label text-[9px] normal-case tracking-normal truncate">{c.notes}</p>}
                </div>
                <span className="tactical-label text-[10px]">{c.category || '—'}</span>
                <span className="font-mono text-sm text-on-surface">
                  {c.ccy === 'USD' ? usd(c.amount) : gbp(c.amount)}
                </span>
                <span className="font-mono text-xs text-outline">{c.ccy}</span>
                <span className="font-mono text-sm text-on-surface">{gbp(c.amount_gbp)}</span>
                <span className="font-mono text-sm text-on-surface-variant">{gbp(c.per_person)}</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {c.shared && <span className="font-label text-[8px] uppercase tracking-widest text-tertiary bg-tertiary-container/40 px-1">Group</span>}
                  {c.refundable && <span className="font-label text-[8px] uppercase tracking-widest text-on-surface-variant bg-surface-container-highest px-1">Refund</span>}
                  {!c.shared && !c.refundable && <span className="text-outline text-xs">—</span>}
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant">{c.due_code || '—'}</span>
                <div className="flex justify-end gap-1">
                  <button onClick={() => startEdit(c)} className="p-1 hover:bg-surface-container-high transition-colors" title="Edit">
                    <span className="material-symbols-outlined text-base text-outline">edit</span>
                  </button>
                  <button onClick={() => removeCost(c.id)} className="p-1 hover:bg-surface-container-high transition-colors" title="Remove">
                    <span className="material-symbols-outlined text-base text-error">close</span>
                  </button>
                </div>
              </div>

              {/* Mobile card */}
              <div className="md:hidden px-4 py-3 border-b border-outline-variant/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-on-surface">{c.name}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="tactical-label text-[9px]">{c.category}</span>
                      {c.due_code && <span className="tactical-label text-[9px] text-tertiary">· {c.due_code}</span>}
                      {c.shared && <span className="font-label text-[8px] uppercase tracking-widest text-tertiary bg-tertiary-container/40 px-1">Group</span>}
                      {c.refundable && <span className="font-label text-[8px] uppercase tracking-widest text-on-surface-variant bg-surface-container-highest px-1">Refund</span>}
                    </div>
                    {c.notes && <p className="tactical-label text-[9px] normal-case tracking-normal mt-1">{c.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="font-mono text-sm text-on-surface">{gbp(c.amount_gbp)}</span>
                    <span className="tactical-label text-[9px]">{gbp(c.per_person)} pp</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => startEdit(c)} className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-widest text-outline">
                    <span className="material-symbols-outlined text-sm">edit</span>Edit
                  </button>
                  <button onClick={() => removeCost(c.id)} className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-widest text-error">
                    <span className="material-symbols-outlined text-sm">close</span>Remove
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Totals row */}
        <div className="hidden md:grid grid-cols-[2fr_90px_80px_70px_70px_70px_90px_70px_70px] gap-2 items-center px-4 py-3 bg-surface-container-highest text-right">
          <span className="tactical-label text-left">Totals</span>
          <span />
          <span className="font-mono text-xs text-outline">{usd(totalUsd)} USD</span>
          <span />
          <span className="font-mono text-base font-bold text-primary">{gbp(totalGbp)}</span>
          <span className="font-mono text-sm text-tertiary">{gbp(perPersonTotal)}</span>
          <span />
          <span className="tactical-label text-[9px]">pp @ {attendeeCount}</span>
          <span />
        </div>
        <div className="md:hidden px-4 py-3 bg-surface-container-highest flex justify-between">
          <span className="tactical-label">Total</span>
          <div className="text-right">
            <p className="font-mono text-base font-bold text-primary">{gbp(totalGbp)}</p>
            <p className="tactical-label text-[9px]">{gbp(perPersonTotal)} pp · FX {fx.toFixed(4)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CostEditRow({ draft, setDraft, save, cancel }: {
  draft: Partial<FinanceCost>
  setDraft: (d: Partial<FinanceCost>) => void
  save: () => void
  cancel: () => void
}) {
  return (
    <>
      {/* Desktop edit form */}
      <div className="hidden md:grid grid-cols-[2fr_90px_80px_70px_70px_70px_90px_70px_70px] gap-2 items-center px-4 py-3 bg-surface-container-high/50 border-b border-outline-variant/20">
        <input className={inputClasses} placeholder="Item name" value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <select className={selectClasses} value={draft.category ?? 'Travel'} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className={`${inputClasses} text-right`} type="number" step="0.01" value={draft.amount ?? 0} onChange={(e) => setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 })} />
        <select className={selectClasses} value={draft.ccy ?? 'USD'} onChange={(e) => setDraft({ ...draft, ccy: e.target.value })}>
          {CCYS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span />
        <span />
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1 text-[9px] uppercase text-outline cursor-pointer">
            <input type="checkbox" checked={!!draft.shared} onChange={(e) => setDraft({ ...draft, shared: e.target.checked })} />Group
          </label>
          <label className="flex items-center gap-1 text-[9px] uppercase text-outline cursor-pointer">
            <input type="checkbox" checked={!!draft.refundable} onChange={(e) => setDraft({ ...draft, refundable: e.target.checked })} />Refund
          </label>
        </div>
        <select className={selectClasses} value={draft.due_code ?? 'T-7'} onChange={(e) => setDraft({ ...draft, due_code: e.target.value })}>
          <option value="">—</option>
          {DUE_CODES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <div className="flex justify-end gap-1">
          <button onClick={save} className="p-1 hover:bg-surface-container-high transition-colors" title="Save">
            <span className="material-symbols-outlined text-base text-tertiary">check</span>
          </button>
          <button onClick={cancel} className="p-1 hover:bg-surface-container-high transition-colors" title="Cancel">
            <span className="material-symbols-outlined text-base text-outline">close</span>
          </button>
        </div>
      </div>
      <div className="hidden md:grid grid-cols-[1fr] px-4 pb-3 bg-surface-container-high/50 border-b border-outline-variant/20">
        <input className={inputClasses} placeholder="Notes (optional)" value={draft.notes ?? ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
      </div>

      {/* Mobile edit form */}
      <div className="md:hidden p-4 space-y-2 bg-surface-container-high/50 border-b border-outline-variant/20">
        <input className={inputClasses} placeholder="Item name" value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClasses} type="number" step="0.01" placeholder="Amount" value={draft.amount ?? 0} onChange={(e) => setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 })} />
          <select className={selectClasses} value={draft.ccy ?? 'USD'} onChange={(e) => setDraft({ ...draft, ccy: e.target.value })}>
            {CCYS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className={selectClasses} value={draft.category ?? 'Travel'} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={selectClasses} value={draft.due_code ?? 'T-7'} onChange={(e) => setDraft({ ...draft, due_code: e.target.value })}>
            <option value="">—</option>
            {DUE_CODES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs uppercase text-outline cursor-pointer">
            <input type="checkbox" checked={!!draft.shared} onChange={(e) => setDraft({ ...draft, shared: e.target.checked })} />Group
          </label>
          <label className="flex items-center gap-2 text-xs uppercase text-outline cursor-pointer">
            <input type="checkbox" checked={!!draft.refundable} onChange={(e) => setDraft({ ...draft, refundable: e.target.checked })} />Refundable
          </label>
        </div>
        <input className={inputClasses} placeholder="Notes" value={draft.notes ?? ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-primary text-on-primary text-xs uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">check</span>Save
          </button>
          <button onClick={cancel} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-surface-container-high text-xs uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">close</span>Cancel
          </button>
        </div>
      </div>
    </>
  )
}

// --- Ledger section ---

function LedgerSection({ ledger, team, fx, createLedger, updateLedger, removeLedger }: {
  ledger: LedgerEntry[]
  team: TeamMemberRecord[]
  fx: number
  createLedger: (data: Partial<LedgerEntry>) => Promise<LedgerEntry>
  updateLedger: (id: string, data: Partial<LedgerEntry>) => Promise<LedgerEntry>
  removeLedger: (id: string) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<LedgerEntry>>({})
  const [filter, setFilter] = useState<'all' | 'IN' | 'OUT'>('all')

  const paddlerNames = team.map((m) => `${m.first_name} ${m.last_name}`.trim()).filter(Boolean).sort()

  const filtered = useMemo(() => {
    if (filter === 'all') return ledger
    return ledger.filter((e) => e.direction === filter)
  }, [ledger, filter])

  const startEdit = (e: LedgerEntry) => {
    setEditingId(e.id)
    setDraft({
      date: e.date, direction: e.direction, category: e.category,
      paid_by: e.paid_by, amount: e.amount, ccy: e.ccy,
      fx_gbp: e.fx_gbp, amount_gbp: e.amount_gbp,
      description: e.description, note: e.note,
    })
  }

  const startNew = () => {
    setEditingId('__new__')
    setDraft({
      date: new Date().toISOString().slice(0, 10),
      direction: 'IN',
      category: 'BANK',
      paid_by: '',
      amount: 0,
      ccy: 'GBP',
      fx_gbp: fx,
      amount_gbp: 0,
      description: '',
      note: '',
    })
  }

  const autoFillGbp = (d: Partial<LedgerEntry>): Partial<LedgerEntry> => {
    const amt = Number(d.amount) || 0
    const ccy = d.ccy || 'GBP'
    const fxRate = Number(d.fx_gbp) || 1
    const gbpAmount = ccy === 'GBP' ? amt : amt * fxRate
    return { ...d, amount_gbp: Number(gbpAmount.toFixed(2)) }
  }

  const save = async () => {
    try {
      const payload = autoFillGbp(draft)
      if (editingId === '__new__') await createLedger(payload)
      else if (editingId) await updateLedger(editingId, payload)
      setEditingId(null)
      setDraft({})
    } catch (err) {
      console.error('Failed to save ledger entry:', err)
    }
  }

  const totalIn = filtered.filter((e) => e.direction === 'IN').reduce((s, e) => s + (e.amount_gbp || 0), 0)
  const totalOut = filtered.filter((e) => e.direction === 'OUT').reduce((s, e) => s + (e.amount_gbp || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-xl font-bold text-primary tracking-tight">Payment Ledger</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-container-lowest p-0.5">
            {(['all', 'IN', 'OUT'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 font-label text-[10px] uppercase tracking-widest transition-colors ${
                  filter === f ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          <button
            onClick={startNew}
            disabled={editingId !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface font-label text-xs uppercase tracking-widest hover:bg-surface-container-highest disabled:opacity-40 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>Entry
          </button>
        </div>
      </div>

      <div className="surface-card p-0 overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[100px_60px_90px_140px_90px_60px_90px_1fr_70px] gap-2 px-4 py-2.5 bg-surface-container-highest border-b border-outline-variant/20">
          <span className="tactical-label">Date</span>
          <span className="tactical-label">Dir</span>
          <span className="tactical-label">Category</span>
          <span className="tactical-label">Paid By</span>
          <span className="tactical-label text-right">Amount</span>
          <span className="tactical-label">CCY</span>
          <span className="tactical-label text-right">Amt GBP</span>
          <span className="tactical-label">Note</span>
          <span className="tactical-label">Actions</span>
        </div>

        {editingId === '__new__' && (
          <LedgerEditRow draft={draft} setDraft={setDraft} save={save} cancel={() => { setEditingId(null); setDraft({}) }} paddlerNames={paddlerNames} />
        )}

        {filtered.map((e) => {
          const isEditing = editingId === e.id
          if (isEditing) {
            return <LedgerEditRow key={e.id} draft={draft} setDraft={setDraft} save={save} cancel={() => { setEditingId(null); setDraft({}) }} paddlerNames={paddlerNames} />
          }
          return (
            <div key={e.id}>
              {/* Desktop row */}
              <div className="hidden md:grid grid-cols-[100px_60px_90px_140px_90px_60px_90px_1fr_70px] gap-2 items-center px-4 py-2.5 border-b border-outline-variant/10 hover:bg-surface-container-high/30 transition-colors">
                <span className="font-mono text-xs text-on-surface-variant">{e.date || '—'}</span>
                <span className={`font-label text-[10px] uppercase tracking-widest px-2 py-0.5 w-fit ${
                  e.direction === 'IN' ? 'bg-tertiary-container text-on-tertiary' : 'bg-surface-container-high text-on-surface-variant'
                }`}>
                  {e.direction || '—'}
                </span>
                <span className="tactical-label text-[10px]">{e.category || '—'}</span>
                <span className="font-mono text-xs text-on-surface truncate">{e.paid_by || '—'}</span>
                <span className="font-mono text-sm text-on-surface text-right">
                  {e.ccy === 'USD' ? usd(e.amount || 0) : gbp(e.amount || 0)}
                </span>
                <span className="font-mono text-[10px] text-outline">{e.ccy || '—'}</span>
                <span className={`font-mono text-sm text-right ${e.direction === 'IN' ? 'text-tertiary' : 'text-on-surface'}`}>
                  {e.direction === 'IN' ? '+' : '−'}{gbp(e.amount_gbp || 0)}
                </span>
                <span className="font-body text-xs text-on-surface-variant truncate">{e.description || e.note || '—'}</span>
                <div className="flex justify-end gap-1">
                  <button onClick={() => startEdit(e)} className="p-1 hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-base text-outline">edit</span></button>
                  <button onClick={() => removeLedger(e.id)} className="p-1 hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-base text-error">close</span></button>
                </div>
              </div>

              {/* Mobile card */}
              <div className="md:hidden px-4 py-3 border-b border-outline-variant/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-label text-[9px] uppercase tracking-widest px-1.5 py-0.5 ${
                        e.direction === 'IN' ? 'bg-tertiary-container text-on-tertiary' : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        {e.direction || '—'}
                      </span>
                      <span className="tactical-label text-[9px]">{e.category || ''}</span>
                      <span className="tactical-label text-[9px]">{e.date || ''}</span>
                    </div>
                    <p className="text-sm text-on-surface mt-1 truncate">{e.description || e.note || '(no description)'}</p>
                    <p className="tactical-label text-[9px] mt-0.5">{e.paid_by || '—'}</p>
                  </div>
                  <span className={`font-mono text-sm flex-shrink-0 ${e.direction === 'IN' ? 'text-tertiary' : 'text-on-surface'}`}>
                    {e.direction === 'IN' ? '+' : '−'}{gbp(e.amount_gbp || 0)}
                  </span>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => startEdit(e)} className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-widest text-outline"><span className="material-symbols-outlined text-sm">edit</span>Edit</button>
                  <button onClick={() => removeLedger(e.id)} className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-widest text-error"><span className="material-symbols-outlined text-sm">close</span>Remove</button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Totals */}
        <div className="hidden md:grid grid-cols-[100px_60px_90px_140px_90px_60px_90px_1fr_70px] gap-2 items-center px-4 py-3 bg-surface-container-highest">
          <span className="tactical-label">Filtered</span>
          <span />
          <span />
          <span />
          <span />
          <span />
          <div className="flex flex-col items-end">
            <span className="font-mono text-xs text-tertiary">IN {gbp(totalIn)}</span>
            <span className="font-mono text-xs text-on-surface">OUT {gbp(totalOut)}</span>
          </div>
          <span className="tactical-label text-[9px]">Net {gbp(totalIn - totalOut)}</span>
          <span />
        </div>
        <div className="md:hidden px-4 py-3 bg-surface-container-highest flex justify-between">
          <div>
            <p className="tactical-label">In / Out</p>
            <p className="font-mono text-xs text-tertiary">+{gbp(totalIn)}</p>
            <p className="font-mono text-xs text-on-surface">−{gbp(totalOut)}</p>
          </div>
          <div className="text-right">
            <p className="tactical-label">Net</p>
            <p className="font-mono text-base font-bold text-primary">{gbp(totalIn - totalOut)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LedgerEditRow({ draft, setDraft, save, cancel, paddlerNames }: {
  draft: Partial<LedgerEntry>
  setDraft: (d: Partial<LedgerEntry>) => void
  save: () => void
  cancel: () => void
  paddlerNames: string[]
}) {
  // Compute previewed GBP amount
  const previewGbp = (() => {
    const amt = Number(draft.amount) || 0
    const ccy = draft.ccy || 'GBP'
    const fxRate = Number(draft.fx_gbp) || 1
    return ccy === 'GBP' ? amt : amt * fxRate
  })()

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:grid grid-cols-[100px_60px_90px_140px_90px_60px_90px_1fr_70px] gap-2 items-center px-4 py-3 bg-surface-container-high/50 border-b border-outline-variant/20">
        <input type="date" className={inputClasses} value={draft.date ?? ''} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <select className={selectClasses} value={draft.direction ?? 'IN'} onChange={(e) => setDraft({ ...draft, direction: e.target.value })}>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
        <select className={selectClasses} value={draft.category ?? 'BANK'} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
          {LEDGER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className={inputClasses} list="paddler-names" placeholder="Name / payee" value={draft.paid_by ?? ''} onChange={(e) => setDraft({ ...draft, paid_by: e.target.value })} />
        <input className={`${inputClasses} text-right`} type="number" step="0.01" value={draft.amount ?? 0} onChange={(e) => setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 })} />
        <select className={selectClasses} value={draft.ccy ?? 'GBP'} onChange={(e) => setDraft({ ...draft, ccy: e.target.value })}>
          {CCYS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className={`${inputClasses} text-right`} type="number" step="0.01" placeholder={`auto (${gbp(previewGbp)})`} value={draft.amount_gbp ?? ''} onChange={(e) => setDraft({ ...draft, amount_gbp: parseFloat(e.target.value) || 0 })} />
        <input className={inputClasses} placeholder="Description / note" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <div className="flex justify-end gap-1">
          <button onClick={save} className="p-1 hover:bg-surface-container-high"><span className="material-symbols-outlined text-base text-tertiary">check</span></button>
          <button onClick={cancel} className="p-1 hover:bg-surface-container-high"><span className="material-symbols-outlined text-base text-outline">close</span></button>
        </div>
      </div>
      <div className="hidden md:grid grid-cols-[100px_60px_90px_140px_90px_60px_90px_1fr_70px] gap-2 items-center px-4 pb-3 bg-surface-container-high/50 border-b border-outline-variant/20">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span className="tactical-label text-[9px] text-right">FX</span>
        <input className={inputClasses} type="number" step="0.0001" placeholder="FX (if not GBP)" value={draft.fx_gbp ?? ''} onChange={(e) => setDraft({ ...draft, fx_gbp: parseFloat(e.target.value) || 0 })} />
        <span />
      </div>
      <datalist id="paddler-names">
        {paddlerNames.map((n) => <option key={n} value={n} />)}
      </datalist>

      {/* Mobile */}
      <div className="md:hidden p-4 space-y-2 bg-surface-container-high/50 border-b border-outline-variant/20">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className={inputClasses} value={draft.date ?? ''} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          <select className={selectClasses} value={draft.direction ?? 'IN'} onChange={(e) => setDraft({ ...draft, direction: e.target.value })}>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
        </div>
        <input className={inputClasses} list="paddler-names" placeholder="Name / payee" value={draft.paid_by ?? ''} onChange={(e) => setDraft({ ...draft, paid_by: e.target.value })} />
        <select className={selectClasses} value={draft.category ?? 'BANK'} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
          {LEDGER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClasses} type="number" step="0.01" placeholder="Amount" value={draft.amount ?? 0} onChange={(e) => setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 })} />
          <select className={selectClasses} value={draft.ccy ?? 'GBP'} onChange={(e) => setDraft({ ...draft, ccy: e.target.value })}>
            {CCYS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClasses} type="number" step="0.0001" placeholder="FX" value={draft.fx_gbp ?? ''} onChange={(e) => setDraft({ ...draft, fx_gbp: parseFloat(e.target.value) || 0 })} />
          <input className={inputClasses} type="number" step="0.01" placeholder={`GBP (auto ${gbp(previewGbp)})`} value={draft.amount_gbp ?? ''} onChange={(e) => setDraft({ ...draft, amount_gbp: parseFloat(e.target.value) || 0 })} />
        </div>
        <input className={inputClasses} placeholder="Description / note" value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-primary text-on-primary text-xs uppercase tracking-widest"><span className="material-symbols-outlined text-sm">check</span>Save</button>
          <button onClick={cancel} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-surface-container-high text-xs uppercase tracking-widest"><span className="material-symbols-outlined text-sm">close</span>Cancel</button>
        </div>
      </div>
    </>
  )
}

// --- Paddlers (Personal Summary) section ---

function PaddlersSection({ team, ledger, perPersonTargetGbp, sharedSpentPerPerson }: {
  team: TeamMemberRecord[]
  ledger: LedgerEntry[]
  perPersonTargetGbp: number
  sharedSpentPerPerson: number
}) {
  // Compute per-paddler paid in from ledger (match by name)
  const paidByName = new Map<string, number>()
  ledger.forEach((e) => {
    if (e.direction === 'IN' && e.paid_by) {
      paidByName.set(e.paid_by.trim().toLowerCase(), (paidByName.get(e.paid_by.trim().toLowerCase()) || 0) + (e.amount_gbp || 0))
    }
  })

  const rows = team.map((m) => {
    const fullName = `${m.first_name} ${m.last_name}`.trim()
    const paid = paidByName.get(fullName.toLowerCase()) || 0
    const balance = paid - sharedSpentPerPerson
    const pct = perPersonTargetGbp > 0 ? Math.min(100, (paid / perPersonTargetGbp) * 100) : 0
    return { name: fullName, paid, balance, pct }
  }).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-xl font-bold text-primary tracking-tight">Per-Paddler Summary</h2>
        <div className="flex gap-4 tactical-label">
          <span>Target: {gbp(perPersonTargetGbp)}</span>
          <span>Shared spent / pp: {gbp(sharedSpentPerPerson)}</span>
        </div>
      </div>

      <div className="surface-card p-0 overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_110px_110px_110px_1fr] gap-2 px-4 py-2.5 bg-surface-container-highest border-b border-outline-variant/20">
          <span className="tactical-label">Name</span>
          <span className="tactical-label text-right">Paid In</span>
          <span className="tactical-label text-right">Share of Spent</span>
          <span className="tactical-label text-right">Balance</span>
          <span className="tactical-label">Progress</span>
        </div>

        {rows.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="tactical-label">No paddlers in the team manifest yet. Add people on the /team page.</p>
          </div>
        )}

        {rows.map((r) => (
          <div key={r.name}>
            {/* Desktop */}
            <div className="hidden md:grid grid-cols-[1fr_110px_110px_110px_1fr] gap-2 items-center px-4 py-3 border-b border-outline-variant/10 hover:bg-surface-container-high/30 transition-colors">
              <span className="font-label text-xs uppercase tracking-widest text-on-surface">{r.name || '—'}</span>
              <span className="font-mono text-sm text-on-surface text-right">{gbp(r.paid)}</span>
              <span className="font-mono text-sm text-on-surface-variant text-right">{gbp(sharedSpentPerPerson)}</span>
              <span className={`font-mono text-sm text-right font-bold ${r.balance >= 0 ? 'text-tertiary' : 'text-error'}`}>
                {r.balance >= 0 ? '+' : ''}{gbp(r.balance)}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-surface-container-highest overflow-hidden">
                  <div className={`h-full transition-all ${r.pct >= 100 ? 'bg-tertiary' : 'bg-primary'}`} style={{ width: `${r.pct}%` }} />
                </div>
                <span className="font-mono text-[10px] text-outline w-10 text-right">{Math.round(r.pct)}%</span>
              </div>
            </div>

            {/* Mobile */}
            <div className="md:hidden px-4 py-3 border-b border-outline-variant/10">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label text-sm uppercase tracking-widest text-on-surface">{r.name || '—'}</span>
                <span className={`font-mono text-sm font-bold ${r.balance >= 0 ? 'text-tertiary' : 'text-error'}`}>
                  {r.balance >= 0 ? '+' : ''}{gbp(r.balance)}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-1.5 bg-surface-container-highest overflow-hidden">
                  <div className={`h-full transition-all ${r.pct >= 100 ? 'bg-tertiary' : 'bg-primary'}`} style={{ width: `${r.pct}%` }} />
                </div>
                <span className="font-mono text-[9px] text-outline w-8 text-right">{Math.round(r.pct)}%</span>
              </div>
              <div className="flex justify-between tactical-label text-[9px] normal-case tracking-normal">
                <span>Paid: {gbp(r.paid)}</span>
                <span>Target: {gbp(perPersonTargetGbp)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

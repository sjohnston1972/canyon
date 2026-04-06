import { useState } from 'react'
import { useCollection } from '@/hooks/useCollection'
import type { RecordModel } from 'pocketbase'

interface FinanceRecord extends RecordModel {
  description: string
  category: string
  amount: number
  paid_by: string
  date: string
  split_type: string
}

const CATEGORIES = ['permits', 'transport', 'food', 'gear', 'medical', 'comms', 'other'] as const

const TEAM_MEMBERS = [
  'E. Mackenzie', 'K. Vance', 'S. Chen', 'J. Miller', 'D. Hayes', 'M. Torres',
]

const inputClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5'
const selectClasses =
  'w-full bg-surface-container-lowest text-on-surface font-mono text-sm border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none px-2 py-1.5 appearance-none cursor-pointer'

export default function Finances() {
  const { records: expenses, loading, create, update, remove } = useCollection<FinanceRecord>('finances')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<FinanceRecord>>({})
  const [saving, setSaving] = useState(false)

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const totalBudget = 8500
  const remaining = totalBudget - totalSpent
  const perPerson = totalSpent / 16

  function startEdit(expense: FinanceRecord) {
    setEditDraft({
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      paid_by: expense.paid_by,
      date: expense.date,
      split_type: expense.split_type,
    })
    setEditingId(expense.id)
  }

  function addExpense() {
    setEditDraft({
      description: '',
      category: 'other',
      amount: 0,
      paid_by: '',
      date: new Date().toISOString().slice(0, 10),
      split_type: 'equal',
    })
    setEditingId('__new__')
  }

  async function saveExpense() {
    setSaving(true)
    try {
      if (editingId === '__new__') {
        await create(editDraft)
      } else if (editingId) {
        await update(editingId, editDraft)
      }
    } catch (err) {
      console.error('Failed to save expense', err)
    } finally {
      setSaving(false)
      setEditingId(null)
      setEditDraft({})
    }
  }

  async function removeExpense(id: string) {
    try {
      await remove(id)
    } catch (err) {
      console.error('Failed to remove expense', err)
    }
    if (editingId === id) setEditingId(null)
  }

  // Calculate per-person balance (who paid vs fair share)
  function getBalances() {
    const paid: Record<string, number> = {}
    TEAM_MEMBERS.forEach((m) => (paid[m] = 0))
    expenses.forEach((e) => {
      if (paid[e.paid_by] !== undefined) {
        paid[e.paid_by] += e.amount || 0
      }
    })
    const fairShare = totalSpent / TEAM_MEMBERS.length
    return TEAM_MEMBERS.map((name) => ({
      name,
      paid: paid[name],
      owes: fairShare,
      balance: paid[name] - fairShare,
    }))
  }

  const balances = getBalances()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-outline animate-spin">progress_activity</span>
          <span className="tactical-label">Loading finances...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-surface-container-lowest p-4 border-r border-outline-variant/20 hidden lg:block">
        <div className="space-y-2">
          {['Budget Overview', 'Expense Ledger', 'Balance Sheet', 'Settlements'].map((item) => (
            <button
              key={item}
              className="w-full flex items-center gap-3 px-3 py-2 bg-surface-container-low text-on-surface-variant text-sm hover:bg-surface-container-high transition-colors text-left"
            >
              <span className="material-symbols-outlined text-base">
                {item === 'Budget Overview' ? 'account_balance' : item === 'Expense Ledger' ? 'receipt_long' : item === 'Balance Sheet' ? 'balance' : 'handshake'}
              </span>
              {item}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <p className="tactical-label mb-2">Financial Tracking | 16 Members</p>
        <h1 className="font-display text-4xl font-bold text-primary uppercase tracking-tight mb-8">
          Expedition Finances
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { label: 'Total Budget', value: totalBudget, prefix: '$' },
            { label: 'Total Spent', value: totalSpent, prefix: '$' },
            { label: 'Remaining', value: remaining, prefix: '$' },
            { label: 'Per Person Share', value: perPerson, prefix: '$' },
          ].map((card) => (
            <div key={card.label} className="surface-card-elevated border border-outline-variant/20">
              <span className="tactical-label">{card.label}</span>
              <p className={`font-mono text-2xl font-bold mt-2 ${card.value < 0 ? 'text-error' : 'text-on-surface'}`}>
                {card.prefix}{card.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>

        {/* Expense Table */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-primary tracking-tight">
              Expense Ledger
            </h2>
            <button
              onClick={addExpense}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-2 border border-outline-variant/40 hover:border-outline-variant hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-base text-tertiary">add</span>
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Add Expense</span>
            </button>
          </div>

          <div className="border border-outline-variant/20 overflow-hidden">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-[1fr_120px_100px_120px_100px_80px_60px] bg-surface-container-lowest px-4 py-2.5 border-b border-outline-variant/20">
              <span className="tactical-label">Description</span>
              <span className="tactical-label">Category</span>
              <span className="tactical-label text-right">Amount</span>
              <span className="tactical-label">Paid By</span>
              <span className="tactical-label">Date</span>
              <span className="tactical-label">Split</span>
              <span className="tactical-label text-right">Actions</span>
            </div>

            {editingId === '__new__' && (
              <>
                {/* Desktop new row */}
                <div className="hidden md:grid grid-cols-[1fr_120px_100px_120px_100px_80px_60px] px-4 py-3 border-b border-outline-variant/10 bg-surface-container-high/50 items-center">
                  <input className={inputClasses} value={editDraft.description ?? ''} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} placeholder="Description" />
                  <select className={selectClasses} value={editDraft.category ?? 'other'} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}>
                    {CATEGORIES.map((c) => (<option key={c} value={c}>{c.toUpperCase()}</option>))}
                  </select>
                  <input className={`${inputClasses} text-right`} type="number" value={editDraft.amount ?? 0} onChange={(e) => setEditDraft({ ...editDraft, amount: parseFloat(e.target.value) || 0 })} />
                  <input className={inputClasses} value={editDraft.paid_by ?? ''} onChange={(e) => setEditDraft({ ...editDraft, paid_by: e.target.value })} placeholder="Name" />
                  <input className={inputClasses} type="date" value={editDraft.date ?? ''} onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })} />
                  <select className={selectClasses} value={editDraft.split_type ?? 'equal'} onChange={(e) => setEditDraft({ ...editDraft, split_type: e.target.value })}>
                    <option value="equal">EQUAL</option>
                    <option value="custom">CUSTOM</option>
                  </select>
                  <div className="flex justify-end gap-1">
                    <button onClick={saveExpense} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors" title="Save">
                      <span className="material-symbols-outlined text-base text-tertiary">check</span>
                    </button>
                  </div>
                </div>
                {/* Mobile new card */}
                <div className="md:hidden px-4 py-3 border-b border-outline-variant/10 bg-surface-container-high/50 flex flex-col gap-2">
                  <input className={inputClasses} value={editDraft.description ?? ''} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} placeholder="Description" />
                  <input className={`${inputClasses} text-right`} type="number" value={editDraft.amount ?? 0} onChange={(e) => setEditDraft({ ...editDraft, amount: parseFloat(e.target.value) || 0 })} placeholder="Amount" />
                  <input className={inputClasses} value={editDraft.paid_by ?? ''} onChange={(e) => setEditDraft({ ...editDraft, paid_by: e.target.value })} placeholder="Paid by" />
                  <select className={selectClasses} value={editDraft.category ?? 'other'} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}>
                    {CATEGORIES.map((c) => (<option key={c} value={c}>{c.toUpperCase()}</option>))}
                  </select>
                  <input className={inputClasses} type="date" value={editDraft.date ?? ''} onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })} />
                  <select className={selectClasses} value={editDraft.split_type ?? 'equal'} onChange={(e) => setEditDraft({ ...editDraft, split_type: e.target.value })}>
                    <option value="equal">EQUAL</option>
                    <option value="custom">CUSTOM</option>
                  </select>
                  <div className="flex justify-end">
                    <button onClick={saveExpense} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors" title="Save">
                      <span className="material-symbols-outlined text-base text-tertiary">check</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {expenses.map((expense) => {
              const isEditing = editingId === expense.id
              return (
                <div key={expense.id}>
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[1fr_120px_100px_120px_100px_80px_60px] px-4 py-3 border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors items-center">
                    {isEditing ? (
                      <>
                        <input className={inputClasses} value={editDraft.description ?? ''} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} placeholder="Description" />
                        <select className={selectClasses} value={editDraft.category ?? 'other'} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}>
                          {CATEGORIES.map((c) => (<option key={c} value={c}>{c.toUpperCase()}</option>))}
                        </select>
                        <input className={`${inputClasses} text-right`} type="number" value={editDraft.amount ?? 0} onChange={(e) => setEditDraft({ ...editDraft, amount: parseFloat(e.target.value) || 0 })} />
                        <input className={inputClasses} value={editDraft.paid_by ?? ''} onChange={(e) => setEditDraft({ ...editDraft, paid_by: e.target.value })} placeholder="Name" />
                        <input className={inputClasses} type="date" value={editDraft.date ?? ''} onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })} />
                        <select className={selectClasses} value={editDraft.split_type ?? 'equal'} onChange={(e) => setEditDraft({ ...editDraft, split_type: e.target.value })}>
                          <option value="equal">EQUAL</option>
                          <option value="custom">CUSTOM</option>
                        </select>
                        <div className="flex justify-end gap-1">
                          <button onClick={saveExpense} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors" title="Done">
                            <span className="material-symbols-outlined text-base text-tertiary">check</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="font-body text-sm text-on-surface">{expense.description}</span>
                        <span className="inline-block px-2 py-0.5 bg-surface-container text-on-surface-variant font-label text-[10px] uppercase tracking-widest w-fit">
                          {expense.category}
                        </span>
                        <span className="font-mono text-sm text-on-surface text-right">
                          ${(expense.amount || 0).toFixed(2)}
                        </span>
                        <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                          {expense.paid_by}
                        </span>
                        <span className="font-mono text-xs text-on-surface-variant">{expense.date}</span>
                        <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                          {expense.split_type}
                        </span>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(expense)} className="p-1 hover:bg-surface-container-high transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-base text-outline">edit</span>
                          </button>
                          <button onClick={() => removeExpense(expense.id)} className="p-1 hover:bg-surface-container-high transition-colors" title="Remove">
                            <span className="material-symbols-outlined text-base text-error">close</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Mobile card */}
                  <div className="md:hidden px-4 py-3 border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <input className={inputClasses} value={editDraft.description ?? ''} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} placeholder="Description" />
                        <input className={`${inputClasses} text-right`} type="number" value={editDraft.amount ?? 0} onChange={(e) => setEditDraft({ ...editDraft, amount: parseFloat(e.target.value) || 0 })} placeholder="Amount" />
                        <input className={inputClasses} value={editDraft.paid_by ?? ''} onChange={(e) => setEditDraft({ ...editDraft, paid_by: e.target.value })} placeholder="Paid by" />
                        <select className={selectClasses} value={editDraft.category ?? 'other'} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}>
                          {CATEGORIES.map((c) => (<option key={c} value={c}>{c.toUpperCase()}</option>))}
                        </select>
                        <input className={inputClasses} type="date" value={editDraft.date ?? ''} onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })} />
                        <select className={selectClasses} value={editDraft.split_type ?? 'equal'} onChange={(e) => setEditDraft({ ...editDraft, split_type: e.target.value })}>
                          <option value="equal">EQUAL</option>
                          <option value="custom">CUSTOM</option>
                        </select>
                        <div className="flex justify-end">
                          <button onClick={saveExpense} disabled={saving} className="p-1 hover:bg-surface-container-high transition-colors" title="Done">
                            <span className="material-symbols-outlined text-base text-tertiary">check</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-body text-sm text-on-surface">{expense.description}</span>
                            <span className="inline-block px-2 py-0.5 bg-surface-container text-on-surface-variant font-label text-[10px] uppercase tracking-widest flex-shrink-0">
                              {expense.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="font-mono text-sm text-on-surface font-bold">
                              ${(expense.amount || 0).toFixed(2)}
                            </span>
                            <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
                              {expense.paid_by}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => startEdit(expense)} className="p-1 hover:bg-surface-container-high transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-base text-outline">edit</span>
                          </button>
                          <button onClick={() => removeExpense(expense.id)} className="p-1 hover:bg-surface-container-high transition-colors" title="Remove">
                            <span className="material-symbols-outlined text-base text-error">close</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Balance Sheet */}
        <section>
          <h2 className="font-display text-xl font-bold text-primary tracking-tight mb-4">
            Balance Sheet
          </h2>
          <p className="tactical-label mb-4">Per-person settlement based on equal split across {TEAM_MEMBERS.length} tracked members</p>

          <div className="border border-outline-variant/20 overflow-hidden">
            {/* Desktop header */}
            <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px] bg-surface-container-lowest px-4 py-2.5 border-b border-outline-variant/20">
              <span className="tactical-label">Member</span>
              <span className="tactical-label text-right">Paid</span>
              <span className="tactical-label text-right">Fair Share</span>
              <span className="tactical-label text-right">Balance</span>
            </div>

            {balances.map((b) => (
              <div key={b.name}>
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px] px-4 py-3 border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors">
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface">{b.name}</span>
                  <span className="font-mono text-sm text-on-surface text-right">${b.paid.toFixed(2)}</span>
                  <span className="font-mono text-sm text-on-surface-variant text-right">${b.owes.toFixed(2)}</span>
                  <span className={`font-mono text-sm text-right font-bold ${b.balance >= 0 ? 'text-tertiary' : 'text-error'}`}>
                    {b.balance >= 0 ? '+' : ''}{b.balance.toFixed(2)}
                  </span>
                </div>
                {/* Mobile card */}
                <div className="md:hidden px-4 py-3 border-b border-outline-variant/10 hover:bg-surface-container-high/50 transition-colors flex items-center justify-between">
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface">{b.name}</span>
                  <span className={`font-mono text-sm font-bold ${b.balance >= 0 ? 'text-tertiary' : 'text-error'}`}>
                    {b.balance >= 0 ? '+' : ''}{b.balance.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

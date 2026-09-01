// Shared, pure currency-conversion helpers used by the Finances page, the AI ledger
// importer, and the Hance chatbot's ledger-fix tool. No side effects at import time —
// safe to unit test directly.

/** The subset of live FX rates needed to convert GBP/USD/EUR amounts to GBP. */
export interface FxRates {
  usdGbp: number
  eurGbp: number
}

/**
 * The GBP conversion rate for a given currency code.
 * GBP always returns 1. An unrecognised currency logs a console warning and
 * falls back to a rate of 1 (i.e. the amount is left unconverted) rather than
 * throwing, so a bad/unknown ccy value never crashes a render or a commit.
 */
export function fxRateFor(ccy: string, rates: FxRates): number {
  switch (ccy) {
    case 'GBP':
      return 1
    case 'USD':
      return rates.usdGbp
    case 'EUR':
      return rates.eurGbp
    default:
      console.warn(`fxRateFor: unknown currency "${ccy}" — defaulting to rate 1`)
      return 1
  }
}

/**
 * Convert an amount in the given currency to GBP, rounded to 2 decimal places.
 */
export function toGbp(amount: number, ccy: string, rates: FxRates): number {
  const rate = fxRateFor(ccy, rates)
  return Math.round(amount * rate * 100) / 100
}

// --- Display formatters ---

export function gbp(n: number): string {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function usd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function eur(n: number): string {
  return `€${n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format a raw (pre-conversion) amount with the symbol matching its own currency,
 * so a EUR row doesn't display with a £ or $ sign.
 */
export function fmtByCcy(n: number, ccy: string): string {
  if (ccy === 'USD') return usd(n)
  if (ccy === 'EUR') return eur(n)
  return gbp(n)
}

/**
 * Ledger row shape needed by autoFillGbp — just the three fields it reads/writes.
 * Kept generic (rather than importing the page's LedgerEntry type) so this stays a
 * dependency-free, independently testable helper.
 */
export interface LedgerAmountFields {
  amount?: number
  ccy?: string
  fx_gbp?: number
  amount_gbp?: number
}

/**
 * Recompute amount_gbp from amount/ccy/fx_gbp on a ledger draft. GBP rows pass the
 * amount straight through; other currencies multiply by the row's own fx_gbp rate
 * (defaulting to 1 if unset). Result is rounded to 2 decimal places.
 */
export function autoFillGbp<T extends LedgerAmountFields>(d: T): T & { amount_gbp: number } {
  const amt = Number(d.amount) || 0
  const ccy = d.ccy || 'GBP'
  const fxRate = Number(d.fx_gbp) || 1
  const gbpAmount = ccy === 'GBP' ? amt : amt * fxRate
  return { ...d, amount_gbp: Number(gbpAmount.toFixed(2)) }
}

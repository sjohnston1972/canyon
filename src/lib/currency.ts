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

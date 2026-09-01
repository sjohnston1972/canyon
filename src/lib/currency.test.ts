import { describe, it, expect } from 'vitest'
import { fxRateFor, toGbp, gbp, usd, eur, fmtByCcy, autoFillGbp, type FxRates } from '@/lib/currency'

const rates: FxRates = { usdGbp: 0.75, eurGbp: 0.85 }

describe('fxRateFor', () => {
  it.each([
    ['GBP', 1],
    ['USD', 0.75],
    ['EUR', 0.85],
  ])('returns the right rate for %s', (ccy, expected) => {
    expect(fxRateFor(ccy, rates)).toBe(expected)
  })

  it('falls back to a rate of 1 for an unknown currency, without throwing', () => {
    expect(() => fxRateFor('JPY', rates)).not.toThrow()
    expect(fxRateFor('JPY', rates)).toBe(1)
  })
})

describe('toGbp', () => {
  it.each([
    // amount, ccy, expected
    [100, 'GBP', 100],
    [100, 'USD', 75],
    [100, 'EUR', 85],
    [0, 'USD', 0],
    [33.333, 'USD', 25], // rounds to 2dp: 33.333 * 0.75 = 24.99975 -> 25
  ])('converts %d %s to GBP as %d', (amount, ccy, expected) => {
    expect(toGbp(amount, ccy, rates)).toBe(expected)
  })

  it('leaves an unrecognised currency amount unconverted (rate defaults to 1)', () => {
    expect(toGbp(50, 'JPY', rates)).toBe(50)
  })

  it('rounds to 2 decimal places', () => {
    expect(toGbp(10.005, 'USD', rates)).toBe(7.5)
  })
})

describe('display formatters', () => {
  it('formats GBP with a £ sign and 2 decimal places', () => {
    expect(gbp(1234.5)).toBe('£1,234.50')
  })

  it('formats USD with a $ sign and 2 decimal places', () => {
    expect(usd(1234.5)).toBe('$1,234.50')
  })

  it('formats EUR with a € sign and 2 decimal places', () => {
    expect(eur(1234.5)).toBe('€1,234.50')
  })

  it.each([
    ['USD', '$10.00'],
    ['EUR', '€10.00'],
    ['GBP', '£10.00'],
    ['', '£10.00'], // unrecognised/empty ccy falls back to GBP formatting
  ])('fmtByCcy formats %s amounts with the matching symbol', (ccy, expected) => {
    expect(fmtByCcy(10, ccy)).toBe(expected)
  })
})

describe('autoFillGbp', () => {
  it('passes a GBP amount straight through', () => {
    const result = autoFillGbp({ amount: 42, ccy: 'GBP', fx_gbp: 0.75 })
    expect(result.amount_gbp).toBe(42)
  })

  it('multiplies a non-GBP amount by its fx_gbp rate', () => {
    const result = autoFillGbp({ amount: 100, ccy: 'USD', fx_gbp: 0.75 })
    expect(result.amount_gbp).toBe(75)
  })

  it('rounds amount_gbp to 2 decimal places', () => {
    const result = autoFillGbp({ amount: 33.333, ccy: 'USD', fx_gbp: 0.75 })
    expect(result.amount_gbp).toBe(25) // 33.333 * 0.75 = 24.99975 -> toFixed(2) -> 25.00
  })

  it('defaults ccy to GBP and fx_gbp to 1 when unset', () => {
    const result = autoFillGbp({ amount: 10 })
    expect(result.amount_gbp).toBe(10)
  })

  it('treats a missing/NaN amount as 0', () => {
    const result = autoFillGbp({ ccy: 'USD', fx_gbp: 0.75 })
    expect(result.amount_gbp).toBe(0)
  })

  it('preserves the other fields on the input object', () => {
    const result = autoFillGbp({ amount: 5, ccy: 'GBP', description: 'Rope' })
    expect(result.description).toBe('Rope')
  })
})

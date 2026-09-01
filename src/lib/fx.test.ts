import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseFrankfurterResponse } from '@/lib/fx'

// Mock the pocketbase client so loadFxData's cache reads/writes never hit a real server.
const getFullList = vi.fn()
const update = vi.fn()
const create = vi.fn()

vi.mock('@/lib/pocketbase', () => ({
  default: {
    collection: () => ({
      getFullList,
      update,
      create,
    }),
  },
}))

// Import after the mock is registered so fx.ts picks up the mocked pocketbase module.
const { loadFxData } = await import('@/lib/fx')

const SIX_HOURS_MS = 1000 * 60 * 60 * 6

function makeCachedFxData(overrides: Partial<{ fetchedAt: number }> = {}) {
  return {
    usdGbp: 0.75,
    eurGbp: 0.85,
    rate: 0.75,
    date: '2026-08-30',
    history: [{ date: '2026-08-30', rate: 0.75 }],
    fetchedAt: Date.now(),
    ...overrides,
  }
}

function frankfurterResponse() {
  return {
    amount: 1,
    base: 'GBP',
    start_date: '2026-08-01',
    end_date: '2026-08-30',
    rates: {
      '2026-08-29': { USD: 1.3, EUR: 1.15 },
      '2026-08-30': { USD: 1.32, EUR: 1.18 },
    },
  }
}

describe('parseFrankfurterResponse', () => {
  it('inverts GBP-based rates into USD/EUR -> GBP', () => {
    const result = parseFrankfurterResponse(frankfurterResponse())
    expect(result.usdGbp).toBeCloseTo(1 / 1.32, 10)
    expect(result.eurGbp).toBeCloseTo(1 / 1.18, 10)
  })

  it('uses the latest date in the response for rate/date fields', () => {
    const result = parseFrankfurterResponse(frankfurterResponse())
    expect(result.date).toBe('2026-08-30')
  })

  it('builds a USD-only history sorted by date', () => {
    const result = parseFrankfurterResponse(frankfurterResponse())
    expect(result.history).toEqual([
      { date: '2026-08-29', rate: 1 / 1.3 },
      { date: '2026-08-30', rate: 1 / 1.32 },
    ])
  })

  it('throws when the response has no rates at all', () => {
    expect(() => parseFrankfurterResponse({ rates: {} })).toThrow('no rates')
  })

  it('throws when the latest date is missing USD or EUR', () => {
    expect(() =>
      parseFrankfurterResponse({ rates: { '2026-08-30': { USD: 1.3 } } })
    ).toThrow('missing USD or EUR')
  })
})

describe('loadFxData', () => {
  beforeEach(() => {
    getFullList.mockReset()
    update.mockReset()
    create.mockReset()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the cached value without fetching when the cache is fresh (< 6h old)', async () => {
    const cached = makeCachedFxData({ fetchedAt: Date.now() - 1000 })
    getFullList.mockResolvedValueOnce([{ id: 'rec1', key: 'fx_data_v2', value: cached }])

    const result = await loadFxData()

    expect(result).toEqual(cached)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches fresh data when the cache is stale (> 6h old)', async () => {
    const stale = makeCachedFxData({ fetchedAt: Date.now() - (SIX_HOURS_MS + 1000) })
    getFullList
      .mockResolvedValueOnce([{ id: 'rec1', key: 'fx_data_v2', value: stale }]) // read for cache check
      .mockResolvedValueOnce([{ id: 'rec1', key: 'fx_data_v2', value: stale }]) // read before writing back
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => frankfurterResponse(),
    })
    update.mockResolvedValueOnce({})

    const result = await loadFxData()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.date).toBe('2026-08-30')
    expect(update).toHaveBeenCalledWith('rec1', { value: expect.objectContaining({ date: '2026-08-30' }) })
  })

  it('fetches fresh data on a totally empty cache and creates a new setting record', async () => {
    getFullList
      .mockResolvedValueOnce([]) // no cache row yet
      .mockResolvedValueOnce([]) // still none when writing back
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => frankfurterResponse(),
    })
    create.mockResolvedValueOnce({})

    const result = await loadFxData()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({ key: 'fx_data_v2', value: expect.objectContaining({ date: '2026-08-30' }) })
    expect(result.usdGbp).toBeCloseTo(1 / 1.32, 10)
  })

  it('propagates a Frankfurter HTTP error when there is no usable cache', async () => {
    getFullList.mockResolvedValueOnce([])
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 503 })

    await expect(loadFxData()).rejects.toThrow('Frankfurter HTTP 503')
  })

  it('forceRefresh bypasses a fresh cache and fetches anyway', async () => {
    const cached = makeCachedFxData({ fetchedAt: Date.now() - 1000 })
    getFullList
      .mockResolvedValueOnce([{ id: 'rec1', key: 'fx_data_v2', value: cached }])
      .mockResolvedValueOnce([{ id: 'rec1', key: 'fx_data_v2', value: cached }])
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => frankfurterResponse(),
    })
    update.mockResolvedValueOnce({})

    await loadFxData(true)

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to a fresh fetch when the PocketBase cache read itself throws', async () => {
    getFullList.mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce([])
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => frankfurterResponse(),
    })
    create.mockResolvedValueOnce({})

    const result = await loadFxData()

    expect(result.date).toBe('2026-08-30')
  })
})

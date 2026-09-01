import { useState, useEffect, useCallback, useRef } from 'react'
import pb from '@/lib/pocketbase'
import type { RecordModel } from 'pocketbase'

interface UseCollectionOptions {
  sort?: string
  filter?: string
  expand?: string
}

/**
 * Builds the PocketBase list-query params for a set of hook options. Shared
 * by the initial load and refresh() so both always request the same sort,
 * filter, and expand — exported for unit testing.
 */
export function buildListParams(options: UseCollectionOptions): Record<string, unknown> {
  const params: Record<string, unknown> = {
    // Disable PocketBase's automatic request cancellation — without this, two
    // hooks fetching the same collection at the same time will cancel each other.
    requestKey: null,
  }
  if (options.sort) params.sort = options.sort
  if (options.filter) params.filter = options.filter
  if (options.expand) params.expand = options.expand
  return params
}

interface SortField {
  field: string
  desc: boolean
}

function parseSort(sort?: string): SortField[] {
  if (!sort) return []
  return sort
    .split(',')
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      if (raw.startsWith('-')) return { field: raw.slice(1), desc: true }
      if (raw.startsWith('+')) return { field: raw.slice(1), desc: false }
      return { field: raw, desc: false }
    })
}

/**
 * Compares two records per a PocketBase-style sort string: comma-separated
 * fields, each optionally prefixed with `-` (descending) or `+` (ascending,
 * the default). Exported so the comparator can be unit tested directly.
 */
export function compareRecords<T extends RecordModel>(a: T, b: T, sort?: string): number {
  for (const { field, desc } of parseSort(sort)) {
    const av = a[field]
    const bv = b[field]
    const cmp =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''))
    if (cmp !== 0) return desc ? -cmp : cmp
  }
  return 0
}

/**
 * Returns `records` with `record` inserted (or, if an id match already
 * exists, repositioned) so the array stays ordered per `sort`. Without a
 * `sort`, the existing entry is dropped and the new one appended, matching
 * the hook's pre-existing append-on-create behavior. Exported for unit
 * testing.
 */
export function upsertSorted<T extends RecordModel>(records: T[], record: T, sort?: string): T[] {
  const withoutExisting = records.filter((r) => r.id !== record.id)
  if (!sort) return [...withoutExisting, record]
  const index = withoutExisting.findIndex((r) => compareRecords(r, record, sort) > 0)
  if (index === -1) return [...withoutExisting, record]
  return [...withoutExisting.slice(0, index), record, ...withoutExisting.slice(index)]
}

export function useCollection<T extends RecordModel>(
  collectionName: string,
  options: UseCollectionOptions = {}
) {
  const [records, setRecords] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Fetch + subscribe on mount
  useEffect(() => {
    // Effect-local flag — unlike a shared ref, this can't be reset to `false`
    // by a later remount, so a stale subscription can never pass the guard below.
    let cancelled = false
    let refetchTimer: ReturnType<typeof setTimeout> | null = null

    async function load() {
      try {
        setLoading(true)
        const params = buildListParams(optionsRef.current)
        const result = await pb.collection(collectionName).getFullList<T>(params as Record<string, string>)
        if (!cancelled) {
          setRecords(result)
          setError(null)
        }
      } catch (err: unknown) {
        // Auto-cancel errors are noise — ignore them
        const isAutoCancel = err && typeof err === 'object' && 'isAbort' in err && (err as { isAbort: boolean }).isAbort
        if (!isAutoCancel) {
          console.error(`Error fetching ${collectionName}:`, err)
          if (!cancelled) {
            setError(`Failed to load ${collectionName}`)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    // PocketBase's filter grammar isn't worth parsing client-side, so a hook
    // configured with a `filter` re-fetches (debounced, to coalesce bursts of
    // events) instead of trying to patch matching/non-matching records locally.
    function scheduleFilteredRefetch() {
      if (refetchTimer) clearTimeout(refetchTimer)
      refetchTimer = setTimeout(() => {
        refetchTimer = null
        load()
      }, 200)
    }

    // Real-time subscription
    let unsubFn: (() => void) | null = null
    pb.collection(collectionName)
      .subscribe<T>('*', (e) => {
        if (cancelled) return

        if (optionsRef.current.filter) {
          scheduleFilteredRefetch()
          return
        }

        setRecords((prev) => {
          switch (e.action) {
            case 'create':
              if (prev.some((r) => r.id === e.record.id)) return prev
              return optionsRef.current.sort
                ? upsertSorted(prev, e.record, optionsRef.current.sort)
                : [...prev, e.record]
            case 'update':
              return optionsRef.current.sort
                ? upsertSorted(prev, e.record, optionsRef.current.sort)
                : prev.map((r) => (r.id === e.record.id ? e.record : r))
            case 'delete':
              return prev.filter((r) => r.id !== e.record.id)
            default:
              return prev
          }
        })
      })
      .then((unsub) => {
        // Cleanup may already have run by the time this resolves (guaranteed on
        // every StrictMode double-mount) — tear the subscription straight back
        // down instead of stashing an unsub function nothing will ever call.
        if (cancelled) {
          unsub()
        } else {
          unsubFn = unsub
        }
      })
      .catch((err) => {
        console.error(`Error subscribing to ${collectionName}:`, err)
      })

    return () => {
      cancelled = true
      if (refetchTimer) clearTimeout(refetchTimer)
      if (unsubFn) unsubFn()
    }
  }, [collectionName])

  const create = useCallback(
    async (data: Partial<T>) => {
      const record = await pb.collection(collectionName).create<T>(data)
      return record
    },
    [collectionName]
  )

  const update = useCallback(
    async (id: string, data: Partial<T>) => {
      const record = await pb.collection(collectionName).update<T>(id, data)
      return record
    },
    [collectionName]
  )

  const remove = useCallback(
    async (id: string) => {
      await pb.collection(collectionName).delete(id)
    },
    [collectionName]
  )

  const refresh = useCallback(async () => {
    try {
      const params = buildListParams(optionsRef.current)
      const result = await pb.collection(collectionName).getFullList<T>(params as Record<string, string>)
      setRecords(result)
      setError(null)
    } catch (err) {
      console.error(`Error refreshing ${collectionName}:`, err)
      setError(`Failed to load ${collectionName}`)
    }
  }, [collectionName])

  return { records, loading, error, create, update, remove, refresh }
}

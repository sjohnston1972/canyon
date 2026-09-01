import { useState, useEffect, useCallback, useRef } from 'react'
import pb from '@/lib/pocketbase'
import type { RecordModel } from 'pocketbase'

interface UseCollectionOptions {
  sort?: string
  filter?: string
  expand?: string
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

    async function load() {
      try {
        setLoading(true)
        const params: Record<string, unknown> = {
          // Disable PocketBase's automatic request cancellation — without this, two
          // hooks fetching the same collection at the same time will cancel each other.
          requestKey: null,
        }
        if (optionsRef.current.sort) params.sort = optionsRef.current.sort
        if (optionsRef.current.filter) params.filter = optionsRef.current.filter
        if (optionsRef.current.expand) params.expand = optionsRef.current.expand
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

    // Real-time subscription
    let unsubFn: (() => void) | null = null
    pb.collection(collectionName)
      .subscribe<T>('*', (e) => {
        if (cancelled) return
        setRecords((prev) => {
          switch (e.action) {
            case 'create':
              if (prev.some((r) => r.id === e.record.id)) return prev
              return [...prev, e.record]
            case 'update':
              return prev.map((r) => (r.id === e.record.id ? e.record : r))
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
      const params: Record<string, unknown> = { requestKey: null }
      if (optionsRef.current.filter) params.filter = optionsRef.current.filter
      const result = await pb.collection(collectionName).getFullList<T>(params as Record<string, string>)
      setRecords(result)
    } catch (err) {
      console.error(`Error refreshing ${collectionName}:`, err)
    }
  }, [collectionName])

  return { records, loading, error, create, update, remove, refresh }
}

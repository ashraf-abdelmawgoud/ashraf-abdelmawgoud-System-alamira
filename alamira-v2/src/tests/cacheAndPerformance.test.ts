import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cacheService } from '@/services/cacheService'

describe('CacheService & In-Flight Request Deduplication', () => {
  beforeEach(() => {
    cacheService.clear()
    vi.restoreAllMocks()
  })

  it('1. Caches fetcher results within TTL', async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: ['item1', 'item2'] })
    const key = cacheService.createKey('products', { category: 'all' }, 'ADMIN')

    // First call: cache miss -> fetcher executed
    const result1 = await cacheService.getOrFetch(key, fetcher, 5000)
    expect(result1).toEqual({ items: ['item1', 'item2'] })
    expect(fetcher).toHaveBeenCalledTimes(1)

    // Second call: cache hit -> returns cached data without calling fetcher
    const result2 = await cacheService.getOrFetch(key, fetcher, 5000)
    expect(result2).toEqual({ items: ['item1', 'item2'] })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('2. Coalesces concurrent in-flight requests into a single promise', async () => {
    let callCount = 0
    const slowFetcher = vi.fn(async () => {
      callCount++
      await new Promise((res) => setTimeout(res, 50))
      return { count: callCount }
    })

    const key = cacheService.createKey('categories')

    // Fire 3 simultaneous requests for the same key
    const [res1, res2, res3] = await Promise.all([
      cacheService.getOrFetch(key, slowFetcher, 5000),
      cacheService.getOrFetch(key, slowFetcher, 5000),
      cacheService.getOrFetch(key, slowFetcher, 5000),
    ])

    expect(slowFetcher).toHaveBeenCalledTimes(1)
    expect(res1).toEqual({ count: 1 })
    expect(res2).toEqual({ count: 1 })
    expect(res3).toEqual({ count: 1 })
  })

  it('3. Selectively invalidates namespace without touching other namespaces', async () => {
    const keyProd = cacheService.createKey('products', {}, 'ADMIN')
    const keyCust = cacheService.createKey('customers', {}, 'ADMIN')

    const fetchProd = vi.fn().mockResolvedValue(['p1'])
    const fetchCust = vi.fn().mockResolvedValue(['c1'])

    await cacheService.getOrFetch(keyProd, fetchProd, 5000)
    await cacheService.getOrFetch(keyCust, fetchCust, 5000)

    expect(fetchProd).toHaveBeenCalledTimes(1)
    expect(fetchCust).toHaveBeenCalledTimes(1)

    // Invalidate products only
    cacheService.invalidateNamespace('products')

    // Fetching products should re-trigger fetcher
    await cacheService.getOrFetch(keyProd, fetchProd, 5000)
    expect(fetchProd).toHaveBeenCalledTimes(2)

    // Fetching customers should still hit cache
    await cacheService.getOrFetch(keyCust, fetchCust, 5000)
    expect(fetchCust).toHaveBeenCalledTimes(1)
  })

  it('4. Enforces strict role and user key isolation', () => {
    const adminKey = cacheService.createKey('products', undefined, 'ADMIN', 'user-admin-1')
    const operatorKey = cacheService.createKey('products', undefined, 'SALES_OPERATOR', 'user-op-2')

    expect(adminKey).not.toEqual(operatorKey)
    expect(adminKey).toContain('ADMIN')
    expect(operatorKey).toContain('SALES_OPERATOR')
  })

  it('5. Clears all entries and in-flight state completely on auth logout', async () => {
    const key = cacheService.createKey('invoices', {}, 'ADMIN')
    const fetcher = vi.fn().mockResolvedValue(['inv1'])

    await cacheService.getOrFetch(key, fetcher, 5000)
    expect(fetcher).toHaveBeenCalledTimes(1)

    // User logs out
    cacheService.clear()

    // Subsequent call must fetch afresh
    await cacheService.getOrFetch(key, fetcher, 5000)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('6. In-flight requests started before logout CANNOT repopulate cache after account switch', async () => {
    let resolveSlowRequest: (val: string[]) => void = () => {}
    const slowFetcher = vi.fn(() => {
      return new Promise<string[]>((res) => {
        resolveSlowRequest = res
      })
    })

    const key = cacheService.createKey('products', undefined, 'ADMIN', 'user-1')

    // 1. User 1 initiates slow request
    const pendingCall = cacheService.getOrFetch(key, slowFetcher, 5000)

    // 2. User logs out while request is still pending
    cacheService.clear()
    expect(cacheService.get(key)).toBeNull()

    // 3. Request finishes late after logout
    resolveSlowRequest(['sensitive-admin-data'])
    await pendingCall

    // 4. Verify cache remains EMPTY and was NOT repopulated by the late-resolving promise!
    expect(cacheService.get(key)).toBeNull()
  })

  it('7. In-flight requests started before namespace invalidation CANNOT repopulate with stale data', async () => {
    let resolveStale: (val: string[]) => void = () => {}
    const staleFetcher = vi.fn(() => {
      return new Promise<string[]>((res) => {
        resolveStale = res
      })
    })

    const key = cacheService.createKey('products', { category: 'tools' }, 'ADMIN')

    // 1. Slow fetch starts
    const pendingCall = cacheService.getOrFetch(key, staleFetcher, 5000)

    // 2. A mutation occurs (e.g. product updated) -> namespace invalidated
    cacheService.invalidateNamespace('products')

    // 3. Stale fetch resolves late
    resolveStale(['old-stale-product'])
    await pendingCall

    // 4. Verify cache was NOT repopulated with old data
    expect(cacheService.get(key)).toBeNull()
  })

  it('8. Cross-role isolation guarantees SALES_OPERATOR never reads ADMIN cached data', async () => {
    const adminKey = cacheService.createKey('products', undefined, 'ADMIN', 'user-admin')
    const operatorKey = cacheService.createKey('products', undefined, 'SALES_OPERATOR', 'user-sales')

    const adminData = [{ id: 'p1', name: 'قاطع ثلاثي', purchase_price: 120, current_stock: 50 }]
    const operatorData = [{ id: 'p1', name: 'قاطع ثلاثي', purchase_price: 0, current_stock: 0 }]

    const fetchAdmin = vi.fn().mockResolvedValue(adminData)
    const fetchOperator = vi.fn().mockResolvedValue(operatorData)

    // ADMIN loads products
    const resAdmin = await cacheService.getOrFetch<typeof adminData>(adminKey, fetchAdmin, 5000)
    expect(resAdmin[0].purchase_price).toBe(120)
    expect(resAdmin[0].current_stock).toBe(50)

    // SALES_OPERATOR queries products
    const resOperator = await cacheService.getOrFetch<typeof operatorData>(operatorKey, fetchOperator, 5000)
    expect(resOperator[0].purchase_price).toBe(0)
    expect(resOperator[0].current_stock).toBe(0)

    // Verify operator was never given admin's cache
    expect(cacheService.get(operatorKey)).toEqual(operatorData)
    expect(cacheService.get(operatorKey)).not.toEqual(adminData)
  })
})

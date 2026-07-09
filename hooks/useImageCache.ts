/**
 * Simple module-level in-memory image cache.
 *
 * The Map lives outside the hook so the cache persists across component
 * mount / unmount cycles for the lifetime of the JS runtime.
 *
 * Requirements: 12.5
 */
const imageCache = new Map<string, string>()

export interface UseImageCacheReturn {
  /** Retrieve a previously cached URI by cache key. */
  getCachedUri: (key: string) => string | undefined
  /** Store a resolved URI in the cache under the given key. */
  setCachedUri: (key: string, uri: string) => void
  /** Evict all entries from the cache. */
  clearCache: () => void
  /** Current number of cached entries. */
  cacheSize: number
}

/**
 * Hook that exposes read/write access to the module-level image URI cache.
 *
 * Because the underlying Map is module-scoped, all callers of this hook
 * share the same cache — mutations in one component are immediately visible
 * to all others.
 *
 * @example
 * const { getCachedUri, setCachedUri } = useImageCache()
 *
 * const cached = getCachedUri(avatarUrl)
 * if (!cached) {
 *   const { uri } = await optimizeImage(avatarUrl)
 *   setCachedUri(avatarUrl, uri)
 * }
 */
export function useImageCache(): UseImageCacheReturn {
  const getCachedUri = (key: string): string | undefined => imageCache.get(key)

  const setCachedUri = (key: string, uri: string): void => {
    imageCache.set(key, uri)
  }

  const clearCache = (): void => {
    imageCache.clear()
  }

  return {
    getCachedUri,
    setCachedUri,
    clearCache,
    cacheSize: imageCache.size,
  }
}

import type { ScoredContradiction } from '@/types/contradiction';

interface CacheEntry {
  contradictions: ScoredContradiction[];
  warnings: string[];
  timestamp: number;
}

// In-memory cache with TTL
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 100; // Prevent memory bloat

/**
 * Simple hash function for cache keys
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate cache key from transcript pair
 */
export function getCacheKey(transcriptA: string, transcriptB: string): string {
  const normalized = `${transcriptA.trim()}|||${transcriptB.trim()}`;
  return hashString(normalized);
}

/**
 * Get cached result if available and not expired
 */
export function getCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry;
}

/**
 * Store result in cache
 */
export function setCache(
  key: string,
  contradictions: ScoredContradiction[],
  warnings: string[]
): void {
  // Evict oldest if at capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }

  cache.set(key, {
    contradictions,
    warnings,
    timestamp: Date.now(),
  });
}

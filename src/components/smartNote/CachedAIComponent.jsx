import { useState, useEffect } from "react";

// Global cache for AI responses
const aiCache = new Map();

/**
 * Higher-order component that adds smart caching to AI components
 * Prevents redundant API calls for the same inputs
 */
export function withAICache(Component, getCacheKey) {
  return function CachedComponent(props) {
    const [cachedData, setCachedData] = useState(null);
    const [isFromCache, setIsFromCache] = useState(false);

    const cacheKey = getCacheKey(props);
    const TTL = 300000; // 5 minutes

    useEffect(() => {
      // Check cache on mount or when cache key changes
      const cached = aiCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < TTL) {
        setCachedData(cached.data);
        setIsFromCache(true);
      } else {
        setIsFromCache(false);
      }
    }, [cacheKey]);

    const onDataFetched = (data) => {
      aiCache.set(cacheKey, { data, timestamp: Date.now() });
      setCachedData(data);
      setIsFromCache(false);
    };

    return (
      <Component
        {...props}
        cachedData={cachedData}
        isFromCache={isFromCache}
        onDataFetched={onDataFetched}
      />
    );
  };
}

/**
 * Hook for using AI cache directly in components
 */
export function useAICache(cacheKey, ttl = 300000) {
  const [cachedData, setCachedData] = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    const cached = aiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      setCachedData(cached.data);
      setIsFromCache(true);
    } else {
      setCachedData(null);
      setIsFromCache(false);
    }
  }, [cacheKey, ttl]);

  const setCacheData = (data) => {
    aiCache.set(cacheKey, { data, timestamp: Date.now() });
    setCachedData(data);
    setIsFromCache(false);
  };

  const clearCache = () => {
    aiCache.delete(cacheKey);
    setCachedData(null);
    setIsFromCache(false);
  };

  return { cachedData, isFromCache, setCacheData, clearCache };
}

/**
 * Clear all cached AI responses (useful when patient changes)
 */
export function clearAllAICache() {
  aiCache.clear();
}

/**
 * Clear cache entries older than TTL
 */
export function cleanupExpiredCache(ttl = 300000) {
  const now = Date.now();
  for (const [key, value] of aiCache.entries()) {
    if (now - value.timestamp > ttl) {
      aiCache.delete(key);
    }
  }
}
import { useState, useCallback, useEffect } from 'react';

export interface CachedAnalysis {
  id: string;
  timestamp: number;
  mode: string;
  description: string;
  imageData?: string;
}

const CACHE_KEY = 'blind-vision-cache';
const MAX_CACHE_SIZE = 20;

export const useOfflineCache = () => {
  const [cache, setCache] = useState<CachedAnalysis[]>([]);

  // Load cache from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        setCache(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }, []);

  // Save to localStorage whenever cache changes
  useEffect(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }, [cache]);

  const addToCache = useCallback((analysis: Omit<CachedAnalysis, 'id' | 'timestamp'>) => {
    const newEntry: CachedAnalysis = {
      ...analysis,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setCache(prev => {
      const updated = [newEntry, ...prev].slice(0, MAX_CACHE_SIZE);
      return updated;
    });

    return newEntry.id;
  }, []);

  const getFromCache = useCallback((id: string): CachedAnalysis | undefined => {
    return cache.find(entry => entry.id === id);
  }, [cache]);

  const clearCache = useCallback(() => {
    setCache([]);
    localStorage.removeItem(CACHE_KEY);
  }, []);

  const getCacheSize = useCallback(() => {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      return stored ? (new Blob([stored]).size / 1024).toFixed(2) : '0';
    } catch {
      return '0';
    }
  }, []);

  return {
    cache,
    addToCache,
    getFromCache,
    clearCache,
    getCacheSize,
  };
};

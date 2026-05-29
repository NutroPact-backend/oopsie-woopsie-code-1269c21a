// @ts-nocheck
// Lite-mode: localStorage-only, no network. Caps to 12 items.
import { useEffect, useState } from 'react';

const KEY = 'nutropact:recently-viewed';
const MAX = 12;

export interface RVItem {
  id: string;
  slug: string;
  name: string;
  image?: string;
  price?: number;
  ts: number;
}

function read(): RVItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(x => x && x.slug && x.name) : [];
  } catch {
    return [];
  }
}

function write(items: RVItem[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX))); } catch {}
  try { window.dispatchEvent(new CustomEvent('rv:changed')); } catch {}
}

export function trackRecentlyViewed(item: Omit<RVItem, 'ts'>) {
  if (!item || !item.slug || !item.name) return;
  const items = read().filter(x => x.slug !== item.slug);
  items.unshift({ ...item, ts: Date.now() });
  write(items);
}

export function useRecentlyViewed(excludeSlug?: string): RVItem[] {
  const [items, setItems] = useState<RVItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(read().filter(x => x.slug !== excludeSlug));
    sync();
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) sync(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('rv:changed', sync as any);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('rv:changed', sync as any);
    };
  }, [excludeSlug]);
  return items;
}

export function clearRecentlyViewed() { write([]); }

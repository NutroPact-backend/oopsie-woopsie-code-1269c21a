import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trackSiteEvent } from '@/lib/track-event';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  comparePrice?: number;
  image: string;
  slug: string;
  category?: string;
  pixels?: any;
}

interface WishlistStore {
  items: WishlistItem[];
  add: (item: WishlistItem) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
  count: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        if (get().items.find((i) => i.id === item.id)) return;
        set({ items: [item, ...get().items] });
        trackSiteEvent('wishlist_add', {
          product_id: item.id,
          product_name: item.name,
          value: item.price,
          meta: { category: item.category, slug: item.slug },
        });
      },
      remove: (id) => {
        const it = get().items.find((i) => i.id === id);
        set({ items: get().items.filter((i) => i.id !== id) });
        if (it) trackSiteEvent('wishlist_remove', { product_id: it.id, product_name: it.name });
      },
      has: (id) => !!get().items.find((i) => i.id === id),
      clear: () => set({ items: [] }),
      count: () => get().items.length,
    }),
    { name: 'nutropact-wishlist' },
  ),
);

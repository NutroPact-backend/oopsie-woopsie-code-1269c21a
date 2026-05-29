// @ts-nocheck
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProductPixels } from '@/lib/analytics';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  flavor: string;
  size: string;
  quantity: number;
  category?: string;
  pixels?: ProductPixels;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string, flavor: string, size: string) => void;
  updateQuantity: (id: string, flavor: string, size: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const items = get().items;
        const existing = items.find(i => i.id === item.id && i.flavor === item.flavor && i.size === item.size);
        if (existing) {
          set({ items: items.map(i => i.id === item.id && i.flavor === item.flavor && i.size === item.size ? { ...i, quantity: i.quantity + item.quantity } : i) });
        } else {
          set({ items: [...items, item] });
        }
      },
      removeItem: (id, flavor, size) => set({ items: get().items.filter(i => !(i.id === id && i.flavor === flavor && i.size === size)) }),
      updateQuantity: (id, flavor, size, quantity) => set({ items: get().items.map(i => i.id === id && i.flavor === flavor && i.size === size ? { ...i, quantity } : i) }),
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0)
    }),
    { name: 'nutropact-cart' }
  )
);

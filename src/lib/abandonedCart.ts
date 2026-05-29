// @ts-nocheck
// Lightweight abandoned-cart tracker.
// Snapshots cart to Supabase when user lands on checkout / cart edits.
// Lite-mode: debounced, single insert per session, no network on small carts.

import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'np_abandoned_cart_id';
let inflight: Promise<void> | null = null;
let lastPayloadHash = '';

type Snapshot = {
  user_id: string | null;
  customer_email: string;
  customer_phone: string;
  customer_name: string;
  items: any[];
  subtotal: number;
};

function hashPayload(p: Snapshot) {
  return `${p.user_id ?? ''}|${p.customer_email}|${p.items.length}|${p.subtotal}`;
}

export async function trackAbandonedCart(s: Snapshot): Promise<void> {
  if (!s.items?.length || s.subtotal <= 0) return;
  if (!s.user_id && !s.customer_email && !s.customer_phone) return; // can't recover

  const h = hashPayload(s);
  if (h === lastPayloadHash) return;
  lastPayloadHash = h;

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const existingId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      const payload = {
        user_id: s.user_id,
        customer_email: s.customer_email || '',
        customer_phone: s.customer_phone || '',
        customer_name: s.customer_name || '',
        items: s.items.map((i: any) => ({
          id: i.id || i.productId,
          name: i.name,
          quantity: i.quantity || 1,
          price: i.price || 0,
          image: i.image || '',
        })),
        subtotal: s.subtotal,
        item_count: s.items.reduce((n: number, i: any) => n + (i.quantity || 1), 0),
        status: 'active' as const,
        last_activity_at: new Date().toISOString(),
      };

      if (existingId) {
        const { error } = await supabase
          .from('abandoned_carts')
          .update(payload)
          .eq('id', existingId);
        if (error && /no rows|0 rows/i.test(error.message)) {
          // row was cleaned up; create fresh
          localStorage.removeItem(STORAGE_KEY);
          await insertNew(payload);
        }
      } else {
        await insertNew(payload);
      }
    } catch {
      // swallow — tracking failure must never break checkout
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

async function insertNew(payload: any) {
  const { data, error } = await supabase
    .from('abandoned_carts')
    .insert(payload)
    .select('id')
    .maybeSingle();
  if (!error && data?.id && typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, data.id);
  }
}

export function clearAbandonedCart() {
  if (typeof window === 'undefined') return;
  const id = localStorage.getItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
  lastPayloadHash = '';
  if (id) {
    supabase
      .from('abandoned_carts')
      .update({ status: 'recovered', recovered_at: new Date().toISOString() })
      .eq('id', id)
      .then(() => {});
  }
}

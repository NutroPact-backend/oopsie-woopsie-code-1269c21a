// @ts-nocheck
import { createServerFn } from '@tanstack/react-start';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function ensureAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  if (!data) throw new Error('Forbidden');
}

// ── Backup & Export ─────────────────────────────────────────────────────
const EXPORTABLE: Record<string, string> = {
  orders: '*',
  products: '*',
  profiles: 'id,name,email,phone,referral_code,created_at',
  user_roles: '*',
  categories: '*',
  brands: '*',
  coupons: '*',
  blog_posts: '*',
  marketing_settings: '*',
  utm_campaigns: '*',
  marketing_events: '*',
  invoices: '*',
  abandoned_carts: '*',
  contact_submissions: '*',
  admin_audit_log: '*',
};

export const exportTable = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { table: string; limit?: number }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const cols = EXPORTABLE[data.table];
    if (!cols) throw new Error('Table not allowed');
    const limit = Math.min(Math.max(data.limit || 5000, 1), 20000);
    const { data: rows, error } = await supabaseAdmin
      .from(data.table as any).select(cols).limit(limit);
    if (error) throw new Error(error.message);
    return { table: data.table, count: rows?.length || 0, rows: rows || [] };
  });

export const exportFullSnapshot = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const snapshot: Record<string, any> = { exported_at: new Date().toISOString() };
    const counts: Record<string, number> = {};
    for (const t of Object.keys(EXPORTABLE)) {
      const { data } = await supabaseAdmin.from(t as any).select(EXPORTABLE[t]).limit(5000);
      snapshot[t] = data || [];
      counts[t] = data?.length || 0;
    }
    return { snapshot, counts };
  });

export const listExportableTables = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const counts: Record<string, number> = {};
    for (const t of Object.keys(EXPORTABLE)) {
      const { count } = await supabaseAdmin.from(t as any).select('*', { count: 'exact', head: true });
      counts[t] = count || 0;
    }
    return { tables: Object.keys(EXPORTABLE), counts };
  });

// ── Bulk Order Ops ──────────────────────────────────────────────────────
export const bulkUpdateOrderStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderNumbers: string[]; status: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    if (!data.orderNumbers?.length) return { ok: true, updated: 0 };
    const { error, data: updated } = await supabaseAdmin
      .from('orders').update({ order_status: data.status, updated_at: new Date().toISOString() })
      .in('order_number', data.orderNumbers).select('order_number');
    if (error) throw new Error(error.message);
    await supabaseAdmin.from('admin_audit_log').insert({
      actor_user_id: context.userId, action: 'bulk_order_status_update',
      details: { count: data.orderNumbers.length, status: data.status, orders: data.orderNumbers.slice(0, 50) },
    });
    return { ok: true, updated: updated?.length || 0 };
  });

export const getOrderTimeline = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderNumber: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const [order, tracking, invoice, mods] = await Promise.all([
      supabaseAdmin.from('orders').select('*').eq('order_number', data.orderNumber).maybeSingle(),
      supabaseAdmin.from('order_tracking').select('*').eq('order_number', data.orderNumber).maybeSingle(),
      supabaseAdmin.from('invoices').select('*').eq('order_number', data.orderNumber).maybeSingle(),
      supabaseAdmin.from('order_modify_requests').select('*').eq('order_number', data.orderNumber).order('created_at', { ascending: false }),
    ]);
    const events: any[] = [];
    const o = order.data;
    if (o) {
      events.push({ t: o.created_at, type: 'placed', label: 'Order placed', meta: { total: o.total } });
      if (o.payment_status === 'paid') events.push({ t: o.updated_at, type: 'paid', label: 'Payment received' });
      if (['confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(o.order_status)) {
        events.push({ t: o.updated_at, type: o.order_status, label: `Status: ${o.order_status.replace(/_/g, ' ')}` });
      }
    }
    if (invoice.data) events.push({ t: invoice.data.issued_at, type: 'invoice', label: `Invoice ${invoice.data.invoice_number}` });
    if (tracking.data) {
      events.push({ t: tracking.data.created_at, type: 'tracking', label: `Shipped via ${tracking.data.courier || 'courier'}`, meta: { awb: tracking.data.awb_number } });
      const hist = Array.isArray(tracking.data.status_history) ? tracking.data.status_history : [];
      hist.forEach((h: any) => events.push({ t: h.at || h.timestamp, type: 'checkpoint', label: h.status || h.label, meta: { note: h.note } }));
    }
    (mods.data || []).forEach((m: any) =>
      events.push({ t: m.created_at, type: 'modify_' + m.status, label: `Modify request: ${m.status}` }));
    events.sort((a, b) => new Date(a.t || 0).getTime() - new Date(b.t || 0).getTime());
    return { order: o, events };
  });

// ── A/B Experiments runtime ─────────────────────────────────────────────
// A/B telemetry — public but sanitised. We refuse client-supplied userId /
// orderNumber to prevent data poisoning, and rate-limit per session.
export const recordAbExposure = createServerFn({ method: 'POST' })
  .inputValidator((d: { experimentId: string; variant: string; sessionId?: string }) => ({
    experimentId: String(d.experimentId || '').slice(0, 80),
    variant: String(d.variant || '').slice(0, 80),
    sessionId: d.sessionId ? String(d.sessionId).slice(0, 64) : undefined,
  }))
  .handler(async ({ data }) => {
    if (!data.experimentId || !data.variant) return { ok: false };
    const { rateLimit } = await import('./rate-limit');
    const rl = await rateLimit('ab_exposure', data.sessionId || 'anon', 60, 60);
    if (!rl.allowed) return { ok: false };
    await supabaseAdmin.from('marketing_events').insert({
      channel: 'ab_experiment',
      event_name: 'exposure',
      user_id: null,
      payload: { experiment_id: data.experimentId, variant: data.variant, session_id: data.sessionId },
      status: 'sent',
    });
    return { ok: true };
  });

export const recordAbConversion = createServerFn({ method: 'POST' })
  .inputValidator((d: { experimentId: string; variant: string; sessionId?: string }) => ({
    experimentId: String(d.experimentId || '').slice(0, 80),
    variant: String(d.variant || '').slice(0, 80),
    sessionId: d.sessionId ? String(d.sessionId).slice(0, 64) : undefined,
  }))
  .handler(async ({ data }) => {
    if (!data.experimentId || !data.variant) return { ok: false };
    const { rateLimit } = await import('./rate-limit');
    const rl = await rateLimit('ab_conversion', data.sessionId || 'anon', 30, 60);
    if (!rl.allowed) return { ok: false };
    await supabaseAdmin.from('marketing_events').insert({
      channel: 'ab_experiment',
      event_name: 'conversion',
      user_id: null,
      order_number: null,
      value: 0,
      payload: { experiment_id: data.experimentId, variant: data.variant, session_id: data.sessionId },
      status: 'sent',
    });
    return { ok: true };
  });

export const getAbResults = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data: events } = await supabaseAdmin
      .from('marketing_events')
      .select('event_name,value,payload,created_at')
      .eq('channel', 'ab_experiment')
      .gte('created_at', new Date(Date.now() - 60 * 86400000).toISOString())
      .limit(20000);
    const agg: Record<string, Record<string, { exposures: number; conversions: number; revenue: number }>> = {};
    (events || []).forEach((e: any) => {
      const exp = e.payload?.experiment_id || 'unknown';
      const v = e.payload?.variant || 'control';
      agg[exp] = agg[exp] || {};
      agg[exp][v] = agg[exp][v] || { exposures: 0, conversions: 0, revenue: 0 };
      if (e.event_name === 'exposure') agg[exp][v].exposures++;
      else if (e.event_name === 'conversion') {
        agg[exp][v].conversions++;
        agg[exp][v].revenue += Number(e.value || 0);
      }
    });
    return { experiments: agg };
  });

// ── Enriched ROAS (channel-level) ───────────────────────────────────────
export const getRoasBreakdown = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: camps }, { data: events }, { data: orders }] = await Promise.all([
      supabaseAdmin.from('utm_campaigns').select('*'),
      supabaseAdmin.from('marketing_events').select('channel,status,event_name,value,created_at').gte('created_at', since),
      supabaseAdmin.from('orders').select('total,created_at,payment_status').gte('created_at', since),
    ]);
    const byChannel: Record<string, { spend: number; revenue: number; clicks: number; conversions: number }> = {};
    (camps || []).forEach((c: any) => {
      const ch = c.channel || 'other';
      byChannel[ch] = byChannel[ch] || { spend: 0, revenue: 0, clicks: 0, conversions: 0 };
      byChannel[ch].spend += Number(c.spend || 0);
      byChannel[ch].revenue += Number(c.revenue || 0);
      byChannel[ch].clicks += Number(c.clicks || 0);
      byChannel[ch].conversions += Number(c.conversions || 0);
    });
    const paidOrders = (orders || []).filter((o: any) => o.payment_status === 'paid');
    const organicRevenue = paidOrders.reduce((s, o: any) => s + Number(o.total || 0), 0)
      - Object.values(byChannel).reduce((s, c) => s + c.revenue, 0);

    const eventsByChannel: Record<string, number> = {};
    (events || []).forEach((e: any) => {
      eventsByChannel[e.channel] = (eventsByChannel[e.channel] || 0) + 1;
    });

    return {
      byChannel,
      organicRevenue: Math.max(0, organicRevenue),
      totalOrders: paidOrders.length,
      eventsByChannel,
      campaigns: camps || [],
    };
  });

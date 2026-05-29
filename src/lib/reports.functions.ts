// @ts-nocheck
/**
 * Analytics & reports — server-side aggregations for the admin dashboard.
 * Lite-mode: one trip per call, slim payloads.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "./users.functions";

const DAY_MS = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// ───────────── Dashboard overview ─────────────

export const getDashboardOverview = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({ days: z.number().int().min(1).max(365).default(30) }).parse)
  .handler(async ({ data }) => {
    const days = data.days;
    const now = Date.now();
    const since = new Date(now - days * DAY_MS).toISOString();
    const prevSince = new Date(now - 2 * days * DAY_MS).toISOString();
    const prevUntil = since;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const [ordersRes, prevOrdersRes, productsRes, abandonedRes, contactRes, qaRes, visitsRes, prevVisitsRes, allCustomersRes] = await Promise.all([
      supabaseAdmin.from("orders")
        .select("order_number,total,subtotal,discount,shipping_cost,order_status,payment_status,payment_method,customer_email,customer_name,user_id,items,coupon_code,shipping_address,created_at")
        .gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
      supabaseAdmin.from("orders")
        .select("total,order_status,payment_status,user_id,customer_email,created_at")
        .gte("created_at", prevSince).lt("created_at", prevUntil).limit(5000),
      supabaseAdmin.from("products")
        .select("id,name,stock_count,low_stock_threshold,in_stock,is_active,category,price")
        .order("stock_count", { ascending: true }).limit(500),
      supabaseAdmin.from("abandoned_carts")
        .select("id,status,subtotal,created_at,recovered_at").gte("created_at", since).limit(2000),
      supabaseAdmin.from("contact_submissions").select("id,status,created_at").eq("status", "new").limit(200),
      supabaseAdmin.from("product_questions").select("id,status").eq("status", "pending").limit(200),
      supabaseAdmin.from("site_visits")
        .select("session_id,device,utm_source,utm_medium,referrer,created_at")
        .gte("created_at", since).limit(20000),
      supabaseAdmin.from("site_visits")
        .select("session_id,created_at")
        .gte("created_at", prevSince).lt("created_at", prevUntil).limit(20000),
      // For new-vs-returning: lookup prior orders before this window for the same customers
      supabaseAdmin.from("orders")
        .select("user_id,customer_email,created_at").lt("created_at", since).limit(20000),
    ]);

    const orders = ordersRes.data ?? [];
    const prevOrders = prevOrdersRes.data ?? [];
    const products = productsRes.data ?? [];
    const carts = abandonedRes.data ?? [];
    const visits = visitsRes.data ?? [];
    const prevVisits = prevVisitsRes.data ?? [];
    const priorOrders = allCustomersRes.data ?? [];


    const isPaid = (o: any) => o.payment_status === "paid" || o.payment_method === "cod";
    const paid = orders.filter(isPaid);
    const prevPaid = prevOrders.filter(isPaid);

    const sum = (a: any[], k: string) => a.reduce((s, x) => s + Number(x[k] || 0), 0);

    const revenue = sum(paid, "total");
    const prevRevenue = sum(prevPaid, "total");
    const orderCount = orders.length;
    const prevOrderCount = prevOrders.length;
    const aov = orderCount ? revenue / orderCount : 0;
    const prevAov = prevOrderCount ? prevRevenue / prevOrderCount : 0;
    const customers = new Set(orders.map(o => o.user_id || o.customer_email).filter(Boolean)).size;
    const prevCustomers = new Set(prevOrders.map(o => o.user_id || o.customer_email).filter(Boolean)).size;

    let units = 0;
    const prodMap: Record<string, { id: string; name: string; qty: number; revenue: number }> = {};
    const catMap: Record<string, { qty: number; revenue: number }> = {};
    const couponMap: Record<string, { uses: number; discount: number }> = {};
    const custMap: Record<string, { name: string; email: string; orders: number; spend: number }> = {};
    const stateMap: Record<string, { orders: number; revenue: number }> = {};
    const hourMap = Array(24).fill(0).map(() => ({ orders: 0, revenue: 0 }));
    const dowMap = Array(7).fill(0).map(() => ({ orders: 0, revenue: 0 }));

    for (const o of orders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items as any[]) {
        const id = it.productId || it.id || it.name || "unknown";
        const q = Number(it.quantity || 1);
        const r = Number(it.price || 0) * q;
        units += q;
        if (!prodMap[id]) prodMap[id] = { id, name: it.name || id, qty: 0, revenue: 0 };
        prodMap[id].qty += q; prodMap[id].revenue += r;
        const cat = it.category || "Uncategorised";
        if (!catMap[cat]) catMap[cat] = { qty: 0, revenue: 0 };
        catMap[cat].qty += q; catMap[cat].revenue += r;
      }
      if (o.coupon_code) {
        const k = o.coupon_code.toUpperCase();
        if (!couponMap[k]) couponMap[k] = { uses: 0, discount: 0 };
        couponMap[k].uses += 1; couponMap[k].discount += Number(o.discount || 0);
      }
      const ck = o.user_id || o.customer_email;
      if (ck) {
        if (!custMap[ck]) custMap[ck] = { name: o.customer_name || "", email: o.customer_email || "", orders: 0, spend: 0 };
        custMap[ck].orders += 1; custMap[ck].spend += Number(o.total || 0);
      }
      const st = (o.shipping_address as any)?.state || "Unknown";
      if (!stateMap[st]) stateMap[st] = { orders: 0, revenue: 0 };
      stateMap[st].orders += 1; stateMap[st].revenue += Number(o.total || 0);
      const dt = new Date(o.created_at);
      hourMap[dt.getHours()].orders += 1; hourMap[dt.getHours()].revenue += Number(o.total || 0);
      dowMap[dt.getDay()].orders += 1; dowMap[dt.getDay()].revenue += Number(o.total || 0);
    }

    // Daily series + previous-period overlay
    const series: { day: string; rev: number; count: number; prevRev: number }[] = [];
    const idx: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * DAY_MS);
      series.push({ day: dayKey(d), rev: 0, count: 0, prevRev: 0 });
    }
    series.forEach((s, i) => { idx[s.day] = i; });
    for (const o of paid) {
      const k = dayKey(new Date(o.created_at));
      const i = idx[k];
      if (i !== undefined) { series[i].rev += Number(o.total || 0); series[i].count += 1; }
    }
    // map previous-period revenue onto same axis (shift forward by `days`)
    for (const o of prevPaid) {
      const shifted = new Date(new Date(o.created_at).getTime() + days * DAY_MS);
      const k = dayKey(shifted);
      const i = idx[k];
      if (i !== undefined) series[i].prevRev += Number(o.total || 0);
    }

    const topN = <T extends { revenue?: number; spend?: number; orders?: number }>(m: Record<string, T>, key: keyof T, n = 8) =>
      Object.entries(m).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => Number((b as any)[key] || 0) - Number((a as any)[key] || 0)).slice(0, n);

    const statusMap: Record<string, number> = {};
    const pmMap: Record<string, number> = {};
    for (const o of orders) {
      statusMap[o.order_status] = (statusMap[o.order_status] || 0) + 1;
      const pm = o.payment_method || "unknown";
      pmMap[pm] = (pmMap[pm] || 0) + 1;
    }

    const lowStock = products.filter(p => p.is_active && Number(p.stock_count || 0) <= Number(p.low_stock_threshold || 5));
    const outOfStock = products.filter(p => p.is_active && Number(p.stock_count || 0) === 0);

    const recoveredCarts = carts.filter(c => c.status === "recovered").length;
    const abandonedTotal = carts.length;
    const abandonedValue = sum(carts.filter(c => c.status !== "recovered"), "subtotal");

    // ── Visitor metrics ──
    const uniq = (arr: any[]) => new Set(arr.map(v => v.session_id).filter(Boolean)).size;
    const sessions = uniq(visits);
    const prevSessions = uniq(prevVisits);
    const conversionRate = sessions ? (orderCount / sessions) * 100 : 0;
    const prevConversionRate = prevSessions ? (prevOrderCount / prevSessions) * 100 : 0;

    // Device split (unique sessions per device)
    const deviceSess: Record<string, Set<string>> = { mobile: new Set(), desktop: new Set(), tablet: new Set(), unknown: new Set() };
    for (const v of visits) {
      const d = (v.device || "unknown") as keyof typeof deviceSess;
      if (deviceSess[d]) deviceSess[d].add(v.session_id);
    }
    const deviceMap = {
      mobile: deviceSess.mobile.size,
      desktop: deviceSess.desktop.size,
      tablet: deviceSess.tablet.size,
      unknown: deviceSess.unknown.size,
    };

    // Traffic source breakdown (unique sessions per source)
    const sourceFromVisit = (v: any): string => {
      if (v.utm_source) return String(v.utm_source).toLowerCase();
      const ref = (v.referrer || "").toLowerCase();
      if (!ref) return "direct";
      if (ref.includes("google")) return "google";
      if (ref.includes("facebook") || ref.includes("fb.")) return "facebook";
      if (ref.includes("instagram")) return "instagram";
      if (ref.includes("wa.me") || ref.includes("whatsapp")) return "whatsapp";
      if (ref.includes("youtube")) return "youtube";
      if (ref.includes("bing")) return "bing";
      return "other";
    };
    const trafficSess: Record<string, Set<string>> = {};
    for (const v of visits) {
      const s = sourceFromVisit(v);
      if (!trafficSess[s]) trafficSess[s] = new Set();
      trafficSess[s].add(v.session_id);
    }
    const trafficSource = Object.entries(trafficSess)
      .map(([source, set]) => ({ source, sessions: set.size }))
      .sort((a, b) => b.sessions - a.sessions);

    // ── New vs Returning customers ──
    const priorKeys = new Set(priorOrders.map((o: any) => o.user_id || o.customer_email).filter(Boolean));
    const currentKeys = new Set(orders.map((o: any) => o.user_id || o.customer_email).filter(Boolean));
    let newCust = 0, returningCust = 0;
    for (const k of currentKeys) {
      if (priorKeys.has(k)) returningCust += 1; else newCust += 1;
    }
    // Repeat purchase rate: % customers ever with >1 order across all-time
    const ordersByCust: Record<string, number> = {};
    for (const o of priorOrders) {
      const k = (o as any).user_id || (o as any).customer_email;
      if (k) ordersByCust[k] = (ordersByCust[k] || 0) + 1;
    }
    for (const o of orders) {
      const k = o.user_id || o.customer_email;
      if (k) ordersByCust[k] = (ordersByCust[k] || 0) + 1;
    }
    const totalCustEver = Object.keys(ordersByCust).length;
    const repeatCust = Object.values(ordersByCust).filter(n => n > 1).length;
    const repeatRate = totalCustEver ? (repeatCust / totalCustEver) * 100 : 0;

    // ── Today live counters ──
    const todayOrders = orders.filter(o => new Date(o.created_at) >= todayStart);
    const todayRevenue = todayOrders.filter(isPaid).reduce((s, o) => s + Number(o.total || 0), 0);
    const todayVisits = visits.filter(v => new Date(v.created_at) >= todayStart);
    const todaySessions = new Set(todayVisits.map(v => v.session_id)).size;


    return {
      period: { days, from: since, to: new Date(now).toISOString() },
      kpis: {
        revenue, prevRevenue,
        orderCount, prevOrderCount,
        aov, prevAov,
        customers, prevCustomers,
        units,
        cancelled: orders.filter(o => o.order_status === "cancelled").length,
        delivered: orders.filter(o => o.order_status === "delivered").length,
        shipped: orders.filter(o => ["shipped", "out_for_delivery"].includes(o.order_status)).length,
        pending: orders.filter(o => ["pending", "confirmed", "processing"].includes(o.order_status)).length,
        discount: sum(orders, "discount"),
        shipping: sum(orders, "shipping_cost"),
      },
      series,
      topProducts: topN(prodMap, "revenue"),
      topCategories: Object.entries(catMap).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
      topCustomers: topN(custMap, "spend").slice(0, 6),
      topCoupons: Object.entries(couponMap).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.uses - a.uses).slice(0, 6),
      topStates: Object.entries(stateMap).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
      statusMap, pmMap, hourMap, dowMap,
      inventory: {
        lowCount: lowStock.length,
        outCount: outOfStock.length,
        lowItems: lowStock.slice(0, 6).map(p => ({ id: p.id, name: p.name, stock: p.stock_count, threshold: p.low_stock_threshold })),
      },
      funnel: {
        abandoned: abandonedTotal,
        recovered: recoveredCarts,
        orders: orderCount,
        abandonedValue,
        recoveryRate: abandonedTotal ? (recoveredCarts / abandonedTotal) * 100 : 0,
      },
      actionables: {
        pendingOrders: orders.filter(o => o.order_status === "pending").length,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        newContacts: contactRes.data?.length ?? 0,
        pendingQA: qaRes.data?.length ?? 0,
      },
      recentOrders: orders.slice(0, 8).map(o => ({
        order_number: o.order_number, total: o.total, customer_name: o.customer_name,
        order_status: o.order_status, payment_status: o.payment_status, created_at: o.created_at,
      })),
      visitors: {
        sessions, prevSessions,
        conversionRate, prevConversionRate,
        deviceMap,
        trafficSource,
      },
      cohorts: {
        newCust, returningCust,
        repeatRate, repeatCust, totalCustEver,
      },
      today: {
        orders: todayOrders.length,
        revenue: todayRevenue,
        sessions: todaySessions,
      },
    };

  });

// ───────────── Custom analytics query ─────────────

const FilterSchema = z.object({
  days: z.number().int().min(1).max(365).optional(),
  from: z.string().optional(), to: z.string().optional(),
  status: z.array(z.string()).optional(),
  paymentStatus: z.array(z.string()).optional(),
  paymentMethod: z.array(z.string()).optional(),
  category: z.array(z.string()).optional(),
  search: z.string().optional(),
}).default({ days: 30 });

export const getCustomAnalytics = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({
    filters: FilterSchema,
    dimension: z.string().default("time"),
    granularity: z.enum(["day", "week", "month", "hour"]).default("day"),
    topN: z.number().int().min(1).max(100).default(20),
  }).parse)
  .handler(async ({ data }) => {
    const f = data.filters;
    const now = Date.now();
    const since = f.from || new Date(now - (f.days || 30) * DAY_MS).toISOString();
    const until = f.to || new Date(now).toISOString();
    let q = supabaseAdmin.from("orders")
      .select("order_number,total,subtotal,discount,shipping_cost,order_status,payment_status,payment_method,customer_email,customer_name,user_id,items,coupon_code,shipping_address,created_at")
      .gte("created_at", since).lte("created_at", until)
      .order("created_at", { ascending: false }).limit(5000);
    if (f.status?.length) q = q.in("order_status", f.status);
    if (f.paymentStatus?.length) q = q.in("payment_status", f.paymentStatus);
    if (f.paymentMethod?.length) q = q.in("payment_method", f.paymentMethod);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const orders = (rows ?? []).filter(o => {
      if (f.search) {
        const s = f.search.toLowerCase();
        const hay = `${o.order_number} ${o.customer_name || ""} ${o.customer_email || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });

    const bucketKey = (d: Date): string => {
      if (data.granularity === "hour") return `${d.toISOString().slice(0, 13)}:00`;
      if (data.granularity === "month") return d.toISOString().slice(0, 7);
      if (data.granularity === "week") {
        const day = d.getUTCDay();
        const monday = new Date(d); monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
        return dayKey(monday);
      }
      return dayKey(d);
    };

    const agg: Record<string, { revenue: number; orders: number; units: number; customers: Set<string>; discount: number; cancelled: number; delivered: number; shipping: number }> = {};
    const bump = (key: string, o: any) => {
      if (!agg[key]) agg[key] = { revenue: 0, orders: 0, units: 0, customers: new Set(), discount: 0, cancelled: 0, delivered: 0, shipping: 0 };
      const a = agg[key];
      const paid = o.payment_status === "paid" || o.payment_method === "cod";
      if (paid) a.revenue += Number(o.total || 0);
      a.orders += 1;
      a.units += ((o.items as any[]) || []).reduce((s: number, it: any) => s + Number(it.quantity || 1), 0);
      const ck = o.user_id || o.customer_email; if (ck) a.customers.add(ck);
      a.discount += Number(o.discount || 0);
      a.shipping += Number(o.shipping_cost || 0);
      if (o.order_status === "cancelled") a.cancelled += 1;
      if (o.order_status === "delivered") a.delivered += 1;
    };


    for (const o of orders) {
      const d = new Date(o.created_at);
      switch (data.dimension) {
        case "time": bump(bucketKey(d), o); break;
        case "payment_method": bump(o.payment_method || "unknown", o); break;
        case "payment_status": bump(o.payment_status || "unknown", o); break;
        case "order_status": bump(o.order_status || "unknown", o); break;
        case "state": bump((o.shipping_address as any)?.state || "Unknown", o); break;
        case "city": bump((o.shipping_address as any)?.city || "Unknown", o); break;
        case "coupon": bump((o.coupon_code || "(none)").toUpperCase(), o); break;
        case "hour_of_day": bump(`${d.getHours()}:00`, o); break;
        case "day_of_week": bump(["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()], o); break;
        case "product": {
          for (const it of (o.items as any[]) || []) bump(it.name || it.productId || "Unknown", { ...o, items: [it] });
          break;
        }
        case "category": {
          const cats = new Set<string>(((o.items as any[]) || []).map(it => it.category || "Uncategorised"));
          cats.forEach(c => bump(c, o));
          break;
        }
        default: bump(bucketKey(d), o);
      }
    }

    const series = Object.entries(agg).map(([key, v]) => ({
      key,
      revenue: Math.round(v.revenue),
      orders: v.orders, units: v.units,
      aov: v.orders ? Math.round(v.revenue / v.orders) : 0,
      customers: v.customers.size,
      discount: Math.round(v.discount),
      cancelled: v.cancelled, delivered: v.delivered, shipping: Math.round(v.shipping),
      refunds: 0,
    }));

    // Sort: time-like dimensions keep chronological, otherwise by revenue desc
    if (["time", "hour_of_day", "day_of_week"].includes(data.dimension)) series.sort((a, b) => a.key.localeCompare(b.key));
    else series.sort((a, b) => b.revenue - a.revenue);

    return { rows: series.slice(0, data.topN), totalRows: series.length, count: orders.length };
  });

// ───────────── Saved views CRUD ─────────────

export const listSavedViews = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data } = await supabaseAdmin.from("analytics_saved_views").select("*").order("is_pinned", { ascending: false }).order("updated_at", { ascending: false });
    return data ?? [];
  });

export const upsertSavedView = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(80),
    description: z.string().max(300).default(""),
    config: z.any(),
    is_pinned: z.boolean().default(false),
  }).parse)
  .handler(async ({ data, context }) => {
    const payload: any = { name: data.name, description: data.description, config: data.config, is_pinned: data.is_pinned };
    if (!data.id) payload.created_by = (context as any).userId ?? null;
    const q = data.id
      ? supabaseAdmin.from("analytics_saved_views").update(payload).eq("id", data.id).select().single()
      : supabaseAdmin.from("analytics_saved_views").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSavedView = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("analytics_saved_views").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ───────────── Report subscriptions CRUD + send ─────────────

const SubSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  schedule: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  send_hour: z.number().int().min(0).max(23).default(9),
  weekday: z.number().int().min(0).max(6).default(1),
  monthday: z.number().int().min(1).max(28).default(1),
  recipients: z.array(z.string().email().max(320)).min(1).max(20),
  formats: z.array(z.enum(["pdf", "csv", "xls"])).min(1).default(["pdf", "csv"]),
  config: z.any(),
  enabled: z.boolean().default(true),
});

function nextRun(s: { schedule: string; send_hour: number; weekday: number; monthday: number }): string {
  const d = new Date();
  d.setMinutes(0, 0, 0); d.setHours(s.send_hour);
  if (s.schedule === "daily") {
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  } else if (s.schedule === "weekly") {
    const diff = (s.weekday - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + (d.getTime() <= Date.now() ? diff : 0));
  } else {
    d.setDate(s.monthday);
    if (d.getTime() <= Date.now()) d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data } = await supabaseAdmin.from("analytics_report_subscriptions").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertSubscription = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(SubSchema.parse)
  .handler(async ({ data, context }) => {
    const payload: any = { ...data, next_run_at: nextRun(data) };
    if (!data.id) payload.created_by = (context as any).userId ?? null;
    const q = data.id
      ? supabaseAdmin.from("analytics_report_subscriptions").update(payload).eq("id", data.id).select().single()
      : supabaseAdmin.from("analytics_report_subscriptions").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSubscription = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("analytics_report_subscriptions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listReportRuns = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data } = await supabaseAdmin.from("analytics_report_runs").select("*").order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });

// Generate the email body (HTML) for a given period
function buildReportHtml(siteName: string, periodLabel: string, k: any, top: any[]): string {
  const row = (label: string, val: string, delta?: number) => {
    const arrow = delta == null ? "" : `<span style="color:${delta >= 0 ? "#16a34a" : "#dc2626"};font-size:12px;margin-left:6px">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}%</span>`;
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-family:Arial">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:700;text-align:right;font-family:Arial">${val}${arrow}</td></tr>`;
  };
  const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
  const dpct = (a: number, b: number) => b ? ((a - b) / b) * 100 : 0;
  const topRows = top.slice(0, 8).map((p, i) =>
    `<tr><td style="padding:6px 10px;font-family:Arial">${i + 1}. ${(p.name || p.key || "").toString().slice(0, 40)}</td><td style="padding:6px 10px;text-align:right;font-weight:700;font-family:Arial">${inr(p.revenue || 0)}</td><td style="padding:6px 10px;text-align:right;color:#6b7280;font-family:Arial">${p.qty || ""}</td></tr>`,
  ).join("");

  return `<div style="max-width:680px;margin:0 auto;background:#fff;font-family:Arial,sans-serif">
<div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:24px;color:#fff">
<h1 style="margin:0;font-size:22px">${siteName} — Analytics report</h1>
<p style="margin:6px 0 0;opacity:.9;font-size:13px">${periodLabel}</p>
</div>
<div style="padding:18px">
<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #f3f4f6;border-radius:10px;overflow:hidden">
${row("Revenue", inr(k.revenue), dpct(k.revenue, k.prevRevenue))}
${row("Orders", String(k.orderCount), dpct(k.orderCount, k.prevOrderCount))}
${row("Avg Order Value", inr(k.aov), dpct(k.aov, k.prevAov))}
${row("Unique customers", String(k.customers), dpct(k.customers, k.prevCustomers))}
${row("Units sold", String(k.units))}
${row("Delivered", String(k.delivered))}
${row("Pending", String(k.pending))}
${row("Cancelled", String(k.cancelled))}
${row("Discount given", inr(k.discount))}
</table>
<h3 style="margin:22px 0 8px;font-size:15px;color:#111">Top products</h3>
<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #f3f4f6;border-radius:10px;overflow:hidden">${topRows || `<tr><td style="padding:10px;color:#9ca3af;font-family:Arial">No sales in this period</td></tr>`}</table>
<p style="color:#9ca3af;font-size:11px;margin-top:24px;font-family:Arial">Generated automatically by ${siteName} admin. Manage schedule in Admin → Analytics → Scheduled reports.</p>
</div></div>`;
}

async function loadSiteName(): Promise<string> {
  const { data } = await supabaseAdmin.from("site_settings").select("settings").eq("key", "default").maybeSingle();
  return ((data?.settings as any)?.siteName as string) || "Store";
}

async function runReport(opts: { recipients: string[]; days: number; subId?: string; trigger: "manual" | "cron"; formats: string[] }) {
  const siteName = await loadSiteName();
  const periodLabel = `Last ${opts.days} days · sent ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

  // Re-use the same aggregator as the dashboard
  const since = new Date(Date.now() - opts.days * DAY_MS).toISOString();
  const prevSince = new Date(Date.now() - 2 * opts.days * DAY_MS).toISOString();
  const [a, b] = await Promise.all([
    supabaseAdmin.from("orders").select("total,subtotal,discount,shipping_cost,order_status,payment_status,payment_method,customer_email,user_id,items,created_at").gte("created_at", since).limit(5000),
    supabaseAdmin.from("orders").select("total,order_status,payment_status,user_id,customer_email,created_at").gte("created_at", prevSince).lt("created_at", since).limit(5000),
  ]);
  const orders = a.data ?? []; const prev = b.data ?? [];
  const isPaid = (o: any) => o.payment_status === "paid" || o.payment_method === "cod";
  const sum = (x: any[], k: string) => x.reduce((s, o) => s + Number(o[k] || 0), 0);
  const paid = orders.filter(isPaid); const ppaid = prev.filter(isPaid);
  const k = {
    revenue: sum(paid, "total"), prevRevenue: sum(ppaid, "total"),
    orderCount: orders.length, prevOrderCount: prev.length,
    aov: orders.length ? sum(paid, "total") / orders.length : 0,
    prevAov: prev.length ? sum(ppaid, "total") / prev.length : 0,
    customers: new Set(orders.map(o => o.user_id || o.customer_email).filter(Boolean)).size,
    prevCustomers: new Set(prev.map(o => o.user_id || o.customer_email).filter(Boolean)).size,
    units: orders.reduce((s, o) => s + ((o.items as any[]) || []).reduce((ss, it: any) => ss + Number(it.quantity || 1), 0), 0),
    delivered: orders.filter(o => o.order_status === "delivered").length,
    pending: orders.filter(o => ["pending", "confirmed", "processing"].includes(o.order_status)).length,
    cancelled: orders.filter(o => o.order_status === "cancelled").length,
    discount: sum(orders, "discount"),
  };
  const prodMap: Record<string, any> = {};
  for (const o of orders) for (const it of (o.items as any[]) || []) {
    const id = it.productId || it.id || it.name; if (!id) continue;
    if (!prodMap[id]) prodMap[id] = { name: it.name || id, qty: 0, revenue: 0 };
    prodMap[id].qty += Number(it.quantity || 1);
    prodMap[id].revenue += Number(it.price || 0) * Number(it.quantity || 1);
  }
  const top = Object.values(prodMap).sort((a: any, b: any) => b.revenue - a.revenue);
  const html = buildReportHtml(siteName, periodLabel, k, top);
  const subject = `${siteName} report — ${periodLabel}`;

  // enqueue one email per recipient
  const rows = opts.recipients.map(to => ({
    channel: "email", template: "analytics_report", recipient: to,
    payload: { message: html, subject, siteName },
    status: "pending", attempts: 0,
  }));
  if (rows.length) await supabaseAdmin.from("notification_queue").insert(rows);

  await supabaseAdmin.from("analytics_report_runs").insert({
    subscription_id: opts.subId ?? null, trigger: opts.trigger,
    recipients: opts.recipients, formats: opts.formats,
    status: "sent", meta: { days: opts.days, totals: { revenue: k.revenue, orders: k.orderCount } },
  });
  if (opts.subId) {
    await supabaseAdmin.from("analytics_report_subscriptions")
      .update({ last_run_at: new Date().toISOString(), next_run_at: nextRun({ schedule: "daily", send_hour: 9, weekday: 1, monthday: 1 }) })
      .eq("id", opts.subId);
  }
  return { sent: rows.length, kpis: k };
}

export const sendReportNow = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({
    subscriptionId: z.string().uuid().optional(),
    recipients: z.array(z.string().email()).optional(),
    days: z.number().int().min(1).max(365).default(7),
    formats: z.array(z.string()).default(["pdf", "csv"]),
  }).parse)
  .handler(async ({ data }) => {
    let recipients = data.recipients ?? [];
    let subId = data.subscriptionId;
    let days = data.days;
    if (subId) {
      const { data: sub } = await supabaseAdmin.from("analytics_report_subscriptions").select("*").eq("id", subId).single();
      if (!sub) throw new Error("Subscription not found");
      recipients = sub.recipients as string[];
      days = ((sub.config as any)?.filters?.days as number) || data.days;
    }
    if (!recipients.length) throw new Error("No recipients");
    return runReport({ recipients, days, subId, trigger: "manual", formats: data.formats });
  });

// ───────────── Live behaviour, funnel, event stream ─────────────
//
// Reads from public.site_events (anon-insert beacon table). Returns the
// data needed by the new Live / Funnel / Events sections on the admin
// Dashboard, plus a downloadable raw event list.

export const getDashboardLive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(
    z.object({
      days:       z.number().int().min(1).max(90).default(7),
      eventLimit: z.number().int().min(50).max(2000).default(300),
    }).parse,
  )
  .handler(async ({ data }) => {
    const now = Date.now();
    const since      = new Date(now - data.days * DAY_MS).toISOString();
    const liveSince  = new Date(now - 5 * 60_000).toISOString();

    const sbe: any = supabaseAdmin.from("site_events" as any);
    const [winRes, liveRes, recentRes] = await Promise.all([
      sbe.select("session_id,event_type,product_id,product_name,value,quantity,device,created_at")
         .gte("created_at", since).limit(50_000),
      sbe.select("session_id,event_type,path,device,created_at")
         .gte("created_at", liveSince).limit(2000),
      sbe.select("id,session_id,event_type,product_id,product_name,path,value,quantity,device,country,created_at")
         .gte("created_at", since)
         .order("created_at", { ascending: false })
         .limit(data.eventLimit),
    ]);

    const win:    any[] = winRes.data    ?? [];
    const live:   any[] = liveRes.data   ?? [];
    const recent: any[] = recentRes.data ?? [];

    // ── Counts by type
    const count = (t: string) => win.filter(e => e.event_type === t).length;
    const sessionsOf = (t: string) =>
      new Set(win.filter(e => e.event_type === t).map(e => e.session_id)).size;

    const totals = {
      pageViews:      count("page_view"),
      viewItems:      count("view_item"),
      addToCarts:     count("add_to_cart"),
      wishlistAdds:   count("wishlist_add"),
      beginCheckouts: count("begin_checkout"),
      purchases:      count("purchase"),
      searches:       count("search"),
    };

    // ── Funnel (unique sessions per step)
    const funnel = [
      { step: "Visitors",       value: new Set(win.map(e => e.session_id)).size },
      { step: "Product Views",  value: sessionsOf("view_item") },
      { step: "Add to Cart",    value: sessionsOf("add_to_cart") },
      { step: "Checkout",       value: sessionsOf("begin_checkout") },
      { step: "Purchase",       value: sessionsOf("purchase") },
    ];

    // ── Avg session duration (seconds): last - first event per session
    const span: Record<string, { min: number; max: number }> = {};
    for (const e of win) {
      const t = new Date(e.created_at).getTime();
      const s = span[e.session_id];
      if (!s) span[e.session_id] = { min: t, max: t };
      else { if (t < s.min) s.min = t; if (t > s.max) s.max = t; }
    }
    const durations = Object.values(span).map(s => (s.max - s.min) / 1000);
    const avgDuration = durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // ── Most viewed products (view_item events)
    const prodView: Record<string, { id: string; name: string; views: number; sessions: Set<string> }> = {};
    for (const e of win) {
      if (e.event_type !== "view_item" || !e.product_id) continue;
      const k = e.product_id;
      if (!prodView[k]) prodView[k] = { id: k, name: e.product_name || k, views: 0, sessions: new Set() };
      prodView[k].views += 1;
      prodView[k].sessions.add(e.session_id);
    }
    const topViewed = Object.values(prodView)
      .map(p => ({ id: p.id, name: p.name, views: p.views, uniqueSessions: p.sessions.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // ── Most added-to-cart products
    const prodAtc: Record<string, { id: string; name: string; adds: number }> = {};
    for (const e of win) {
      if (e.event_type !== "add_to_cart" || !e.product_id) continue;
      const k = e.product_id;
      if (!prodAtc[k]) prodAtc[k] = { id: k, name: e.product_name || k, adds: 0 };
      prodAtc[k].adds += (e.quantity || 1);
    }
    const topAtc = Object.values(prodAtc).sort((a, b) => b.adds - a.adds).slice(0, 10);

    // ── Live (last 5 min): unique sessions + per-path
    const liveSessions = new Set(live.map(e => e.session_id));
    const livePathMap: Record<string, number> = {};
    for (const e of live) {
      const p = e.path || "/";
      livePathMap[p] = (livePathMap[p] || 0) + 1;
    }
    const livePaths = Object.entries(livePathMap)
      .map(([path, hits]) => ({ path, hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 8);

    return {
      period: { days: data.days, from: since, to: new Date(now).toISOString() },
      totals,
      funnel,
      avgDurationSec: Math.round(avgDuration),
      topViewed,
      topAtc,
      live: {
        activeSessions: liveSessions.size,
        hits: live.length,
        paths: livePaths,
      },
      recent: recent.map((e: any) => ({
        id: e.id,
        session_id: e.session_id,
        event_type: e.event_type,
        product_id: e.product_id,
        product_name: e.product_name,
        path: e.path,
        value: e.value,
        quantity: e.quantity,
        device: e.device,
        country: e.country,
        created_at: e.created_at,
      })),
    };
  });

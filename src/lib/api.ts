// @ts-nocheck
/**
 * Supabase-backed API adapter.
 * Translates the original Express REST surface to Supabase queries.
 * Returns axios-shaped { data } responses so pre-existing pages keep working.
 */
import { supabase } from "@/integrations/supabase/client";

// ---------- helpers ----------
const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

function camelize<T = any>(input: any): T {
  if (input == null) return input;
  if (Array.isArray(input)) return input.map(camelize) as any;
  if (typeof input !== "object") return input;
  if (input instanceof Date) return input as any;
  const out: any = {};
  for (const k of Object.keys(input)) {
    const v = (input as any)[k];
    out[snakeToCamel(k)] = camelize(v);
    if (k === "id") out._id = v; // mongo-style alias used by some pages
  }
  return out;
}

const ok = (data: any) => ({ data });
function fail(status: number, message: string): never {
  const err: any = new Error(message);
  err.response = { status, data: { message } };
  throw err;
}

async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

function parsePath(url: string): { path: string; params: URLSearchParams } {
  const [p, q = ""] = url.split("?");
  return { path: p.replace(/\/+$/, "") || "/", params: new URLSearchParams(q) };
}

// ---------- route handlers ----------
type Handler = (path: string, params: URLSearchParams, body?: any) => Promise<any>;

// GET
const GET: Record<string, Handler> = {
  "/products": async (_p, params) => {
    let q = supabase.from("products").select("*").eq("is_active", true);
    const category = params.get("category");
    const search = params.get("search");
    if (category) q = q.eq("category", category);
    if (search) {
      const s = search.trim().replace(/[%,]/g, " ");
      q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%,short_description.ilike.%${s}%,category.ilike.%${s}%,brand.ilike.%${s}%`);
    }
    const sort = params.get("sort");
    if (sort === "price_asc") q = q.order("price", { ascending: true });
    else if (sort === "price_desc") q = q.order("price", { ascending: false });
    else if (sort === "rating") q = q.order("ratings", { ascending: false });
    else q = q.order("created_at", { ascending: false });
    const { data, error } = await q.limit(200);
    if (error) fail(500, error.message);
    return camelize(data ?? []);
  },
  "/homepage": async () => {
    const { data } = await supabase
      .from("homepage_config")
      .select("config")
      .or("section_key.eq.default,key.eq.default")
      .limit(1)
      .maybeSingle();
    return camelize(data?.config ?? {});
  },
  "/homepage/testimonials": async () => {
    // Manual reviews for homepage + customer reviews with rating >= 4 (top-rated).
    // Some projects still use the older global_reviews schema without show_on_home,
    // so we rely on stable approval/featured fields instead of the newer flag.
    const [manual, productReviews, productsList] = await Promise.all([
      supabase.from("global_reviews").select("*")
        .eq("is_approved", true)
        .eq("is_featured", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("product_reviews").select("*")
        .gte("rating", 4)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("products").select("id,name,slug"),
    ]);
    const pmap = new Map((productsList.data ?? []).map((p: any) => [p.id, p]));
    const enrich = (r: any) => ({ ...r, productName: pmap.get(r.product_id)?.name, productSlug: pmap.get(r.product_id)?.slug });
    const merged = [...(manual.data ?? []), ...(productReviews.data ?? []).map(enrich)].slice(0, 40);
    return camelize(merged);
  },
  "/testimonials": async () => {
    // Manual reviews + ALL customer-submitted product reviews.
    // Stay compatible with the older global_reviews schema.
    const [manual, productReviews, productsList] = await Promise.all([
      supabase.from("global_reviews").select("*")
        .eq("is_approved", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("product_reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id,name,slug"),
    ]);
    const pmap = new Map((productsList.data ?? []).map((p: any) => [p.id, p]));
    const enrich = (r: any) => ({ ...r, productName: pmap.get(r.product_id)?.name, productSlug: pmap.get(r.product_id)?.slug });
    const merged = [...(manual.data ?? []), ...(productReviews.data ?? []).map(enrich)];
    return camelize(merged);
  },
  "/testimonials/products": async () => {
    const { data } = await supabase.from("products").select("id,name,slug,image:images").limit(50);
    return camelize((data ?? []).map((p: any) => ({ ...p, image: Array.isArray(p.image) ? p.image[0] : p.image })));
  },
  "/blog": async () => {
    const { data } = await supabase.from("blog_posts").select("*").eq("published", true).order("created_at", { ascending: false });
    return camelize(data ?? []);
  },
  "/faq": async () => {
    const { data } = await supabase.from("faqs").select("*").eq("enabled", true).order("order", { ascending: true });
    return camelize(data ?? []);
  },
  "/settings": async () => {
    const { data } = await supabase.from("site_settings").select("settings").eq("key", "default").maybeSingle();
    return camelize(data?.settings ?? {});
  },
  "/payment-settings": async () => {
    const { data } = await supabase.from("site_settings").select("settings").eq("key", "default").maybeSingle();
    const s = (data?.settings as any) ?? {};
    return camelize(s.payments ?? { codEnabled: true, codLabel: "Cash on Delivery" });
  },
  "/orders/my": async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    return camelize(data ?? []);
  },
  "/wallet/me": async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { balance: 0, transactions: [] };
    const [w, tx] = await Promise.all([
      supabase.from("user_wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    return camelize({ balance: Number(w.data?.balance || 0), transactions: tx.data ?? [] });
  },
  "/coupons/my": async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from("user_coupons").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    return camelize(data ?? []);
  },
  "/referral/me": async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { code: "", referrals: [], signupBonus: 0, firstOrderBonus: 0, totalEarned: 0 };
    const [prof, events, rules] = await Promise.all([
      supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle(),
      supabase.from("referral_events").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("wallet_rules").select("trigger,amount,enabled").in("trigger", ["referral_signup","referral_first_order"]),
    ]);
    const ru = (rules.data ?? []).reduce((m: any, r: any) => { m[r.trigger] = r; return m; }, {});
    const totalEarned = (events.data ?? []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    return camelize({
      code: prof.data?.referral_code || "",
      referrals: events.data ?? [],
      signupBonus: ru.referral_signup?.enabled ? Number(ru.referral_signup.amount || 0) : 0,
      firstOrderBonus: ru.referral_first_order?.enabled ? Number(ru.referral_first_order.amount || 0) : 0,
      totalEarned,
    });
  },
  "/admin/wallets": async () => {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const { data } = await supabase.from("user_wallets").select("*").order("balance", { ascending: false }).limit(200);
    if (!data?.length) return [];
    const ids = data.map((w: any) => w.user_id);
    const { data: profiles } = await supabase.from("profiles").select("id,name,email,phone").in("id", ids);
    const pmap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
    return camelize(data.map((w: any) => ({ ...w, profile: pmap[w.user_id] ?? null })));
  },
  "/admin/wallet-transactions": async (_p, params) => {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    let q = supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(100);
    const uid = params.get("user_id");
    if (uid) q = q.eq("user_id", uid);
    const { data } = await q;
    return camelize(data ?? []);
  },
  "/admin/user-coupons": async () => {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const { data } = await supabase.from("user_coupons").select("*").order("created_at", { ascending: false }).limit(200);
    return camelize(data ?? []);
  },
  "/admin/wallet/overview": async () => {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const [wallets, tx30, expSoon, couponsActive] = await Promise.all([
      supabase.from("user_wallets").select("balance"),
      supabase.from("wallet_transactions").select("amount,type,created_at").gte("created_at", new Date(Date.now() - 30 * 86400e3).toISOString()),
      supabase.from("wallet_transactions").select("amount,user_id,expires_at").eq("type", "credit").not("expires_at", "is", null).gte("expires_at", new Date().toISOString()).lte("expires_at", new Date(Date.now() + 7 * 86400e3).toISOString()),
      supabase.from("user_coupons").select("id", { count: "exact", head: true }).eq("used", false),
    ]);
    const balances = (wallets.data ?? []).map((w: any) => Number(w.balance || 0));
    const txs = tx30.data ?? [];
    return {
      totalBalance: balances.reduce((a: number, b: number) => a + b, 0),
      activeWallets: balances.filter((b: number) => b > 0).length,
      totalWallets: balances.length,
      credits30d: txs.filter((t: any) => t.type === "credit").reduce((a: number, t: any) => a + Number(t.amount), 0),
      debits30d: Math.abs(txs.filter((t: any) => t.type === "debit").reduce((a: number, t: any) => a + Number(t.amount), 0)),
      expires30d: Math.abs(txs.filter((t: any) => t.type === "expire").reduce((a: number, t: any) => a + Number(t.amount), 0)),
      expiringSoonAmount: (expSoon.data ?? []).reduce((a: number, t: any) => a + Number(t.amount), 0),
      expiringSoonCount: (expSoon.data ?? []).length,
      activeCoupons: couponsActive.count ?? 0,
    };
  },
  "/admin/wallet/rules": async () => {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const { data } = await supabase.from("wallet_rules").select("*").order("sort_order");
    return camelize(data ?? []);
  },
  "/admin/wallet/settings": async () => {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const { data } = await supabase.from("site_settings").select("settings").eq("key", "wallet").maybeSingle();
    return data?.settings ?? {};
  },
};


// dynamic GET (with slugs/ids)
async function dynamicGet(path: string): Promise<any> {
  // /products/:slug
  let m = path.match(/^\/products\/([^/]+)$/);
  if (m) {
    const { data, error } = await supabase.from("products").select("*").eq("slug", m[1]).maybeSingle();
    if (error || !data) fail(404, "Product not found");
    // attach reviews
    const { data: reviews } = await supabase.from("product_reviews").select("*").eq("product_id", data!.id).order("created_at", { ascending: false });
    const result = { ...data!, reviews: reviews ?? [] };
    return camelize(result);
  }
  // /orders/track/:orderNumber — public lookup via server fn (returns redacted address)
  m = path.match(/^\/orders\/track\/([^/]+)$/);
  if (m) {
    const { trackOrderPublic } = await import("./track-order.functions");
    const row = await trackOrderPublic({ data: { orderNumber: m[1] } });
    if (!row) fail(404, "Order not found");
    // attach tracking timeline (public, redacted via RLS-safe direct read)
    const { data: tr } = await supabase.from("order_tracking").select("courier,awb_number,tracking_url,current_status,status_history,estimated_delivery,last_synced_at").eq("order_number", m[1]).maybeSingle();
    return camelize({ ...row, tracking: tr ?? null });
  }
  // /orders/:orderNumber/invoice — owner or admin, returns full invoice snapshot
  m = path.match(/^\/orders\/([^/]+)\/invoice$/);
  if (m) {
    const { data: inv } = await supabase.from("invoices").select("*").eq("order_number", m[1]).maybeSingle();
    if (!inv) fail(404, "Invoice not generated yet");
    return camelize(inv);
  }
  // /orders/:orderNumber/tracking — owner or admin
  m = path.match(/^\/orders\/([^/]+)\/tracking$/);
  if (m) {
    const { data: tr } = await supabase.from("order_tracking").select("*").eq("order_number", m[1]).maybeSingle();
    return camelize(tr ?? null);
  }
  // /account/orders — current user's orders with invoice + tracking summary
  if (path === "/account/orders") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) fail(401, "Login required");
    const { data: orders } = await supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    const nums = (orders ?? []).map((o: any) => o.order_number);
    const [{ data: invs }, { data: trks }] = await Promise.all([
      supabase.from("invoices").select("order_number,invoice_number,issued_at").in("order_number", nums.length ? nums : ["__none__"]),
      supabase.from("order_tracking").select("order_number,courier,awb_number,tracking_url,current_status").in("order_number", nums.length ? nums : ["__none__"]),
    ]);
    const invMap = new Map((invs ?? []).map((i: any) => [i.order_number, i]));
    const trkMap = new Map((trks ?? []).map((t: any) => [t.order_number, t]));
    return camelize((orders ?? []).map((o: any) => ({ ...o, invoice: invMap.get(o.order_number) ?? null, tracking: trkMap.get(o.order_number) ?? null })));
  }
  // /blog/:slug
  m = path.match(/^\/blog\/([^/]+)$/);
  if (m) {
    const { data } = await supabase.from("blog_posts").select("*").eq("slug", m[1]).maybeSingle();
    if (!data) fail(404, "Post not found");
    return camelize(data);
  }
  // /admin/*
  if (path.startsWith("/admin/")) {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const table = adminGetTableMap[path];
    if (table) {
      const { data } = await supabase.from(table as any).select("*").order("created_at", { ascending: false });
      return camelize(data ?? []);
    }
    if (path === "/admin/homepage") {
      const { data } = await supabase
        .from("homepage_config")
        .select("config")
        .or("section_key.eq.default,key.eq.default")
        .limit(1)
        .maybeSingle();
      return camelize(data?.config ?? {});
    }
    if (path === "/admin/settings") {
      const { data } = await supabase.from("site_settings").select("settings").eq("key", "default").maybeSingle();
      return camelize(data?.settings ?? {});
    }
  }
  fail(404, `GET ${path} not implemented`);
}

const adminGetTableMap: Record<string, string> = {
  "/admin/products": "products",
  "/admin/orders": "orders",
  "/admin/blog": "blog_posts",
  "/admin/contact": "contact_submissions",
  "/admin/coupons": "coupons",
  "/admin/dimensions": "dimensions",
  "/admin/faq": "faqs",
  "/admin/notifications": "notification_log",
  "/admin/packaging-boxes": "packaging_boxes",
  "/admin/reviews": "global_reviews",
  "/admin/waitlist": "product_waitlist",
  "/admin/invoices": "invoices",
  "/admin/tracking": "order_tracking",
  "/admin/notification-queue": "notification_queue",
};

// ─── Invoice helper (admin-only path) ──────────────────────────────────────
async function ensureInvoice(orderNumber: string) {
  const { data: existing } = await supabase.from("invoices").select("*").eq("order_number", orderNumber).maybeSingle();
  if (existing) return existing;
  const { data: ord } = await supabase.from("orders").select("*").eq("order_number", orderNumber).maybeSingle();
  if (!ord) fail(404, "Order not found");

  // Fetch seller info from site settings (gst block)
  const { data: settingsRow } = await supabase.from("site_settings").select("settings").eq("key", "default").maybeSingle();
  const st: any = settingsRow?.settings || {};
  const gstCfg: any = st.gst || {};
  const seller = {
    legalName: gstCfg.legalName || st.siteName || "",
    address: gstCfg.address || st.address || "",
    gstin: gstCfg.gstin || st.gstin || "",
    stateCode: String(gstCfg.stateCode || "").trim(),
    email: st.email || "",
    phone: st.phone || "",
    invoicePrefix: gstCfg.invoicePrefix || "INV",
    defaultHsn: gstCfg.defaultHsn || "2106",
    defaultGstRate: Number(gstCfg.defaultGstRate ?? 5),
  };

  // Fetch product tax info for items
  const ids = Array.from(new Set((ord!.items as any[] || []).map((i: any) => String(i.productId || i.id || "")).filter(Boolean)));
  const { data: prods } = ids.length
    ? await supabase.from("products").select("id,hsn_code,gst_rate").in("id", ids)
    : { data: [] as any[] };
  const productMap = new Map<string, { hsnCode: string; gstRate: number }>();
  (prods || []).forEach((p: any) => productMap.set(p.id, { hsnCode: p.hsn_code || "", gstRate: Number(p.gst_rate ?? 5) }));

  const { buildInvoiceSnapshot } = await import("./invoice.shared");
  const snapshot = buildInvoiceSnapshot(ord, productMap, seller);

  // Use DB sequence for monotonic invoice numbers
  const { data: numRow } = await supabase.rpc("next_invoice_number");
  const invoiceNumber = (numRow as string) || `INV-${new Date().toISOString().slice(0,7).replace("-","")}-${Date.now()}`;

  const { data: inv, error } = await supabase.from("invoices").insert({
    id: crypto.randomUUID(), order_id: ord!.id, order_number: orderNumber,
    invoice_number: invoiceNumber, snapshot,
  }).select().single();
  if (error) fail(500, error.message);
  return inv;
}

// POST
const POST: Record<string, Handler> = {
  "/contact": async (_p, _q, body) => {
    const id = crypto.randomUUID();
    const { error } = await supabase.from("contact_submissions").insert({
      id, name: body.name, email: body.email, phone: body.phone ?? "",
      subject: body.subject ?? "General Inquiry", message: body.message,
    });
    if (error) fail(500, error.message);
    return { success: true };
  },
  "/marketing/coupon/validate": async (_p, _q, body) => {
    // First try user-specific coupons (auto-issued after delivery)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: uc } = await supabase.from("user_coupons").select("*")
        .eq("code", body.code).eq("user_id", user.id).maybeSingle();
      if (uc) {
        if (uc.used) fail(400, "Coupon already used");
        if (uc.expires_at && new Date(uc.expires_at) < new Date()) fail(400, "Coupon expired");
        if (uc.min_order && body.orderTotal < Number(uc.min_order)) fail(400, `Min order ₹${uc.min_order}`);
        let d = uc.discount_type === "percent" ? (body.orderTotal * Number(uc.value)) / 100 : Number(uc.value);
        if (uc.max_discount) d = Math.min(d, Number(uc.max_discount));
        return camelize({ id: uc.id, code: uc.code, type: uc.discount_type, value: uc.value, source: "user_coupon", discount: d });
      }
    }
    const { data: coupon } = await supabase.from("coupons").select("*").eq("code", body.code).eq("active", true).maybeSingle();
    if (!coupon) fail(400, "Invalid coupon");
    if (coupon!.min_order_value && body.orderTotal < coupon!.min_order_value) fail(400, `Min order ₹${coupon!.min_order_value}`);
    if (coupon!.expires_at && new Date(coupon!.expires_at) < new Date()) fail(400, "Coupon expired");
    let discount = coupon!.type === "percent" ? (body.orderTotal * Number(coupon!.value)) / 100 : Number(coupon!.value);
    if (coupon!.max_discount) discount = Math.min(discount, Number(coupon!.max_discount));
    return camelize({ ...coupon!, discount });
  },
  "/payments/cod/calculate": async (_p, _q, body) => {
    const fee = body.orderTotal < 500 ? 49 : 0;
    return { codFee: fee, finalTotal: body.orderTotal + fee };
  },
  "/orders": async (_p, _q, body) => {
    const { data: { user } } = await supabase.auth.getUser();
    const id = crypto.randomUUID();
    const _rand = new Uint8Array(4);
    crypto.getRandomValues(_rand);
    const _suffix = Array.from(_rand, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const orderNumber = `NP${Date.now()}-${_suffix}`;

    let walletUsed = Math.max(0, Number(body.walletUsed || 0));
    if (walletUsed > 0) {
      if (!user) fail(401, "Login required to use wallet");
      const { data: w } = await supabase.from("user_wallets").select("balance").eq("user_id", user.id).maybeSingle();
      const bal = Number(w?.balance || 0);
      if (bal <= 0) walletUsed = 0;
      else if (walletUsed > bal) walletUsed = bal;
    }
    const finalTotal = Math.max(0, Number(body.total) - walletUsed);

    const shippingAddr = { ...(body.shippingAddress || {}) };
    if (body.paymentMethodOffer) shippingAddr.paymentMethodOffer = body.paymentMethodOffer;
    if (walletUsed > 0) shippingAddr.walletUsed = walletUsed;

    const payload: any = {
      id, order_number: orderNumber,
      user_id: user?.id ?? null,
      items: body.items ?? [],
      subtotal: body.subtotal ?? 0,
      shipping_cost: body.shipping ?? 0,
      discount: (body.discount ?? 0) + walletUsed,
      total: finalTotal,
      coupon_code: body.couponCode ?? "",
      customer_name: body.shippingAddress?.name ?? "",
      customer_email: body.shippingAddress?.email ?? user?.email ?? "",
      customer_phone: body.shippingAddress?.phone ?? "",
      shipping_address: shippingAddr,
      payment_method: body.paymentMethod ?? "cod",
      payment_status: body.paymentStatus ?? "pending",
      order_status: "pending",
      priority_shipping: !!body.priorityShipping,
    };


    const { data, error } = await supabase.from("orders").insert(payload).select().single();
    if (error) fail(500, error.message);

    if (walletUsed > 0 && user) {
      await supabase.from("wallet_transactions").insert({
        user_id: user.id, amount: -walletUsed, type: "debit", source: "order_redeem",
        order_id: orderNumber, note: `Redeemed on ${orderNumber}`,
      });
      const { data: w2 } = await supabase.from("user_wallets").select("balance").eq("user_id", user.id).maybeSingle();
      const newBal = Math.max(0, Number(w2?.balance || 0) - walletUsed);
      await supabase.from("user_wallets").upsert({ user_id: user.id, balance: newBal, updated_at: new Date().toISOString() });
    }

    if (body.userCouponId && user) {
      await supabase.from("user_coupons").update({ used: true, used_order_id: orderNumber })
        .eq("id", body.userCouponId).eq("user_id", user.id);
    }

    return camelize(data);
  },
  "/admin/wallet/adjust": async (_p, _q, body) => {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const userId = body.userId;
    const amount = Number(body.amount || 0);
    if (!userId || !amount) fail(400, "userId and amount required");
    const type = amount > 0 ? "credit" : "debit";
    await supabase.from("wallet_transactions").insert({
      user_id: userId, amount, type, source: "admin", note: body.note ?? "Admin adjustment",
      expires_at: body.expiresAt ?? null,
    });
    const { data: w } = await supabase.from("user_wallets").select("balance").eq("user_id", userId).maybeSingle();
    const newBal = Math.max(0, Number(w?.balance || 0) + amount);
    await supabase.from("user_wallets").upsert({ user_id: userId, balance: newBal, updated_at: new Date().toISOString() });
    return { success: true, balance: newBal };
  },
  "/admin/wallet/bulk-credit": async (_p, _q, body) => {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const amount = Number(body.amount || 0);
    if (amount <= 0) fail(400, "Amount must be positive");
    const segment = body.segment || "all"; // 'all' | 'active' | 'inactive' | 'specific'
    const expiresAt = body.expiryDays ? new Date(Date.now() + Number(body.expiryDays) * 86400e3).toISOString() : null;
    const note = body.note || "Bulk wallet credit by admin";

    let userIds: string[] = [];
    if (segment === "specific" && Array.isArray(body.userIds)) {
      userIds = body.userIds;
    } else {
      const { data: profiles } = await supabase.from("profiles").select("id");
      const all = (profiles ?? []).map((p: any) => p.id);
      if (segment === "active" || segment === "inactive") {
        const { data: orders } = await supabase.from("orders").select("user_id").not("user_id", "is", null);
        const buyers = new Set((orders ?? []).map((o: any) => o.user_id));
        userIds = segment === "active" ? all.filter((id) => buyers.has(id)) : all.filter((id) => !buyers.has(id));
      } else {
        userIds = all;
      }
    }
    if (!userIds.length) return { success: true, credited: 0 };

    // Insert transactions in batches
    const txns = userIds.map((uid) => ({
      user_id: uid, amount, type: "credit", source: "bulk_admin", note, expires_at: expiresAt,
    }));
    for (let i = 0; i < txns.length; i += 500) {
      await supabase.from("wallet_transactions").insert(txns.slice(i, i + 500));
    }
    // Upsert balances
    const { data: existing } = await supabase.from("user_wallets").select("user_id,balance").in("user_id", userIds);
    const balMap = new Map((existing ?? []).map((w: any) => [w.user_id, Number(w.balance || 0)]));
    const upserts = userIds.map((uid) => ({
      user_id: uid,
      balance: (balMap.get(uid) ?? 0) + amount,
      updated_at: new Date().toISOString(),
    }));
    for (let i = 0; i < upserts.length; i += 500) {
      await supabase.from("user_wallets").upsert(upserts.slice(i, i + 500));
    }
    // Best-effort notification
    const notifs = userIds.map((uid) => ({
      user_id: uid, title: "💰 Wallet credited ₹" + amount, body: note, type: "success", link: "/account",
    }));
    for (let i = 0; i < notifs.length; i += 500) {
      await supabase.from("user_notifications").insert(notifs.slice(i, i + 500));
    }
    return { success: true, credited: userIds.length, amount };
  },
  "/admin/wallet/expire-now": async () => {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    // Manual sweep — uses same logic as wallet_expire_now but invokable from client RLS
    const now = new Date().toISOString();
    const { data: expired } = await supabase
      .from("wallet_transactions")
      .select("user_id, amount")
      .eq("type", "credit")
      .not("expires_at", "is", null)
      .lt("expires_at", now);
    if (!expired?.length) return { success: true, expired: 0 };
    const byUser = new Map<string, number>();
    for (const t of expired) byUser.set(t.user_id, (byUser.get(t.user_id) ?? 0) + Number(t.amount));
    let count = 0;
    for (const [uid, amt] of byUser) {
      // skip if an expire of same total already exists today (idempotency-lite)
      await supabase.from("wallet_transactions").insert({
        user_id: uid, amount: -amt, type: "expire", source: "system", note: "Auto expired ₹" + amt,
      });
      const { data: w } = await supabase.from("user_wallets").select("balance").eq("user_id", uid).maybeSingle();
      const newBal = Math.max(0, Number(w?.balance || 0) - amt);
      await supabase.from("user_wallets").upsert({ user_id: uid, balance: newBal, updated_at: new Date().toISOString() });
      await supabase.from("user_notifications").insert({
        user_id: uid, title: "⏰ Wallet credit expired", body: "₹" + amt + " has expired.", type: "warning", link: "/account",
      });
      // Mark transactions as expired by nulling their expiry (so they're not re-swept)
      await supabase.from("wallet_transactions").update({ expires_at: null })
        .eq("user_id", uid).eq("type", "credit").not("expires_at", "is", null).lt("expires_at", now);
      count++;
    }
    return { success: true, expired: count };
  },
  "/admin/wallet/rule-save": async (_p, _q, body) => {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const row = snakeify(body);
    delete row._id;
    const { data, error } = await supabase.from("wallet_rules").upsert(row).select().single();
    if (error) fail(500, error.message);
    return camelize(data);
  },
  "/admin/wallet/settings-save": async (_p, _q, body) => {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    await supabase.from("site_settings").upsert({ key: "wallet", settings: body, updated_at: new Date().toISOString() });
    return body;
  },
};


async function dynamicPost(path: string, body: any): Promise<any> {
  // /products/:id/review
  let m = path.match(/^\/products\/([^/]+)\/review$/);
  if (m) {
    const id = crypto.randomUUID();
    const { error } = await supabase.from("product_reviews").insert({
      id, product_id: m[1], name: body.name, comment: body.comment,
      rating: body.rating ?? 5, title: body.title ?? "",
    });
    if (error) fail(500, error.message);
    return { success: true };
  }
  // /products/:id/notify-me
  m = path.match(/^\/products\/([^/]+)\/notify-me$/);
  if (m) {
    const id = crypto.randomUUID();
    await supabase.from("product_waitlist").insert({
      id, product_id: m[1], product_name: body.productName ?? "",
      email: body.email, name: body.name ?? "",
    });
    return { success: true };
  }
  // /products/:id/reviews/:rid/helpful
  m = path.match(/^\/products\/[^/]+\/reviews\/([^/]+)\/helpful$/);
  if (m) {
    return { success: true }; // increment-skip for now (RLS would block)
  }
  // /admin/orders/:orderNumber/invoice → generate invoice (idempotent)
  m = path.match(/^\/admin\/orders\/([^/]+)\/invoice$/);
  if (m) {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const inv = await ensureInvoice(m[1]);
    return camelize(inv);
  }
  // /admin/orders/:orderNumber/tracking → upsert tracking + log status change
  m = path.match(/^\/admin\/orders\/([^/]+)\/tracking$/);
  if (m) {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const orderNumber = m[1];
    const { data: ord } = await supabase.from("orders").select("id,order_status").eq("order_number", orderNumber).maybeSingle();
    if (!ord) fail(404, "Order not found");
    const { data: existing } = await supabase.from("order_tracking").select("status_history").eq("order_number", orderNumber).maybeSingle();
    const history = Array.isArray(existing?.status_history) ? existing!.status_history : [];
    if (body.status) history.push({ status: body.status, note: body.note ?? "", at: new Date().toISOString() });
    const row = {
      id: existing ? undefined : crypto.randomUUID(),
      order_id: ord!.id, order_number: orderNumber,
      courier: body.courier ?? "", awb_number: body.awbNumber ?? "",
      tracking_url: body.trackingUrl ?? "",
      current_status: body.status ?? (Array.isArray(history) && history.length ? (history[history.length - 1] as any)?.status : "pending"),
      status_history: history,
      estimated_delivery: body.estimatedDelivery ?? null,
      manual_override: true,
      last_synced_at: new Date().toISOString(),
    };
    // Drop undefined id so upsert can match by unique order_number
    if (!row.id) delete (row as any).id;
    const { data, error } = await supabase.from("order_tracking").upsert(row, { onConflict: "order_number" }).select().single();
    if (error) fail(500, error.message);
    // If status maps to an order_status, also update the parent order (triggers customer notification)
    const statusMap: Record<string, string> = {
      shipped: "shipped", out_for_delivery: "out_for_delivery", delivered: "delivered",
    };
    if (body.status && statusMap[body.status]) {
      await supabase.from("orders").update({ order_status: statusMap[body.status] }).eq("order_number", orderNumber);
    }
    return camelize(data);
  }
  // /admin/orders/:orderNumber/status → update order_status / payment_status
  m = path.match(/^\/admin\/orders\/([^/]+)\/status$/);
  if (m) {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const patch: any = {};
    if (body.orderStatus) patch.order_status = body.orderStatus;
    if (body.paymentStatus) patch.payment_status = body.paymentStatus;
    if (body.notes !== undefined) patch.notes = body.notes;
    const { data, error } = await supabase.from("orders").update(patch).eq("order_number", m[1]).select().single();
    if (error) fail(500, error.message);
    return camelize(data);
  }
  // /admin/orders/:orderNumber/retry-shipment → reset auto-ship attempts & trigger cron
  m = path.match(/^\/admin\/orders\/([^/]+)\/retry-shipment$/);
  if (m) {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const { error } = await supabase.from("orders").update({
      auto_ship_attempts: 0,
      auto_ship_last_error: null,
      auto_ship_scheduled_at: new Date(Date.now() - 1000).toISOString(),
    }).eq("order_number", m[1]);
    if (error) fail(500, error.message);
    // Best-effort: kick the cron immediately (don't block if it fails)
    try { fetch("/api/public/auto-shipment", { method: "POST" }).catch(() => {}); } catch {}
    return { success: true };
  }
  // /admin/notifications/dispatch → run the real provider-agnostic dispatcher
  if (path === "/admin/notifications/dispatch") {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const { dispatchMessages } = await import("./messaging.functions");
    const result = await dispatchMessages({ data: {} });
    return { ...result, processed: result.sent };
  }
  // /admin/notification-queue/:id/retry → reset failed/external to pending
  m = path.match(/^\/admin\/notification-queue\/([^/]+)\/retry$/);
  if (m) {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const { error } = await supabase.from("notification_queue").update({
      status: "pending", attempts: 0, error: "", next_attempt_at: new Date().toISOString(),
    }).eq("id", m[1]);
    if (error) fail(500, error.message);
    return { success: true };
  }
  // /admin/orders/:orderNumber/notify → manually enqueue a template (re-send)
  m = path.match(/^\/admin\/orders\/([^/]+)\/notify$/);
  if (m) {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    const { data: ord } = await supabase.from("orders").select("*").eq("order_number", m[1]).maybeSingle();
    if (!ord) fail(404, "Order not found");
    const payload = { orderNumber: ord!.order_number, customerName: ord!.customer_name, total: ord!.total };
    const tpl = body.template || "order_placed";
    if (ord!.user_id) {
      await supabase.from("user_notifications").insert({
        user_id: ord!.user_id,
        title: body.title || `Update on ${ord!.order_number}`,
        body: body.body || `Your order status: ${tpl.replace(/_/g, " ")}`,
        type: "info", link: `/track-order?order=${ord!.order_number}`,
      });
    }
    if (ord!.customer_email) {
      await supabase.from("notification_queue").insert({
        user_id: ord!.user_id, order_number: ord!.order_number, channel: "email",
        template: tpl, recipient: ord!.customer_email, payload,
      });
    }
    return { success: true };
  }
  // /admin/*
  if (path.startsWith("/admin/")) {
    if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
    return adminUpsert(path, body);
  }
  fail(404, `POST ${path} not implemented`);
}

async function adminUpsert(path: string, body: any): Promise<any> {
  const tableMap: Record<string, string> = {
    "/admin/products": "products",
    "/admin/blog": "blog_posts",
    "/admin/coupons": "coupons",
    "/admin/dimensions": "dimensions",
    "/admin/faq": "faqs",
    "/admin/packaging-boxes": "packaging_boxes",
    "/admin/reviews": "global_reviews",
  };
  const table = tableMap[path];
  if (!table) fail(404, `Admin endpoint ${path} not mapped`);
  const row = { id: body.id || body._id || crypto.randomUUID(), ...snakeify(body) };
  delete (row as any)._id;
  const { data, error } = await supabase.from(table as any).upsert(row).select().single();
  if (error) fail(500, error.message);
  return camelize(data);
}

function snakeify(obj: any): any {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out: any = {};
  for (const k of Object.keys(obj)) {
    const sk = k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
    out[sk] = obj[k];
  }
  return out;
}

// PUT
async function dynamicPut(path: string, body: any): Promise<any> {
  if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
  if (path === "/admin/homepage") {
    await supabase
      .from("homepage_config")
      .upsert({ section_key: "default", key: "default", config: body }, { onConflict: "section_key" });
    return body;
  }
  if (path === "/admin/settings") {
    const { data: current } = await supabase
      .from("site_settings")
      .select("settings")
      .eq("key", "default")
      .maybeSingle();
    const merged = { ...((current?.settings as any) ?? {}), ...(body ?? {}) };
    await supabase.from("site_settings").upsert({ key: "default", settings: merged });
    return merged;
  }
  // /admin/<table>/<id>  → upsert row by id (camelCase body is snakeified)
  const m = path.match(/^\/admin\/([^/]+)\/([^/]+)$/);
  if (m) {
    const tableMap: Record<string, string> = {
      products: "products",
      blog: "blog_posts",
      coupons: "coupons",
      dimensions: "dimensions",
      faq: "faqs",
      "packaging-boxes": "packaging_boxes",
      reviews: "global_reviews",
    };
    const table = tableMap[m[1]];
    if (table) {
      const row = { ...snakeify(body), id: m[2] };
      delete (row as any)._id;
      const { data, error } = await supabase.from(table as any).upsert(row).select().single();
      if (error) fail(500, error.message);
      return camelize(data);
    }
  }
  fail(404, `PUT ${path} not implemented`);
}

// DELETE
async function dynamicDelete(path: string): Promise<any> {
  if (!(await isCurrentUserAdmin())) fail(403, "Admin only");
  const m = path.match(/^\/admin\/notifications\/([^/]+)$/);
  if (m) {
    await supabase.from("notification_log").delete().eq("id", m[1]);
    return { success: true };
  }
  if (path === "/admin/notifications") {
    await supabase.from("notification_log").delete().neq("id", "");
    return { success: true };
  }
  // /admin/<table>/<id> → delete row by id
  const mm = path.match(/^\/admin\/([^/]+)\/([^/]+)$/);
  if (mm) {
    const tableMap: Record<string, string> = {
      products: "products",
      blog: "blog_posts",
      coupons: "coupons",
      dimensions: "dimensions",
      faq: "faqs",
      "packaging-boxes": "packaging_boxes",
      reviews: "global_reviews",
      orders: "orders",
      contact: "contact_submissions",
      waitlist: "product_waitlist",
    };
    const table = tableMap[mm[1]];
    if (table) {
      const { error } = await supabase.from(table as any).delete().eq("id", mm[2]);
      if (error) fail(500, error.message);
      return { success: true };
    }
  }
  fail(404, `DELETE ${path} not implemented`);
}

// ---------- public client ----------
async function dispatch(method: "get" | "post" | "put" | "patch" | "delete", url: string, body?: any): Promise<{ data: any }> {
  // strip absolute origin and /api prefix so the same handler map works for
  // both internal API calls (`/products`) and legacy `${VITE_API_URL}/admin/...` calls.
  let cleaned = url;
  try { cleaned = new URL(url).pathname + (new URL(url).search || ""); } catch {}
  cleaned = cleaned.replace(/^\/api(?=\/|$)/, "") || "/";
  const { path, params } = parsePath(cleaned);
  try {
    if (method === "get") {
      const fn = GET[path];
      const data = fn ? await fn(path, params) : await dynamicGet(path);
      return ok(data);
    }
    if (method === "post") {
      const fn = POST[path];
      const data = fn ? await fn(path, params, body) : await dynamicPost(path, body);
      return ok(data);
    }
    if (method === "put" || method === "patch") return ok(await dynamicPut(path, body));
    if (method === "delete") return ok(await dynamicDelete(path));
    return fail(405, "Method not allowed");
  } catch (e: any) {
    if (e?.response) throw e;
    const err: any = new Error(e?.message ?? "Request failed");
    err.response = { status: 500, data: { message: e?.message ?? "Request failed" } };
    throw err;
  }
}

type ApiResp = { data: any };
const API = {
  get: (url: string): Promise<ApiResp> => dispatch("get", url),
  post: (url: string, data?: unknown): Promise<ApiResp> => dispatch("post", url, data),
  put: (url: string, data?: unknown): Promise<ApiResp> => dispatch("put", url, data),
  patch: (url: string, data?: unknown): Promise<ApiResp> => dispatch("patch", url, data),
  delete: (url: string): Promise<ApiResp> => dispatch("delete", url),
  request: (cfg: any): Promise<ApiResp> => dispatch((cfg?.method || "get").toLowerCase(), cfg.url, cfg?.data),
  interceptors: { request: { use: (_fn?: any) => {} }, response: { use: (_fn?: any) => {} } },
  create: (_cfg?: any): any => API,
};

export default API;

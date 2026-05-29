import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Search, ShoppingCart, CreditCard, Star, MessageCircle, Wallet,
  Gift, RefreshCw, Bell, Globe, Activity, Clock, AlertCircle,
} from "lucide-react";

type Bucket =
  | "auth" | "browse" | "cart" | "checkout" | "orders"
  | "reviews" | "support" | "wallet" | "loyalty" | "notifications" | "other";

type Row = {
  id: string;
  bucket: Bucket;
  ts: string;
  title: string;
  detail?: string;
  amount?: number;
  meta?: any;
};

const BUCKET_META: Record<Bucket, { label: string; icon: any; color: string }> = {
  auth:          { label: "Auth & Identity",    icon: User,         color: "bg-slate-100 text-slate-700" },
  browse:        { label: "Browsing",           icon: Globe,        color: "bg-blue-50 text-blue-700" },
  cart:          { label: "Cart Activity",      icon: ShoppingCart, color: "bg-amber-50 text-amber-700" },
  checkout:      { label: "Checkout",           icon: CreditCard,   color: "bg-violet-50 text-violet-700" },
  orders:        { label: "Orders & Shipping",  icon: RefreshCw,    color: "bg-green-50 text-green-700" },
  reviews:       { label: "Reviews & Q&A",      icon: Star,         color: "bg-yellow-50 text-yellow-700" },
  support:       { label: "Support & Chat",     icon: MessageCircle, color: "bg-pink-50 text-pink-700" },
  wallet:        { label: "Wallet",             icon: Wallet,       color: "bg-emerald-50 text-emerald-700" },
  loyalty:       { label: "Loyalty & Referrals", icon: Gift,        color: "bg-fuchsia-50 text-fuchsia-700" },
  notifications: { label: "Notifications",      icon: Bell,         color: "bg-cyan-50 text-cyan-700" },
  other:         { label: "Other",              icon: Activity,     color: "bg-gray-100 text-gray-700" },
};

const AUTH_TYPES = new Set(["login", "logout", "signup", "password_reset", "otp_sent", "otp_verified", "2fa"]);
const BROWSE_TYPES = new Set(["page_view", "product_view", "search", "category_view", "blog_view"]);
const CART_TYPES = new Set(["add_to_cart", "remove_from_cart", "cart_view", "wishlist_add", "wishlist_remove"]);
const CHECKOUT_TYPES = new Set(["begin_checkout", "add_payment_info", "add_shipping_info", "checkout_step"]);
const ORDER_TYPES = new Set(["purchase", "order_placed", "order_cancelled", "order_shipped", "order_delivered"]);

function classify(eventType: string): Bucket {
  const t = (eventType || "").toLowerCase();
  if (AUTH_TYPES.has(t)) return "auth";
  if (BROWSE_TYPES.has(t)) return "browse";
  if (CART_TYPES.has(t)) return "cart";
  if (CHECKOUT_TYPES.has(t)) return "checkout";
  if (ORDER_TYPES.has(t)) return "orders";
  if (t.includes("review") || t.includes("rating") || t.includes("qa") || t.includes("question")) return "reviews";
  if (t.includes("chat") || t.includes("support") || t.includes("whatsapp")) return "support";
  if (t.includes("wallet")) return "wallet";
  if (t.includes("referral") || t.includes("loyalty") || t.includes("coupon") || t.includes("gift")) return "loyalty";
  if (t.includes("notification") || t.includes("push") || t.includes("email")) return "notifications";
  return "other";
}

type UserSummary = {
  user_id: string | null;
  session_id: string;
  email?: string | null;
  last_seen: string;
  events: number;
};

export default function Customer360Tab() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<UserSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingUsers(true);
      // Recent active users / sessions from site_events (last 30 days)
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data, error } = await (supabase as any)
        .from("site_events")
        .select("user_id, session_id, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (cancelled) return;
      if (error || !data) { setUsers([]); setLoadingUsers(false); return; }
      const map = new Map<string, UserSummary>();
      for (const r of data as any[]) {
        const key = r.user_id || `s:${r.session_id}`;
        const cur = map.get(key);
        if (cur) {
          cur.events += 1;
          if (r.created_at > cur.last_seen) cur.last_seen = r.created_at;
        } else {
          map.set(key, {
            user_id: r.user_id ?? null,
            session_id: r.session_id,
            last_seen: r.created_at,
            events: 1,
          });
        }
      }
      const list = Array.from(map.values()).sort((a, b) => b.last_seen.localeCompare(a.last_seen));
      setUsers(list);
      setLoadingUsers(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users.slice(0, 200);
    return users
      .filter(u =>
        (u.user_id || "").toLowerCase().includes(needle) ||
        u.session_id.toLowerCase().includes(needle) ||
        (u.email || "").toLowerCase().includes(needle))
      .slice(0, 200);
  }, [users, q]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      {/* LEFT — user list */}
      <aside className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search user id / session…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:border-orange-400"
            />
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            {loadingUsers ? "Loading…" : `${users.length} active in last 30 days`}
          </p>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
          {filtered.map(u => {
            const key = u.user_id || u.session_id;
            const active = selected && (selected.user_id || selected.session_id) === key;
            return (
              <button
                key={key}
                onClick={() => setSelected(u)}
                className={`w-full text-left px-3 py-2.5 hover:bg-orange-50 transition ${active ? "bg-orange-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${u.user_id ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {u.user_id ? <User size={14} /> : "G"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-gray-800 truncate">{u.user_id ?? `guest · ${u.session_id.slice(0, 10)}`}</p>
                    <p className="text-[10px] text-gray-500">
                      {u.events} events · {timeAgo(u.last_seen)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
          {!loadingUsers && filtered.length === 0 && (
            <p className="p-6 text-center text-xs text-gray-400">No matches</p>
          )}
        </div>
      </aside>

      {/* RIGHT — timeline */}
      <section>
        {selected ? (
          <UserTimeline key={selected.user_id || selected.session_id} user={selected} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Activity className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-sm text-gray-500">Select a customer to see section-wise activity</p>
            <p className="mt-1 text-xs text-gray-400">Every page view, cart move, checkout step, order, refund, review & chat — grouped & sorted live.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function UserTimeline({ user }: { user: UserSummary }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBucket, setActiveBucket] = useState<Bucket | "all">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const all: Row[] = [];

      // 1) site_events — primary stream
      const q1 = (supabase as any).from("site_events")
        .select("id, event_type, product_name, path, value, quantity, meta, created_at, user_id, session_id")
        .order("created_at", { ascending: false })
        .limit(500);
      const eventsRes = user.user_id
        ? await q1.eq("user_id", user.user_id)
        : await q1.eq("session_id", user.session_id);

      for (const e of (eventsRes.data as any[] || [])) {
        all.push({
          id: `ev:${e.id}`,
          bucket: classify(e.event_type),
          ts: e.created_at,
          title: humanizeEvent(e.event_type),
          detail: [e.product_name, e.path].filter(Boolean).join(" · "),
          amount: e.value ?? undefined,
          meta: e.meta,
        });
      }

      if (user.user_id) {
        // 2) wallet transactions
        const w = await (supabase as any).from("wallet_transactions")
          .select("id, amount, type, description, created_at")
          .eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(50);
        for (const r of (w.data as any[] || [])) {
          all.push({
            id: `w:${r.id}`, bucket: "wallet", ts: r.created_at,
            title: `Wallet ${r.type}`, detail: r.description, amount: r.amount,
          });
        }
        // 3) user notifications
        const n = await (supabase as any).from("user_notifications")
          .select("id, title, body, kind, created_at")
          .eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(50);
        for (const r of (n.data as any[] || [])) {
          all.push({
            id: `n:${r.id}`, bucket: "notifications", ts: r.created_at,
            title: r.title || `Notification (${r.kind})`, detail: r.body,
          });
        }
        // 4) return requests
        const ret = await (supabase as any).from("return_requests")
          .select("id, order_number, status, reason, created_at")
          .eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20);
        for (const r of (ret.data as any[] || [])) {
          all.push({
            id: `ret:${r.id}`, bucket: "orders", ts: r.created_at,
            title: `Return ${r.status} · #${r.order_number}`, detail: r.reason,
          });
        }
        // 5) product questions
        const qa = await (supabase as any).from("product_questions")
          .select("id, question, status, created_at")
          .eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20);
        for (const r of (qa.data as any[] || [])) {
          all.push({
            id: `qa:${r.id}`, bucket: "reviews", ts: r.created_at,
            title: `Asked a question (${r.status})`, detail: r.question,
          });
        }
        // 6) referrals sent
        const ref = await (supabase as any).from("referral_events")
          .select("id, event, reward_amount, created_at")
          .eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20);
        for (const r of (ref.data as any[] || [])) {
          all.push({
            id: `ref:${r.id}`, bucket: "loyalty", ts: r.created_at,
            title: `Referral ${r.event}`, amount: r.reward_amount,
          });
        }
        // 7) subscriptions
        const sub = await (supabase as any).from("subscriptions")
          .select("id, status, plan_name, next_charge_at, created_at")
          .eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(10);
        for (const r of (sub.data as any[] || [])) {
          all.push({
            id: `sub:${r.id}`, bucket: "orders", ts: r.created_at,
            title: `Subscription ${r.status} · ${r.plan_name || ""}`,
            detail: r.next_charge_at ? `next charge ${new Date(r.next_charge_at).toLocaleDateString()}` : undefined,
          });
        }
        // 8) abandoned carts
        const ab = await (supabase as any).from("abandoned_carts")
          .select("id, total, items_count, recovered, created_at")
          .eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(10);
        for (const r of (ab.data as any[] || [])) {
          all.push({
            id: `ab:${r.id}`, bucket: "cart", ts: r.created_at,
            title: r.recovered ? "Abandoned cart RECOVERED" : "Cart abandoned",
            detail: `${r.items_count ?? 0} items`, amount: r.total,
          });
        }
      }

      if (cancelled) return;
      all.sort((a, b) => b.ts.localeCompare(a.ts));
      setRows(all);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user.user_id, user.session_id]);

  const stats = useMemo(() => {
    const s: Record<Bucket, number> = {
      auth: 0, browse: 0, cart: 0, checkout: 0, orders: 0,
      reviews: 0, support: 0, wallet: 0, loyalty: 0, notifications: 0, other: 0,
    };
    let revenue = 0;
    for (const r of rows) {
      s[r.bucket] += 1;
      if (r.bucket === "orders" && r.amount && r.amount > 0) revenue += Number(r.amount);
    }
    return { s, revenue };
  }, [rows]);

  const visible = activeBucket === "all" ? rows : rows.filter(r => r.bucket === activeBucket);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-gradient-to-br from-orange-50 via-white to-pink-50 rounded-2xl border border-orange-100 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-orange-600 font-semibold">Customer 360°</p>
            <h2 className="font-mono text-base font-bold text-gray-900 mt-1 break-all">
              {user.user_id ?? `Guest session · ${user.session_id}`}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Last seen {timeAgo(user.last_seen)} · {rows.length} events tracked</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="bg-white rounded-xl border border-gray-200 px-3 py-2">
              <p className="text-[10px] text-gray-500">Total revenue</p>
              <p className="font-bold text-gray-900">₹{stats.revenue.toFixed(0)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 px-3 py-2">
              <p className="text-[10px] text-gray-500">Activity score</p>
              <p className="font-bold text-gray-900">{Math.min(100, Math.round(rows.length / 5))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section chips */}
      <div className="flex gap-2 flex-wrap">
        <Chip active={activeBucket === "all"} onClick={() => setActiveBucket("all")} label={`All · ${rows.length}`} color="bg-gray-900 text-white" />
        {(Object.keys(BUCKET_META) as Bucket[]).map(b => {
          if (stats.s[b] === 0) return null;
          const meta = BUCKET_META[b];
          const Icon = meta.icon;
          return (
            <Chip
              key={b}
              active={activeBucket === b}
              onClick={() => setActiveBucket(b)}
              label={`${meta.label} · ${stats.s[b]}`}
              color={meta.color}
              icon={<Icon size={12} />}
            />
          );
        })}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading activity…</div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto text-gray-300 mb-2" size={28} />
            <p className="text-sm text-gray-500">No activity in this section yet</p>
          </div>
        ) : (
          <ol className="divide-y divide-gray-100">
            {visible.map(r => {
              const meta = BUCKET_META[r.bucket];
              const Icon = meta.icon;
              return (
                <li key={r.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition">
                  <div className={`shrink-0 w-8 h-8 rounded-full ${meta.color} flex items-center justify-center`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 justify-between">
                      <p className="text-sm font-medium text-gray-900">{r.title}</p>
                      <p className="text-[10px] text-gray-400 shrink-0 flex items-center gap-1">
                        <Clock size={10} /> {timeAgo(r.ts)}
                      </p>
                    </div>
                    {r.detail && <p className="text-xs text-gray-600 mt-0.5 break-words">{r.detail}</p>}
                    {r.amount != null && (
                      <p className="text-[11px] text-gray-700 mt-1">
                        Amount: <span className="font-semibold">₹{Number(r.amount).toFixed(2)}</span>
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">{meta.label}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label, color, icon }: { active: boolean; onClick: () => void; label: string; color: string; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${active ? color : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"}`}
    >
      {icon}{label}
    </button>
  );
}

function humanizeEvent(t: string): string {
  if (!t) return "Event";
  return t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
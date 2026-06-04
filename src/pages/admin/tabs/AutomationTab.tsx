// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toggleShipmentAutomation, manualBookShipment } from "@/lib/automation-controls.functions";
import { Zap, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, Activity, Play, Package, Truck, Pause, PlayCircle, Wrench, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TabHelp } from './_TabHelp';

type Run = {
  id: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  trigger: string;
  processed: number;
  booked: number;
  failed: number;
  skipped: number;
  error: string | null;
  results: any[];
};

type Order = {
  id: string;
  order_number: string;
  customer_name: string | null;
  created_at: string;
  order_status: string;
  payment_method: string | null;
  payment_status: string | null;
  priority_shipping: boolean;
  auto_ship_attempts: number;
  auto_ship_last_error: string | null;
  shipping_address: any;
  total: number;
};

type Tracking = { order_number: string; courier: string; awb_number: string; tracking_url: string; updated_at: string };

const fmtTime = (iso: string | null) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
};

const fmtETA = (iso: string, delayMin: number) => {
  const target = new Date(iso).getTime() + delayMin * 60_000;
  const diff = target - Date.now();
  if (diff <= 0) return { label: "Ready", ready: true };
  const m = Math.ceil(diff / 60_000);
  if (m < 60) return { label: `in ${m}m`, ready: false };
  return { label: `in ${Math.floor(m / 60)}h ${m % 60}m`, ready: false };
};

export default function AutomationTab() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [recentTracking, setRecentTracking] = useState<Tracking[]>([]);
  const [counts, setCounts] = useState({ awaiting: 0, scheduled: 0, bookedToday: 0, failed: 0 });
  const [running, setRunning] = useState(false);
  const [retryingOrder, setRetryingOrder] = useState<string | null>(null);
  const [config, setConfig] = useState<{ enabled: boolean; delayMinutes: number; priorityDelayMinutes: number; volumetricDivisor: number }>(
    { enabled: true, delayMinutes: 120, priorityDelayMinutes: 10, volumetricDivisor: 5000 }
  );
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: runsData }, { data: settings }, { data: orders }, { data: tracking }] = await Promise.all([
        supabase.from("shipment_automation_runs").select("*").order("started_at", { ascending: false }).limit(20),
        supabase.from("site_settings").select("settings").eq("key", "default").maybeSingle(),
        supabase.from("orders").select("*").in("order_status", ["confirmed", "processing"]).order("created_at", { ascending: false }).limit(50),
        supabase.from("order_tracking").select("order_number, courier, awb_number, tracking_url, updated_at").order("updated_at", { ascending: false }).limit(10),
      ]);

      setRuns((runsData as Run[]) || []);
      setRecentTracking((tracking as Tracking[]) || []);

      const ship = ((settings?.settings as any)?.shipping) || {};
      const auto = ship.automation || {};
      setConfig({
        enabled: auto.enabled !== false,
        delayMinutes: Number(auto.delayMinutes) || 120,
        priorityDelayMinutes: Number(auto.priorityDelayMinutes) || 10,
        volumetricDivisor: Number(auto.volumetricDivisor) || 5000,
      });

      const orderList = (orders as Order[]) || [];
      const shippedSet = new Set((tracking || []).map((t: any) => t.order_number));
      const eligible = orderList.filter((o) => !shippedSet.has(o.order_number));
      setPendingOrders(eligible);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const bookedToday = (tracking || []).filter((t: any) => new Date(t.updated_at) >= today).length;

      setCounts({
        awaiting: eligible.filter((o) => o.auto_ship_attempts === 0).length,
        scheduled: eligible.filter((o) => o.auto_ship_attempts > 0 && o.auto_ship_attempts < 5).length,
        bookedToday,
        failed: eligible.filter((o) => o.auto_ship_attempts >= 5).length,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/public/auto-shipment?trigger=manual", { method: "POST" });
      const json = await res.json();
      alert(json.ok
        ? `Run complete: ${json.booked || 0} booked · ${json.failed || 0} failed · ${json.skipped || 0} skipped`
        : `Failed: ${json.error || "unknown"}`);
      await load();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setRunning(false);
    }
  };

  const retryOne = async (orderNumber: string) => {
    setRetryingOrder(orderNumber);
    try {
      await supabase.from("orders").update({
        auto_ship_attempts: 0,
        auto_ship_last_error: null,
        auto_ship_scheduled_at: new Date(Date.now() - 1000).toISOString(),
      }).eq("order_number", orderNumber);
      await fetch("/api/public/auto-shipment?trigger=manual", { method: "POST" });
      await load();
    } finally {
      setRetryingOrder(null);
    }
  };

  const lastRun = runs[0];
  const lastRunAge = lastRun ? Math.floor((now - new Date(lastRun.started_at).getTime()) / 1000) : Infinity;
  const cronHealthy = lastRunAge < 300; // < 5 min
  const successRate = useMemo(() => {
    const recent = runs.slice(0, 10);
    const total = recent.reduce((s, r) => s + r.processed, 0);
    const booked = recent.reduce((s, r) => s + r.booked, 0);
    return total > 0 ? Math.round((booked / total) * 100) : 100;
  }, [runs]);

  return (
    <div className="space-y-5">
      <TabHelp topic="automation" />
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2"><Zap size={20} /> Shipment Automation Hub</h2>
            <p className="text-xs opacity-90 mt-1">After an order is confirmed: pack → rate-compare → book cheapest courier → notify admin. Fully automatic.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={load} className="bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5">
              <RefreshCw size={13} /> Refresh
            </button>
            <PauseToggle enabled={config.enabled} onChange={() => { load(); }} />
            <ManualBookButton orders={pendingOrders} onBooked={load} />
            <button onClick={runNow} disabled={running} className="bg-white text-orange-600 rounded-xl px-4 py-2 text-xs font-black flex items-center gap-1.5 disabled:opacity-60">
              <Play size={13} /> {running ? "Running…" : "Run now"}
            </button>
          </div>
        </div>
      </div>


      {/* Health strip */}
      <div className="grid sm:grid-cols-4 gap-3">
        <div className={`rounded-2xl p-4 border ${config.enabled ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Status</span>
            {config.enabled ? <CheckCircle2 size={14} className="text-green-600" /> : <XCircle size={14} className="text-gray-400" />}
          </div>
          <div className="text-lg font-black mt-1">{config.enabled ? "Active" : "Paused"}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Normal {config.delayMinutes}m · Priority {config.priorityDelayMinutes}m</div>
        </div>
        <div className={`rounded-2xl p-4 border ${cronHealthy ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Cron Health</span>
            <Activity size={14} className={cronHealthy ? "text-green-600" : "text-amber-600"} />
          </div>
          <div className="text-lg font-black mt-1">{cronHealthy ? "Healthy" : lastRun ? "Stale" : "Never run"}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Last: {lastRun ? fmtTime(lastRun.started_at) : "—"}</div>
        </div>
        <div className="rounded-2xl p-4 border bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Success Rate</span>
            <CheckCircle2 size={14} className="text-blue-600" />
          </div>
          <div className="text-lg font-black mt-1">{successRate}%</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Last {runs.slice(0, 10).length} runs</div>
        </div>
        <div className="rounded-2xl p-4 border bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Booked Today</span>
            <Truck size={14} className="text-orange-600" />
          </div>
          <div className="text-lg font-black mt-1">{counts.bookedToday}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Across all carriers</div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="grid sm:grid-cols-4 gap-3">
        {[
          { label: "Awaiting", value: counts.awaiting, color: "text-gray-700", icon: <Clock size={14} /> },
          { label: "Retrying", value: counts.scheduled, color: "text-amber-600", icon: <RefreshCw size={14} /> },
          { label: "Failed (max)", value: counts.failed, color: "text-red-600", icon: <AlertTriangle size={14} /> },
          { label: "Pending Total", value: pendingOrders.length, color: "text-orange-600", icon: <Package size={14} /> },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={`flex items-center gap-1.5 text-[11px] font-bold ${s.color}`}>{s.icon}{s.label}</div>
            <div className="text-2xl font-black mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Live queue */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-black text-sm flex items-center gap-2 mb-3"><Clock size={14} /> Live Queue ({pendingOrders.length})</h3>
        {loading ? <p className="text-xs text-gray-400">Loading…</p> : pendingOrders.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">✨ All caught up. No pending shipments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-gray-400 border-b">
                <tr>
                  <th className="text-left py-2 px-2">Order</th>
                  <th className="text-left py-2 px-2">Customer</th>
                  <th className="text-left py-2 px-2">Pin</th>
                  <th className="text-left py-2 px-2">Pay</th>
                  <th className="text-left py-2 px-2">Priority</th>
                  <th className="text-left py-2 px-2">Auto-ship in</th>
                  <th className="text-left py-2 px-2">Attempts</th>
                  <th className="text-left py-2 px-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.slice(0, 25).map((o) => {
                  const delay = o.priority_shipping ? config.priorityDelayMinutes : config.delayMinutes;
                  const eta = fmtETA(o.created_at, delay);
                  const failed = o.auto_ship_attempts >= 5;
                  return (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 px-2 font-bold">{o.order_number}</td>
                      <td className="py-2 px-2 text-gray-600">{o.customer_name || (o.shipping_address as any)?.name || "—"}</td>
                      <td className="py-2 px-2 text-gray-500">{(o.shipping_address as any)?.pincode || "—"}</td>
                      <td className="py-2 px-2 uppercase text-[10px] text-gray-500">{o.payment_method || "cod"}</td>
                      <td className="py-2 px-2">{o.priority_shipping ? <span className="text-amber-600 font-black">⚡</span> : <span className="text-gray-300">—</span>}</td>
                      <td className="py-2 px-2">
                        {failed ? <span className="text-red-600 font-bold">Failed</span>
                          : eta.ready ? <span className="text-green-600 font-bold">Ready</span>
                          : <span className="text-gray-600">{eta.label}</span>}
                      </td>
                      <td className="py-2 px-2">
                        <span className={o.auto_ship_attempts === 0 ? "text-gray-400" : o.auto_ship_attempts >= 3 ? "text-red-600 font-bold" : "text-amber-600 font-bold"}>
                          {o.auto_ship_attempts}/5
                        </span>
                        {o.auto_ship_last_error && (
                          <div className="text-[10px] text-red-500 truncate max-w-[200px]" title={o.auto_ship_last_error}>{o.auto_ship_last_error}</div>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <button onClick={() => retryOne(o.order_number)} disabled={retryingOrder === o.order_number}
                          className="text-[10px] bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg px-2 py-1 font-bold disabled:opacity-50">
                          {retryingOrder === o.order_number ? "…" : "Retry now"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent bookings */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-black text-sm flex items-center gap-2 mb-3"><Truck size={14} /> Recently Booked</h3>
        {recentTracking.length === 0 ? <p className="text-xs text-gray-400 py-4">No shipments booked yet.</p> : (
          <div className="space-y-2">
            {recentTracking.map((t) => (
              <div key={t.order_number} className="flex items-center justify-between gap-3 p-2.5 bg-gray-50 rounded-xl">
                <div className="min-w-0">
                  <div className="font-bold text-xs">{t.order_number}</div>
                  <div className="text-[10px] text-gray-500">{t.courier} · AWB {t.awb_number || "—"} · {fmtTime(t.updated_at)}</div>
                </div>
                {t.tracking_url && <a href={t.tracking_url} target="_blank" rel="noreferrer" className="text-[10px] text-orange-600 font-bold">Track →</a>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Run history */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-black text-sm flex items-center gap-2 mb-3"><Activity size={14} /> Cron Run History (last 20)</h3>
        {runs.length === 0 ? (
          <p className="text-xs text-gray-400 py-4">Cron hasn't run yet. Wait 2 mins or click "Run now".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-gray-400 border-b">
                <tr>
                  <th className="text-left py-2 px-2">When</th>
                  <th className="text-left py-2 px-2">Trigger</th>
                  <th className="text-left py-2 px-2">Processed</th>
                  <th className="text-left py-2 px-2">Booked</th>
                  <th className="text-left py-2 px-2">Failed</th>
                  <th className="text-left py-2 px-2">Duration</th>
                  <th className="text-left py-2 px-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 px-2 text-gray-600">{fmtTime(r.started_at)}</td>
                    <td className="py-2 px-2 text-[10px] uppercase text-gray-500">{r.trigger}</td>
                    <td className="py-2 px-2">{r.processed}</td>
                    <td className="py-2 px-2 text-green-600 font-bold">{r.booked}</td>
                    <td className="py-2 px-2 text-red-600 font-bold">{r.failed}</td>
                    <td className="py-2 px-2 text-gray-500">{r.duration_ms ? `${r.duration_ms}ms` : "—"}</td>
                    <td className="py-2 px-2 text-red-500 text-[10px] truncate max-w-[240px]" title={r.error || ""}>{r.error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="text-[11px] text-gray-400 bg-gray-50 rounded-xl p-3">
        💡 Detailed settings (carriers, origin pincode, automation timing, volumetric divisor) live in <b>Shipping & Couriers</b> tab. Box presets &amp; product dimensions live in <b>Dimensions</b>. Priority shipping fee in <b>Payment Gateways</b>.
      </div>
    </div>
  );
}

function PauseToggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  const fn = useServerFn(toggleShipmentAutomation);
  const [busy, setBusy] = useState(false);
  const click = async () => {
    setBusy(true);
    try {
      await fn({ data: { enabled: !enabled } });
      toast.success(!enabled ? "Automation resumed" : "Automation paused");
      onChange();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    setBusy(false);
  };
  return (
    <button onClick={click} disabled={busy}
      className={`rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 ${enabled ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"} disabled:opacity-60`}>
      {enabled ? <><Pause size={13} /> Pause</> : <><PlayCircle size={13} /> Resume</>}
    </button>
  );
}

function ManualBookButton({ orders, onBooked }: { orders: any[]; onBooked: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5">
        <Wrench size={13} /> Manual book
      </button>
      {open && <ManualBookModal orders={orders} onClose={() => setOpen(false)} onBooked={() => { setOpen(false); onBooked(); }} />}
    </>
  );
}

const CARRIER_OPTIONS = [
  { id: "shiprocket", label: "Shiprocket" },
  { id: "delhivery", label: "Delhivery" },
  { id: "shipmozo", label: "Shipmozo" },
  { id: "bluedart", label: "Bluedart" },
  { id: "dtdc", label: "DTDC" },
  { id: "ekart", label: "Ekart" },
  { id: "amazon_shipping", label: "Amazon Shipping" },
  { id: "indiapost", label: "India Post" },
];

function ManualBookModal({ orders, onClose, onBooked }: { orders: any[]; onClose: () => void; onBooked: () => void }) {
  const fn = useServerFn(manualBookShipment);
  const [orderNumber, setOrderNumber] = useState(orders[0]?.order_number || "");
  const [carrier, setCarrier] = useState("shiprocket");
  const [weightOverride, setWeightOverride] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!orderNumber || !carrier) return;
    setBusy(true);
    try {
      const res: any = await fn({
        data: {
          orderNumber,
          carrier,
          weightGramsOverride: weightOverride ? Number(weightOverride) : undefined,
        },
      });
      toast.success(`AWB booked: ${res.awb || "—"}`);
      onBooked();
    } catch (e: any) { toast.error(e?.message || "Booking failed"); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 text-gray-900" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <h3 className="font-black flex items-center gap-1.5"><Wrench size={14} /> Manual AWB booking</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Order</label>
            <select value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {orders.length === 0 && <option value="">No pending orders</option>}
              {orders.map((o) => (
                <option key={o.order_number} value={o.order_number}>
                  {o.order_number} — {o.customer_name || (o.shipping_address as any)?.name || "—"} · {(o.shipping_address as any)?.pincode || ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Carrier (override)</label>
            <select value={carrier} onChange={(e) => setCarrier(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
              {CARRIER_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Weight override (grams, optional)</label>
            <input type="number" value={weightOverride} onChange={(e) => setWeightOverride(e.target.value)}
              placeholder="Leave blank to use auto-computed"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <button onClick={submit} disabled={busy || !orderNumber}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />} Book AWB now
          </button>
        </div>
      </div>
    </div>
  );
}


// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Save, AlertCircle, Zap } from "lucide-react";
import {
  listAllQuickCheckout,
  upsertQuickCheckoutMethod,
  deleteQuickCheckoutMethod,
} from "@/lib/quickCheckout.functions";
import { setFeatureFlag } from "@/lib/featureFlags.functions";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

type Method = {
  id?: string;
  provider: "gpay" | "phonepe" | "paytm" | "bhim" | "amazonpay" | "upi_generic" | "razorpay_upi";
  label: string;
  icon_url?: string | null;
  icon_emoji?: string | null;
  sort_order: number;
  min_order?: number | null;
  max_order?: number | null;
  cod_eligible: boolean;
  enabled: boolean;
  config: Record<string, unknown>;
};

const PROVIDER_DEFAULTS: Record<string, Partial<Method>> = {
  gpay: { label: "Google Pay", icon_emoji: "🟢" },
  phonepe: { label: "PhonePe", icon_emoji: "🟣" },
  paytm: { label: "Paytm", icon_emoji: "🔵" },
  bhim: { label: "BHIM UPI", icon_emoji: "🟠" },
  amazonpay: { label: "Amazon Pay", icon_emoji: "🔶" },
  upi_generic: { label: "Any UPI App", icon_emoji: "💸" },
  razorpay_upi: { label: "UPI (Razorpay)", icon_emoji: "⚡" },
};

export default function QuickCheckoutTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllQuickCheckout);
  const upsertFn = useServerFn(upsertQuickCheckoutMethod);
  const delFn = useServerFn(deleteQuickCheckoutMethod);
  const flagFn = useServerFn(setFeatureFlag);
  const { isEnabled, getConfig, refetch } = useFeatureFlags();
  const masterOn = isEnabled("quick_checkout");
  const flagCfg = getConfig<{ position?: "above" | "below"; show_on_cart_page?: boolean; show_on_drawer?: boolean }>("quick_checkout");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-quick-checkout"],
    queryFn: () => listFn({}),
  });
  const methods: Method[] = (data?.methods ?? []) as Method[];

  const [editing, setEditing] = useState<Method | null>(null);

  const save = useMutation({
    mutationFn: (m: Method) => upsertFn({ data: m as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-quick-checkout"] }); setEditing(null); },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quick-checkout"] }),
  });
  const toggleMaster = useMutation({
    mutationFn: (enabled: boolean) => flagFn({ data: { key: "quick_checkout", enabled } }),
    onSuccess: () => refetch(),
  });
  const updateFlagCfg = useMutation({
    mutationFn: (patch: Record<string, unknown>) => flagFn({ data: { key: "quick_checkout", config: { ...flagCfg, ...patch } } }),
    onSuccess: () => refetch(),
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Zap size={22} className="text-orange-500" /> Express Quick Checkout</h1>
          <p className="text-sm text-gray-500 mt-1">UPI BUY NOW buttons in cart drawer / cart page — fully configurable.</p>
        </div>
        <label className="flex items-center gap-3 bg-white border rounded-xl px-4 py-2.5 cursor-pointer">
          <span className="text-sm font-bold">Master {masterOn ? "ON" : "OFF"}</span>
          <input type="checkbox" checked={masterOn} onChange={(e) => toggleMaster.mutate(e.target.checked)} className="h-5 w-5" />
        </label>
      </div>

      {!masterOn && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-sm">
          <AlertCircle size={16} /> Feature is OFF — Quick Pay buttons won't render even if methods are configured.
        </div>
      )}

      <div className="bg-white rounded-2xl border p-4 space-y-3">
        <h2 className="font-bold">Display settings</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={flagCfg.show_on_cart_page ?? true} onChange={(e) => updateFlagCfg.mutate({ show_on_cart_page: e.target.checked })} />
            Show on cart page
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={flagCfg.show_on_drawer ?? true} onChange={(e) => updateFlagCfg.mutate({ show_on_drawer: e.target.checked })} />
            Show in mini-cart drawer
          </label>
          <label className="flex items-center gap-2">
            <span>Position:</span>
            <select value={flagCfg.position ?? "above"} onChange={(e) => updateFlagCfg.mutate({ position: e.target.value as any })}
              className="border rounded px-2 py-1">
              <option value="above">Above checkout</option>
              <option value="below">Below checkout</option>
            </select>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Payment methods</h2>
          <button
            onClick={() => setEditing({
              provider: "gpay", label: "Google Pay", icon_emoji: "🟢",
              sort_order: methods.length, cod_eligible: false, enabled: true, config: {},
            })}
            className="flex items-center gap-1.5 bg-black text-white text-sm px-3 py-1.5 rounded-lg font-bold"
          >
            <Plus size={14} /> Add method
          </button>
        </div>

        {isLoading ? <p className="text-sm text-gray-500">Loading…</p> : methods.length === 0 ? (
          <p className="text-sm text-gray-500">No methods yet. Add Google Pay / PhonePe / UPI to enable quick checkout.</p>
        ) : (
          <ul className="divide-y">
            {methods.map((m) => (
              <li key={m.id} className="py-3 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full" style={{ background: m.enabled ? "#16a34a" : "#9ca3af" }} />
                <span className="text-xl">{m.icon_emoji ?? "💳"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{m.label}</p>
                  <p className="text-xs text-gray-500">{m.provider} · order #{m.sort_order}{m.min_order ? ` · min ₹${m.min_order}` : ""}</p>
                </div>
                <button onClick={() => setEditing(m)} className="text-sm px-3 py-1.5 border rounded-lg font-bold">Edit</button>
                <button onClick={() => m.id && del.mutate(m.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-2" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-4 md:p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-lg">{editing.id ? "Edit method" : "New method"}</h3>

            <F label="Provider">
              <select value={editing.provider} onChange={(e) => {
                const p = e.target.value as Method["provider"];
                setEditing({ ...editing, provider: p, ...PROVIDER_DEFAULTS[p] } as Method);
              }} className="w-full border rounded-lg px-3 py-2 text-sm">
                {Object.keys(PROVIDER_DEFAULTS).map((k) => <option key={k} value={k}>{PROVIDER_DEFAULTS[k].label}</option>)}
              </select>
            </F>
            <F label="Display label"><input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Emoji"><input value={editing.icon_emoji ?? ""} onChange={(e) => setEditing({ ...editing, icon_emoji: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></F>
              <F label="Icon URL (optional)"><input value={editing.icon_url ?? ""} onChange={(e) => setEditing({ ...editing, icon_url: e.target.value || null })} className="w-full border rounded-lg px-3 py-2 text-sm" /></F>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <F label="Sort"><input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" /></F>
              <F label="Min order ₹"><input type="number" value={editing.min_order ?? ""} onChange={(e) => setEditing({ ...editing, min_order: e.target.value ? Number(e.target.value) : null })} className="w-full border rounded-lg px-3 py-2 text-sm" /></F>
              <F label="Max order ₹"><input type="number" value={editing.max_order ?? ""} onChange={(e) => setEditing({ ...editing, max_order: e.target.value ? Number(e.target.value) : null })} className="w-full border rounded-lg px-3 py-2 text-sm" /></F>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={editing.cod_eligible} onChange={(e) => setEditing({ ...editing, cod_eligible: e.target.checked })} />
              Also show when COD-only cart
            </label>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />
              Enabled
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 border rounded-lg py-2.5 font-bold text-sm">Cancel</button>
              <button onClick={() => save.mutate(editing)} disabled={save.isPending}
                className="flex-1 bg-black text-white rounded-lg py-2.5 font-bold text-sm flex items-center justify-center gap-1.5">
                <Save size={14} /> {save.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-bold text-gray-700">{label}</span><div className="mt-1">{children}</div></label>;
}

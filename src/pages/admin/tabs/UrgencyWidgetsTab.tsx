// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Save, AlertCircle } from "lucide-react";
import {
  listAllUrgencyWidgets,
  upsertUrgencyWidget,
  deleteUrgencyWidget,
} from "@/lib/urgencyWidgets.functions";
import { setFeatureFlag } from "@/lib/featureFlags.functions";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

type Widget = {
  id?: string;
  widget_type: "low_stock" | "recent_purchase" | "live_viewers" | "cart_urgency";
  label_template: string;
  icon?: string | null;
  color?: string | null;
  bg_color?: string | null;
  animation: "none" | "pulse" | "shake" | "fade";
  threshold?: number | null;
  min_to_show: number;
  window_hours: number;
  exclude_product_ids: string[];
  include_product_ids: string[];
  sort_order: number;
  enabled: boolean;
  config: Record<string, unknown>;
};

const DEFAULTS: Record<string, Partial<Widget>> = {
  low_stock: { label_template: "🔥 Only {stock} left in stock!", threshold: 10, color: "#dc2626", bg_color: "#fef2f2", icon: "flame", animation: "pulse" },
  recent_purchase: { label_template: "🛒 {count} people bought this in last {hours}h", min_to_show: 3, window_hours: 24, color: "#059669", bg_color: "#ecfdf5", icon: "cart", animation: "none" },
  live_viewers: { label_template: "👀 {count} viewing right now", color: "#7c3aed", bg_color: "#f5f3ff", icon: "eye", animation: "fade" },
  cart_urgency: { label_template: "{count} added to cart in last hour", color: "#ea580c", bg_color: "#fff7ed", icon: "trend", animation: "none" },
};

export default function UrgencyWidgetsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllUrgencyWidgets);
  const upsertFn = useServerFn(upsertUrgencyWidget);
  const delFn = useServerFn(deleteUrgencyWidget);
  const flagFn = useServerFn(setFeatureFlag);
  const { isEnabled, refetch: refetchFlags } = useFeatureFlags();
  const masterOn = isEnabled("urgency_stack");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-urgency-widgets"],
    queryFn: () => listFn({}),
  });
  const widgets: Widget[] = (data?.widgets ?? []) as Widget[];

  const [editing, setEditing] = useState<Widget | null>(null);

  const save = useMutation({
    mutationFn: (w: Widget) => upsertFn({ data: w as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-urgency-widgets"] }); setEditing(null); },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-urgency-widgets"] }),
  });
  const toggleMaster = useMutation({
    mutationFn: (enabled: boolean) => flagFn({ data: { key: "urgency_stack", enabled } }),
    onSuccess: () => refetchFlags(),
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black">PDP Urgency Widgets</h1>
          <p className="text-sm text-gray-500 mt-1">Honest, real-data urgency stack for product pages.</p>
        </div>
        <label className="flex items-center gap-3 bg-white border rounded-xl px-4 py-2.5 cursor-pointer">
          <span className="text-sm font-bold">Master {masterOn ? "ON" : "OFF"}</span>
          <input type="checkbox" checked={masterOn} onChange={(e) => toggleMaster.mutate(e.target.checked)} className="h-5 w-5" />
        </label>
      </div>

      {!masterOn && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-sm">
          <AlertCircle size={16} /> Feature is OFF — widgets won't render on the site even if configured.
        </div>
      )}

      <div className="bg-white rounded-2xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Widgets</h2>
          <button
            onClick={() => setEditing({
              widget_type: "low_stock", label_template: "", animation: "none",
              min_to_show: 1, window_hours: 24, exclude_product_ids: [], include_product_ids: [],
              sort_order: widgets.length, enabled: true, config: {}, ...DEFAULTS.low_stock,
            } as Widget)}
            className="flex items-center gap-1.5 bg-black text-white text-sm px-3 py-1.5 rounded-lg font-bold"
          >
            <Plus size={14} /> New widget
          </button>
        </div>

        {isLoading ? <p className="text-sm text-gray-500">Loading…</p> : widgets.length === 0 ? (
          <p className="text-sm text-gray-500">No widgets yet. Add one to start.</p>
        ) : (
          <ul className="divide-y">
            {widgets.map((w) => (
              <li key={w.id} className="py-3 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full" style={{ background: w.enabled ? "#16a34a" : "#9ca3af" }} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{w.widget_type.replace("_", " ")}</p>
                  <p className="text-xs text-gray-500 truncate">{w.label_template}</p>
                </div>
                <button onClick={() => setEditing(w)} className="text-sm px-3 py-1.5 border rounded-lg font-bold">Edit</button>
                <button onClick={() => w.id && del.mutate(w.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-2" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-4 md:p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-lg">{editing.id ? "Edit widget" : "New widget"}</h3>

            <Field label="Widget type">
              <select value={editing.widget_type} onChange={(e) => {
                const t = e.target.value as Widget["widget_type"];
                setEditing({ ...editing, widget_type: t, ...DEFAULTS[t] } as Widget);
              }} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="low_stock">Low stock bar</option>
                <option value="recent_purchase">Recent purchase ticker</option>
                <option value="live_viewers">Live viewers (future)</option>
                <option value="cart_urgency">Cart urgency (future)</option>
              </select>
            </Field>

            <Field label="Label template" hint="Placeholders: {stock} {count} {hours}">
              <input value={editing.label_template} onChange={(e) => setEditing({ ...editing, label_template: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Text color">
                <input type="color" value={editing.color ?? "#dc2626"} onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                  className="w-full h-10 border rounded-lg" />
              </Field>
              <Field label="Background">
                <input type="color" value={editing.bg_color ?? "#fef2f2"} onChange={(e) => setEditing({ ...editing, bg_color: e.target.value })}
                  className="w-full h-10 border rounded-lg" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Icon">
                <select value={editing.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="flame">🔥 Flame</option>
                  <option value="cart">🛒 Cart</option>
                  <option value="eye">👀 Eye</option>
                  <option value="trend">📈 Trend</option>
                </select>
              </Field>
              <Field label="Animation">
                <select value={editing.animation} onChange={(e) => setEditing({ ...editing, animation: e.target.value as any })}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="none">None</option>
                  <option value="pulse">Pulse</option>
                  <option value="fade">Fade</option>
                  <option value="shake">Shake</option>
                </select>
              </Field>
            </div>

            {editing.widget_type === "low_stock" && (
              <Field label="Stock threshold (show when stock ≤)">
                <input type="number" value={editing.threshold ?? 10} onChange={(e) => setEditing({ ...editing, threshold: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
            )}

            {editing.widget_type === "recent_purchase" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min count to show">
                  <input type="number" value={editing.min_to_show} onChange={(e) => setEditing({ ...editing, min_to_show: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </Field>
                <Field label="Window (hours)">
                  <input type="number" value={editing.window_hours} onChange={(e) => setEditing({ ...editing, window_hours: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </Field>
              </div>
            )}

            <Field label="Exclude product IDs (comma-separated)">
              <input value={editing.exclude_product_ids.join(",")} onChange={(e) => setEditing({ ...editing, exclude_product_ids: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </Field>

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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-700">{label}</span>
      {hint && <span className="text-[10px] text-gray-400 ml-1">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

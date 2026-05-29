// @ts-nocheck
/**
 * Loyalty Tiers admin tab — manage tiers, view members, recompute all.
 */
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Award, Plus, Save, Trash2, RefreshCw, Users, X, Check } from "lucide-react";
import {
  adminListTiers, adminSaveTier, adminDeleteTier, adminRecomputeAll, adminListMembers,
} from "@/lib/loyalty.functions";
import { TabHelp } from "./_TabHelp";
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from "@/pages/admin/components/BulkSelect";

type Tier = {
  id?: string;
  name: string;
  min_lifetime_spend: number;
  discount_percent: number;
  free_shipping: boolean;
  perks: string[];
  badge_color: string;
  active: boolean;
  sort_order: number;
};

const EMPTY: Tier = {
  name: "", min_lifetime_spend: 0, discount_percent: 0, free_shipping: false,
  perks: [], badge_color: "#cd7f32", active: true, sort_order: 0,
};

export default function LoyaltyTab() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [editing, setEditing] = useState<Tier | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"tiers" | "members">("tiers");

  const listFn = useServerFn(adminListTiers);
  const saveFn = useServerFn(adminSaveTier);
  const delFn = useServerFn(adminDeleteTier);
  const recalcFn = useServerFn(adminRecomputeAll);
  const memFn = useServerFn(adminListMembers);

  const load = useCallback(async () => {
    const r: any = await listFn();
    setTiers(r.tiers || []);
  }, [listFn]);

  const loadMembers = useCallback(async () => {
    const r: any = await memFn({ data: { limit: 200 } });
    setMembers(r.members || []);
  }, [memFn]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (view === "members") loadMembers(); }, [view, loadMembers]);

  const tierItems = tiers.filter(t => !!t.id);
  const bulk = useBulkSelection(tierItems, (t: any) => t.id!);

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      await saveFn({ data: editing as any });
      setEditing(null);
      load();
    } catch (e: any) { alert(e.message || "Failed"); }
    finally { setBusy(false); }
  }

  async function remove(id?: string) {
    if (!id) return;
    if (!confirm("Delete this tier? Members on it will be re-bucketed on next recompute.")) return;
    await delFn({ data: { id } });
    load();
  }

  async function recompute() {
    setBusy(true);
    try {
      const r: any = await recalcFn();
      alert(`Recomputed ${r.updated} member${r.updated === 1 ? "" : "s"}.`);
      if (view === "members") loadMembers();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <TabHelp topic="loyalty" />

      <div className="flex items-center gap-2">
        <button onClick={() => setView("tiers")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${view === "tiers" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700"}`}>
          <Award size={12} className="inline mr-1" /> Tiers
        </button>
        <button onClick={() => setView("members")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${view === "members" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700"}`}>
          <Users size={12} className="inline mr-1" /> Members
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={recompute} disabled={busy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-bold disabled:opacity-50">
            <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> Recompute all
          </button>
          {view === "tiers" && (
            <button onClick={() => setEditing({ ...EMPTY, sort_order: tiers.length })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold">
              <Plus size={12} /> New tier
            </button>
          )}
        </div>
      </div>

      {view === "tiers" && (
        <div className="space-y-3">
          <BulkActionBar
              count={bulk.count}
              ids={[...bulk.selected]}
              onClear={bulk.clear}
              actions={[
                { key: 'enable', label: 'Activate', color: 'bg-green-600 hover:bg-green-700', confirm: 'Activate {n} tier(s)?', run: async (ids) => { await runForEach(ids, (id) => { const t = tiers.find(x => x.id === id); if (t) return saveFn({ data: { ...t, active: true } as any }); }); load(); } },
                { key: 'disable', label: 'Deactivate', color: 'bg-yellow-600 hover:bg-yellow-700', confirm: 'Deactivate {n} tier(s)?', run: async (ids) => { await runForEach(ids, (id) => { const t = tiers.find(x => x.id === id); if (t) return saveFn({ data: { ...t, active: false } as any }); }); load(); } },
                { key: 'del', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} tier(s)? Members will be re-bucketed on next recompute.', run: async (ids) => { await runForEach(ids, (id) => delFn({ data: { id } })); load(); } },
              ]}
            />
            {tierItems.length > 0 && (
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <SelectCheckbox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} />
                Select all ({tierItems.length})
              </label>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {tiers.map(t => (
                <div key={t.id} className={`bg-white rounded-2xl border p-4 relative ${t.id && bulk.isSelected(t.id) ? 'border-orange-300 ring-2 ring-orange-200' : 'border-gray-200'}`}>
                  {t.id && (
                    <div className="absolute top-3 right-3"><SelectCheckbox checked={bulk.isSelected(t.id)} onChange={() => bulk.toggleOne(t.id!)} /></div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-6 w-6 rounded-full ring-2 ring-white shadow"
                      style={{ background: t.badge_color }} />
                    <h3 className="font-black text-lg">{t.name}</h3>
                    {!t.active && <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded uppercase font-bold">Off</span>}
                  </div>
                  <p className="text-xs text-gray-500">≥ ₹{Number(t.min_lifetime_spend).toLocaleString("en-IN")} lifetime spend</p>
                  <div className="mt-2 flex gap-2 text-xs">
                    <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-bold">{t.discount_percent}% off</span>
                    {t.free_shipping && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">Free ship</span>}
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-gray-600">
                    {(t.perks || []).map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5"><Check size={11} className="text-emerald-500 mt-0.5 shrink-0" />{p}</li>
                    ))}
                  </ul>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => setEditing(t)} className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg py-1.5 font-bold">Edit</button>
                    <button onClick={() => remove(t.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg p-1.5"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
              {tiers.length === 0 && <p className="col-span-3 text-center text-xs text-gray-400 py-8">No tiers yet.</p>}
            </div>
        </div>
      )}

      {view === "members" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase">
              <tr><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-left">Tier</th><th className="px-3 py-2 text-right">Lifetime ₹</th><th className="px-3 py-2 text-right">Orders</th></tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.user_id} className="border-t">
                  <td className="px-3 py-2">
                    <p className="font-bold">{m.profile?.name || "—"}</p>
                    <p className="text-[11px] text-gray-500">{m.profile?.email || m.user_id.slice(0, 8)}</p>
                  </td>
                  <td className="px-3 py-2">
                    {m.tier ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                        <span className="h-3 w-3 rounded-full" style={{ background: m.tier.badge_color }} />
                        {m.tier.name}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">₹{Number(m.lifetime_spend).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 text-right font-mono">{m.order_count}</td>
                </tr>
              ))}
              {members.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-gray-400">No members yet. Click "Recompute all" to bucket existing customers.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg">{editing.id ? "Edit" : "New"} tier</h3>
              <button onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="inp" /></Field>
              <Field label="Badge color"><input type="color" value={editing.badge_color} onChange={e => setEditing({ ...editing, badge_color: e.target.value })} className="w-full h-9 border rounded" /></Field>
              <Field label="Min lifetime ₹"><input type="number" value={editing.min_lifetime_spend} onChange={e => setEditing({ ...editing, min_lifetime_spend: Number(e.target.value) })} className="inp" /></Field>
              <Field label="Discount %"><input type="number" step="0.5" value={editing.discount_percent} onChange={e => setEditing({ ...editing, discount_percent: Number(e.target.value) })} className="inp" /></Field>
              <Field label="Sort order"><input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="inp" /></Field>
              <Field label="Free shipping">
                <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={editing.free_shipping} onChange={e => setEditing({ ...editing, free_shipping: e.target.checked })} /> Enabled</label>
              </Field>
            </div>
            <Field label="Perks (one per line)">
              <textarea value={(editing.perks || []).join("\n")} onChange={e => setEditing({ ...editing, perks: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                rows={4} className="inp" />
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-bold">Cancel</button>
              <button onClick={save} disabled={busy || !editing.name} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold flex items-center gap-1 disabled:opacity-50">
                <Save size={13} /> Save
              </button>
            </div>
          </div>
          <style>{`.inp { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 10px; font-size: 14px; }`}</style>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

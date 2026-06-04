// @ts-nocheck
/**
 * Wholesale / B2B admin tab.
 * View all customers, toggle wholesale status, set discount % and min order.
 */
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Save, Search, X, Check } from "lucide-react";
import { adminListWholesale, adminSetWholesale } from "@/lib/wholesale.functions";
import { TabHelp } from './_TabHelp';

type Row = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  is_wholesale: boolean;
  wholesale_discount_percent: number;
  wholesale_min_order: number;
  wholesale_notes: string | null;
};

export default function WholesaleTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [onlyEnabled, setOnlyEnabled] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const listFn = useServerFn(adminListWholesale);
  const setFn = useServerFn(adminSetWholesale);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r: any = await listFn({ data: { search, onlyEnabled } });
      setRows(r.users || []);
      setSelected(new Set());
    } finally { setBusy(false); }
  }, [listFn, search, onlyEnabled]);

  useEffect(() => { load(); }, [load]);

  const toggleSel = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));
  const bulkSetEnabled = async (enable: boolean) => {
    if (selected.size === 0) return;
    if (!confirm(`${enable ? 'Enable' : 'Disable'} wholesale for ${selected.size} customer(s)?`)) return;
    setBulkBusy(true);
    try {
      const targets = rows.filter(r => selected.has(r.id));
      await Promise.all(targets.map(r => setFn({ data: {
        userId: r.id,
        isWholesale: enable,
        discountPercent: Number(r.wholesale_discount_percent || 0),
        minOrder: Number(r.wholesale_min_order || 0),
        notes: r.wholesale_notes || "",
      }})));
      await load();
    } catch (e: any) { alert(e?.message || 'Bulk update failed'); }
    setBulkBusy(false);
  };

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      await setFn({ data: {
        userId: editing.id,
        isWholesale: editing.is_wholesale,
        discountPercent: Number(editing.wholesale_discount_percent || 0),
        minOrder: Number(editing.wholesale_min_order || 0),
        notes: editing.wholesale_notes || "",
      }});
      setEditing(null);
      load();
    } catch (e: any) { alert(e.message || "Failed"); }
    finally { setBusy(false); }
  }

  const enabledCount = rows.filter(r => r.is_wholesale).length;

  return (
    <div className="space-y-4">
      <TabHelp topic="wholesale" />
      <div className="bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase size={18} className="text-sky-700" />
          <h2 className="font-black text-lg">Wholesale / B2B</h2>
        </div>
        <p className="text-xs text-gray-600">
          Mark customers as wholesale. Their discount % is auto-applied at checkout (when subtotal ≥ min order). You can put GSTIN / company info under <b>Notes</b>.
        </p>
        <p className="text-[11px] text-sky-700 font-bold mt-2">{enabledCount} wholesale customer(s) active</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name / email / phone"
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        <label className="flex items-center gap-1.5 text-xs font-bold">
          <input type="checkbox" checked={onlyEnabled} onChange={e => setOnlyEnabled(e.target.checked)} />
          Only wholesale
        </label>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2 items-center bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-xs">
          <span className="font-bold text-sky-800">{selected.size} selected</span>
          <button disabled={bulkBusy} onClick={() => bulkSetEnabled(true)} className="px-2 py-1 bg-white border rounded-lg font-bold hover:border-sky-300 disabled:opacity-50">Enable wholesale</button>
          <button disabled={bulkBusy} onClick={() => bulkSetEnabled(false)} className="px-2 py-1 bg-white border rounded-lg font-bold hover:border-sky-300 disabled:opacity-50">Disable wholesale</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-gray-500 hover:underline">Clear</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase">
            <tr>
              <th className="px-3 py-2 w-8 text-left">
                <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} />
              </th>
              <th className="px-3 py-2 text-left">Customer</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Discount %</th>
              <th className="px-3 py-2 text-right">Min order ₹</th>
              <th className="px-3 py-2 text-left">Notes</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} />
                </td>
                <td className="px-3 py-2">
                  <p className="font-bold text-xs">{r.name || "—"}</p>
                  <p className="text-[10px] text-gray-500">{r.email || r.phone || r.id.slice(0,8)}</p>
                </td>
                <td className="px-3 py-2">
                  {r.is_wholesale
                    ? <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Wholesale</span>
                    : <span className="text-gray-400 text-[10px]">Retail</span>}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">{r.is_wholesale ? `${Number(r.wholesale_discount_percent || 0)}%` : "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{r.is_wholesale ? `₹${Number(r.wholesale_min_order || 0).toLocaleString("en-IN")}` : "—"}</td>
                <td className="px-3 py-2 text-[11px] text-gray-500 max-w-xs truncate">{r.wholesale_notes || ""}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEditing({ ...r })} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded font-bold">Edit</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-xs text-gray-400">
                {busy ? "Loading…" : "No customers found."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg">{editing.name || editing.email}</h3>
              <button onClick={() => setEditing(null)}><X size={18} /></button>
            </div>

            <label className="flex items-center gap-2 bg-sky-50 rounded-lg p-2.5">
              <input type="checkbox" checked={editing.is_wholesale}
                onChange={e => setEditing({ ...editing, is_wholesale: e.target.checked })} />
              <span className="font-bold text-sm">Enable wholesale pricing</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount %">
                <input type="number" step="0.5" min="0" max="80"
                  disabled={!editing.is_wholesale}
                  value={editing.wholesale_discount_percent}
                  onChange={e => setEditing({ ...editing, wholesale_discount_percent: Number(e.target.value) })}
                  className="inp" />
              </Field>
              <Field label="Min order ₹">
                <input type="number" min="0"
                  disabled={!editing.is_wholesale}
                  value={editing.wholesale_min_order}
                  onChange={e => setEditing({ ...editing, wholesale_min_order: Number(e.target.value) })}
                  className="inp" />
              </Field>
            </div>

            <Field label="Notes (GSTIN, company, contact)">
              <textarea value={editing.wholesale_notes || ""}
                onChange={e => setEditing({ ...editing, wholesale_notes: e.target.value })}
                rows={3} className="inp" placeholder="GSTIN: 27ABCDE1234F1Z5 · Acme Pvt Ltd" />
            </Field>

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-bold">Cancel</button>
              <button onClick={save} disabled={busy}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold flex items-center gap-1 disabled:opacity-50">
                <Save size={13} /> Save
              </button>
            </div>
          </div>
          <style>{`.inp { width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; font-size:14px; } .inp:disabled { background:#f9fafb; color:#9ca3af; }`}</style>
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

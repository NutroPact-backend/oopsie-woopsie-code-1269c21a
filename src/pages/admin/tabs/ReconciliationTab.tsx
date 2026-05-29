// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listShipmentCharges,
  updateShipmentCharge,
  importShipmentChargesCsv,
} from "@/lib/reconciliation.functions";
import { FileText, Upload, CheckCircle2, AlertTriangle, TrendingDown, TrendingUp, Download, Pencil, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TabHelp } from './_TabHelp';
import { useBulkSelection, BulkActionBar, SelectCheckbox } from '../components/BulkSelect';

type Row = {
  id: string;
  order_number: string;
  courier: string;
  awb_number: string | null;
  expected_weight_g: number;
  expected_charge: number;
  expected_box_id: string | null;
  actual_weight_g: number | null;
  actual_charge: number | null;
  variance: number | null;
  variance_pct: number | null;
  status: "pending" | "matched" | "overcharge" | "undercharge";
  notes: string | null;
  created_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  matched: "bg-green-100 text-green-700",
  overcharge: "bg-red-100 text-red-700",
  undercharge: "bg-amber-100 text-amber-700",
};

const fmtINR = (n: number | null | undefined) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReconciliationTab() {
  const list = useServerFn(listShipmentCharges);
  const update = useServerFn(updateShipmentCharge);
  const importCsv = useServerFn(importShipmentChargesCsv);

  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<any>({ totalExpected: 0, totalActual: 0, variance: 0, counts: {} });
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "matched" | "overcharge" | "undercharge">("all");
  const [courierFilter, setCourierFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await list({ data: { status: statusFilter, courier: courierFilter || undefined, limit: 300 } });
      setRows(res.rows as Row[]);
      setStats(res.stats);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load");
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter, courierFilter]);

  const couriers = useMemo(() => Array.from(new Set(rows.map((r) => r.courier).filter(Boolean))), [rows]);
  const bulk = useBulkSelection(rows, (r: Row) => r.id);

  const exportSelected = (idsArg?: string[]) => {
    const ids = idsArg && idsArg.length ? new Set(idsArg) : null;
    const subset = ids ? rows.filter(r => ids.has(r.id)) : rows;
    const header = ["order_number", "courier", "awb_number", "expected_weight_g", "expected_charge", "actual_weight_g", "actual_charge", "variance", "variance_pct", "status", "created_at"];
    const lines = [header.join(",")];
    for (const r of subset) {
      lines.push([
        r.order_number, r.courier, r.awb_number ?? "",
        r.expected_weight_g, r.expected_charge,
        r.actual_weight_g ?? "", r.actual_charge ?? "",
        r.variance ?? "", r.variance_pct ?? "",
        r.status, r.created_at,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => exportSelected();

  return (
    <div className="space-y-5">
      <TabHelp topic="reconciliation" />
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
        <h2 className="text-xl font-black flex items-center gap-2"><FileText size={20} /> Shipping Reconciliation</h2>
        <p className="text-xs opacity-90 mt-1">Expected (rate-engine quote) vs actual carrier invoice. Variance flag karta hai over/under-charge.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Total Expected" value={fmtINR(stats.totalExpected)} icon={<FileText size={14} />} color="text-gray-700" bg="bg-white" />
        <Stat label="Total Actual" value={fmtINR(stats.totalActual)} icon={<FileText size={14} />} color="text-blue-600" bg="bg-blue-50 border-blue-200" />
        <Stat
          label={stats.variance >= 0 ? "Net Overpaid" : "Net Saved"}
          value={fmtINR(Math.abs(stats.variance || 0))}
          icon={stats.variance >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          color={stats.variance >= 0 ? "text-red-600" : "text-green-600"}
          bg={stats.variance >= 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}
        />
        <Stat label="Disputes" value={`${(stats.counts?.overcharge || 0) + (stats.counts?.undercharge || 0)}`} icon={<AlertTriangle size={14} />} color="text-amber-600" bg="bg-amber-50 border-amber-200" />
      </div>

      {/* Counts strip */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "matched", "overcharge", "undercharge"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${statusFilter === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>
            {s === "all" ? `All (${stats.counts?.total ?? 0})` : `${s} (${stats.counts?.[s] ?? 0})`}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <select value={courierFilter} onChange={(e) => setCourierFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-xl px-2 py-1.5">
            <option value="">All carriers</option>
            {couriers.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={exportCsv} className="text-xs bg-white border border-gray-200 hover:bg-gray-50 rounded-xl px-3 py-1.5 flex items-center gap-1.5 font-bold">
            <Download size={12} /> Export CSV
          </button>
          <button onClick={() => setImportOpen(true)} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-1.5 flex items-center gap-1.5 font-bold">
            <Upload size={12} /> Import actuals
          </button>
        </div>
      </div>

      {/* Table */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <BulkActionBar
          count={bulk.count}
          ids={Array.from(bulk.selected)}
          onClear={bulk.clear}
          actions={[
            { key: 'export', label: 'Export selected (CSV)', color: 'bg-indigo-600 hover:bg-indigo-700',
              run: (ids) => exportSelected(ids) },
          ]}
        />
        {loading ? <p className="text-xs text-gray-400 py-6 text-center">Loading…</p> : rows.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">No shipments to reconcile. Data will appear after auto-shipment booking.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-gray-400 border-b">
                <tr>
                  <th className="py-2 px-2 w-6">
                    <SelectCheckbox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} title="Select all" />
                  </th>
                  <th className="text-left py-2 px-2">Order</th>
                  <th className="text-left py-2 px-2">Courier</th>
                  <th className="text-left py-2 px-2">AWB</th>
                  <th className="text-right py-2 px-2">Exp Wt</th>
                  <th className="text-right py-2 px-2">Exp ₹</th>
                  <th className="text-right py-2 px-2">Act Wt</th>
                  <th className="text-right py-2 px-2">Act ₹</th>
                  <th className="text-right py-2 px-2">Variance</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <SelectCheckbox checked={bulk.isSelected(r.id)} onChange={() => bulk.toggleOne(r.id)} />
                    </td>
                    <td className="py-2 px-2 font-bold">{r.order_number}</td>
                    <td className="py-2 px-2 text-gray-600">{r.courier || "—"}</td>
                    <td className="py-2 px-2 text-gray-500 font-mono text-[10px]">{r.awb_number || "—"}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{r.expected_weight_g}g</td>
                    <td className="py-2 px-2 text-right text-gray-700">{fmtINR(r.expected_charge)}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{r.actual_weight_g != null ? `${r.actual_weight_g}g` : "—"}</td>
                    <td className="py-2 px-2 text-right">{fmtINR(r.actual_charge)}</td>
                    <td className={`py-2 px-2 text-right font-bold ${r.variance == null ? "text-gray-400" : r.variance > 0 ? "text-red-600" : r.variance < 0 ? "text-green-600" : "text-gray-700"}`}>
                      {r.variance == null ? "—" : `${r.variance > 0 ? "+" : ""}${fmtINR(r.variance)}`}
                      {r.variance_pct != null && <div className="text-[10px] text-gray-400 font-normal">{r.variance_pct > 0 ? "+" : ""}{Number(r.variance_pct).toFixed(1)}%</div>}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLOR[r.status]}`}>
                        {r.status === "matched" && <CheckCircle2 size={9} className="inline mr-0.5" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => setEditing(r)} className="text-indigo-600 hover:bg-indigo-50 rounded-lg p-1.5">
                        <Pencil size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <EditModal row={editing} onClose={() => setEditing(null)} onSave={async (payload) => {
          await update({ data: payload }).then(() => { toast.success("Updated"); setEditing(null); load(); }).catch((e: any) => toast.error(e?.message || "Failed"));
        }} />
      )}
      {importOpen && (
        <ImportModal onClose={() => setImportOpen(false)} onImport={async (rows) => {
          try {
            const res = await importCsv({ data: { rows } });
            toast.success(`Imported: ${res.inserted} new + ${res.updated} updated${res.failed ? ` · ${res.failed} failed` : ""}`);
            setImportOpen(false);
            load();
          } catch (e: any) { toast.error(e?.message || "Import failed"); }
        }} />
      )}
    </div>
  );
}

function Stat({ label, value, icon, color, bg }: any) {
  return (
    <div className={`rounded-2xl p-4 border ${bg}`}>
      <div className={`flex items-center justify-between text-[11px] font-bold uppercase ${color}`}>
        <span>{label}</span>{icon}
      </div>
      <div className="text-lg font-black mt-1">{value}</div>
    </div>
  );
}

function EditModal({ row, onClose, onSave }: { row: Row; onClose: () => void; onSave: (p: any) => Promise<void> }) {
  const [actualWeightG, setActualWeightG] = useState(row.actual_weight_g ?? row.expected_weight_g);
  const [actualCharge, setActualCharge] = useState(row.actual_charge ?? 0);
  const [notes, setNotes] = useState(row.notes ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <h3 className="font-black">Reconcile {row.order_number}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3">
          <div className="bg-gray-50 rounded-xl p-3 text-xs">
            <div className="text-gray-500">Expected: <b>{row.expected_weight_g}g · {fmtINR(row.expected_charge)}</b></div>
            <div className="text-gray-500">Courier: {row.courier} · AWB {row.awb_number || "—"}</div>
          </div>
          <Field label="Actual weight (grams)"><input type="number" value={actualWeightG} onChange={(e) => setActualWeightG(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" /></Field>
          <Field label="Actual charge (₹)"><input type="number" step="0.01" value={actualCharge} onChange={(e) => setActualCharge(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" /></Field>
          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" /></Field>
          <button onClick={async () => { setBusy(true); await onSave({ orderNumber: row.order_number, actualWeightG, actualCharge, notes }); setBusy(false); }}
            disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {busy && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (rows: any[]) => Promise<void> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const parse = () => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""));
    const idx = (k: string) => header.findIndex((h) => h === k || h === k.replace(/_/g, ""));
    const iOrder = idx("order_number");
    const iCharge = idx("actual_charge");
    const iWeight = idx("actual_weight_g");
    const iNotes = idx("notes");
    if (iOrder < 0 || iCharge < 0) throw new Error('CSV needs "order_number" and "actual_charge" columns');
    const out: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].match(/("([^"]|"")*"|[^,]*)/g)?.filter((_, idx) => idx % 2 === 0).map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"')) || [];
      const orderNumber = cells[iOrder]?.trim();
      const actualCharge = Number(cells[iCharge]);
      if (!orderNumber || !Number.isFinite(actualCharge)) continue;
      const row: any = { orderNumber, actualCharge };
      if (iWeight >= 0 && cells[iWeight]) row.actualWeightG = Math.round(Number(cells[iWeight]));
      if (iNotes >= 0 && cells[iNotes]) row.notes = cells[iNotes];
      out.push(row);
    }
    return out;
  };

  const submit = async () => {
    setBusy(true);
    try {
      const rows = parse();
      if (!rows.length) { toast.error("No valid rows found"); setBusy(false); return; }
      await onImport(rows);
    } catch (e: any) { toast.error(e?.message || "Parse failed"); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <h3 className="font-black">Import carrier invoice</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-xs text-gray-600">
            CSV format: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">order_number,actual_charge,actual_weight_g,notes</code>
            <br />Pehli row header honi chahiye. Weight & notes optional hain.
          </p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10}
            placeholder={"order_number,actual_charge,actual_weight_g,notes\nORD-1234,85.50,520,Pickup delayed"}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono" />
          <button onClick={submit} disabled={busy || !text.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {busy && <Loader2 size={14} className="animate-spin" />} Import & match
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return <div><label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>{children}</div>;
}

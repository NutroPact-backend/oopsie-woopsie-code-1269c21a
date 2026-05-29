// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Download, Database, FileJson, FileText, RefreshCw } from 'lucide-react';
import { exportTable, exportFullSnapshot, listExportableTables } from '@/lib/admin-phase3.functions';
import { TabHelp } from './_TabHelp';

function toCSV(rows: any[]): string {
  if (!rows?.length) return '';
  const cols = Array.from(new Set(rows.flatMap(r => Object.keys(r || {}))));
  const esc = (v: any) => {
    if (v == null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export default function BackupExportTab() {
  const listFn = useServerFn(listExportableTables);
  const exportFn = useServerFn(exportTable);
  const snapFn = useServerFn(exportFullSnapshot);

  const [tables, setTables] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>('');

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await listFn({});
      setTables(r.tables || []); setCounts(r.counts || {});
    } catch (e: any) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const exportOne = async (t: string, fmt: 'csv' | 'json') => {
    setBusy(t + fmt);
    try {
      const r: any = await exportFn({ data: { table: t, limit: 20000 } });
      const stamp = new Date().toISOString().slice(0, 10);
      if (fmt === 'csv') download(`${t}-${stamp}.csv`, toCSV(r.rows), 'text/csv');
      else download(`${t}-${stamp}.json`, JSON.stringify(r.rows, null, 2), 'application/json');
    } catch (e: any) { alert(e?.message || 'Export failed'); }
    setBusy('');
  };

  const exportAll = async () => {
    if (!confirm('Download a full database snapshot (JSON, up to 5000 rows per table)?')) return;
    setBusy('snapshot');
    try {
      const r: any = await snapFn({});
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      download(`nutropact-snapshot-${stamp}.json`, JSON.stringify(r.snapshot, null, 2), 'application/json');
    } catch (e: any) { alert(e?.message || 'Snapshot failed'); }
    setBusy('');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <TabHelp topic="backupExport" />
      <div>
        <h2 className="text-xl font-black">Backup & Export Hub</h2>
        <p className="text-sm text-gray-500">Download per-table CSV/JSON exports or a full snapshot for backup.</p>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-black text-gray-900 flex items-center gap-2"><Database size={18} className="text-orange-500" /> Full Database Snapshot</p>
          <p className="text-xs text-gray-600 mt-1">All exportable tables in one JSON file. Store somewhere safe (Google Drive, S3, local).</p>
        </div>
        <button disabled={busy === 'snapshot'} onClick={exportAll}
          className="px-4 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2">
          <Download size={14} /> {busy === 'snapshot' ? 'Building…' : 'Download snapshot'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <p className="font-bold text-sm">Per-table exports</p>
          <button onClick={load} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"><RefreshCw size={12} /> Refresh</button>
        </div>
        {loading ? <div className="p-8 text-center text-sm text-gray-400">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-gray-500">
              <tr><th className="text-left px-4 py-2">Table</th><th className="text-right px-4 py-2">Rows</th><th className="text-right px-4 py-2">Actions</th></tr>
            </thead>
            <tbody>
              {tables.map(t => (
                <tr key={t} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono">{t}</td>
                  <td className="px-4 py-2 text-right font-bold">{(counts[t] ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button disabled={!!busy} onClick={() => exportOne(t, 'csv')}
                      className="text-xs font-bold text-orange-600 hover:underline disabled:opacity-50 inline-flex items-center gap-1">
                      <FileText size={12} /> {busy === t + 'csv' ? '…' : 'CSV'}
                    </button>
                    <button disabled={!!busy} onClick={() => exportOne(t, 'json')}
                      className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-50 inline-flex items-center gap-1">
                      <FileJson size={12} /> {busy === t + 'json' ? '…' : 'JSON'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-xs text-gray-400 px-1">
        Tip: schedule monthly snapshots and keep copies off-site. Exports are capped at 20,000 rows per table per call.
      </div>
    </div>
  );
}

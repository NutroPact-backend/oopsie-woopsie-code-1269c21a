// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { listAuditLog } from '@/lib/admin-ops.functions';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { TabHelp } from './_TabHelp';

export default function AuditLogTab() {
  const fetchLog = useServerFn(listAuditLog);
  const [rows, setRows] = useState<any[]>([]);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchLog({ data: { action: action || undefined, limit: 300 } } as any)
      .then((r: any) => setRows(r.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [action]);

  const uniqActions = Array.from(new Set(rows.map(r => r.action))).sort();

  return (
    <div className="space-y-4 max-w-6xl">
      <TabHelp topic="auditLog" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><ShieldCheck size={22} /> Audit Log</h1>
          <p className="text-sm text-gray-500">Every privileged admin action — who, when, what.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={action} onChange={e => setAction(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All actions</option>
            {uniqActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={load} className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm font-semibold hover:bg-gray-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-gray-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No audit entries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">Actor</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Target</th>
                  <th className="px-4 py-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs">{r.actor_email || r.actor_user_id?.slice(0, 8) || '—'}</td>
                    <td className="px-4 py-2.5"><span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-mono">{r.action}</span></td>
                    <td className="px-4 py-2.5 text-xs">{r.target_email || r.target_user_id?.slice(0, 8) || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 max-w-md truncate font-mono">{Object.keys(r.details || {}).length ? JSON.stringify(r.details) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

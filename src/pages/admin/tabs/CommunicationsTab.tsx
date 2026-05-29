// @ts-nocheck
import { useEffect, useState } from 'react';
import API from '@/lib/api';
import { Mail, MessageCircle, Smartphone, Bell, RefreshCw, Send, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { TabHelp } from "./_TabHelp";
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';

type QueueRow = {
  id: string;
  userId: string | null;
  orderNumber: string | null;
  channel: 'email' | 'sms' | 'whatsapp' | 'inapp';
  template: string;
  recipient: string;
  payload: any;
  status: 'pending' | 'sent' | 'failed' | 'pending_external' | 'skipped';
  attempts: number;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
};

const channelIcon: Record<string, React.ReactNode> = {
  email: <Mail size={14} />,
  sms: <Smartphone size={14} />,
  whatsapp: <MessageCircle size={14} />,
  inapp: <Bell size={14} />,
};

const statusStyle: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  pending_external: 'bg-blue-100 text-blue-700',
  skipped: 'bg-gray-100 text-gray-600',
};

const STATUSES = ['pending', 'sent', 'failed', 'pending_external', 'skipped'] as const;
const CHANNELS = ['all', 'email', 'sms', 'whatsapp', 'inapp'] as const;

export default function CommunicationsTab() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<typeof CHANNELS[number]>('all');
  const [status, setStatus] = useState<'all' | typeof STATUSES[number]>('all');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/notification-queue');
      setRows(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    (channel === 'all' || r.channel === channel) &&
    (status === 'all' || r.status === status)
  );

  const sel = useBulkSelection(filtered, (r) => r.id);

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const retry = async (id: string) => {
    setBusy(true);
    try {
      await API.post(`/admin/notification-queue/${id}/retry`, {});
      await load();
      setMsg('Marked for retry.');
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Retry failed'); }
    setBusy(false);
    setTimeout(() => setMsg(''), 2500);
  };

  const dispatchAll = async () => {
    setBusy(true);
    try {
      const { data } = await API.post('/admin/notifications/dispatch', {});
      setMsg(`Dispatcher ran. Processed ${data?.processed ?? 0} email(s).`);
      await load();
    } catch (e: any) { setMsg(e?.response?.data?.message || 'Dispatch failed'); }
    setBusy(false);
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="space-y-4">
      <TabHelp topic="communications" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2"><Bell size={22} /> Communications</h2>
          <p className="text-sm text-gray-500 mt-1">All order notifications across email, SMS, WhatsApp and in-app. SMS / WhatsApp wait in <code>pending_external</code> until your provider is connected.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm font-bold hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={dispatchAll} disabled={busy} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50">
            <Send size={14} /> Run dispatcher
          </button>
        </div>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl px-4 py-2">{msg}</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(status === s ? 'all' : s)}
            className={`p-3 rounded-xl border-2 text-left transition ${status === s ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">{s.replace('_', ' ')}</div>
            <div className="text-2xl font-black mt-1">{counts[s] || 0}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {CHANNELS.map(c => (
          <button key={c} onClick={() => setChannel(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1.5 ${channel === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>
            {c !== 'all' && channelIcon[c]} {c.toUpperCase()}
          </button>
        ))}
      </div>

      <BulkActionBar
        count={sel.count}
        ids={Array.from(sel.selected)}
        onClear={() => { sel.clear(); load(); }}
        actions={[
          { key: 'retry', label: 'Retry selected', color: 'bg-gray-900 hover:bg-gray-700', run: async (ids) => { await runForEach(ids, (id) => API.post(`/admin/notification-queue/${id}/retry`, {})); } },
        ]}
      />

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-3 w-8"><SelectCheckbox checked={sel.allSelected} indeterminate={sel.someSelected} onChange={sel.toggleAll} title="Select all" /></th>
                <th className="text-left px-4 py-3 font-bold">Channel</th>
                <th className="text-left px-4 py-3 font-bold">Template</th>
                <th className="text-left px-4 py-3 font-bold">Order</th>
                <th className="text-left px-4 py-3 font-bold">Recipient</th>
                <th className="text-left px-4 py-3 font-bold">Status</th>
                <th className="text-left px-4 py-3 font-bold">Tries</th>
                <th className="text-left px-4 py-3 font-bold">When</th>
                <th className="text-right px-4 py-3 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No notifications match.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 ${sel.isSelected(r.id) ? 'bg-orange-50/50' : ''}`}>
                  <td className="px-3 py-3"><SelectCheckbox checked={sel.isSelected(r.id)} onChange={() => sel.toggleOne(r.id)} /></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700">{channelIcon[r.channel]} {r.channel}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{r.template}</td>
                  <td className="px-4 py-3 font-bold text-xs">{r.orderNumber || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate" title={r.recipient}>{r.recipient || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${statusStyle[r.status] || 'bg-gray-100'}`}>
                      {r.status === 'sent' && <CheckCircle2 size={10} />}
                      {r.status === 'failed' && <AlertCircle size={10} />}
                      {r.status === 'pending' && <Clock size={10} />}
                      {r.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {r.error && <div className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate" title={r.error}>{r.error}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">{r.attempts}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(r.sentAt || r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(r.status === 'failed' || r.status === 'pending_external') && (
                      <button onClick={() => retry(r.id)} disabled={busy}
                        className="px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-[11px] font-bold disabled:opacity-50">
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 border rounded-xl p-3">
        <strong>Email provider not connected yet.</strong> Email rows stay <code>pending</code> and the dispatcher marks them <code>pending_external</code>. Connect Lovable Emails (or your SMTP / WhatsApp / SMS API) when ready — no code change needed, queue will resume sending.
      </div>
    </div>
  );
}

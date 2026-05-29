// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  createOrderModifyLink, listOrderModifyRequests,
  updateOrderModifyRequest, applyOrderModify,
} from '@/lib/order-modify.functions';
import { Copy, Check, RefreshCw, Link2, Clock, PlayCircle } from 'lucide-react';
import { TabHelp } from "./_TabHelp";

const STATUSES = ['awaiting_submission', 'pending_review', 'approved', 'rejected', 'applied', 'completed'] as const;

export default function OrderModifyTab() {
  const create = useServerFn(createOrderModifyLink);
  const list = useServerFn(listOrderModifyRequests);
  const upd = useServerFn(updateOrderModifyRequest);
  const apply = useServerFn(applyOrderModify);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [orderNumber, setOrderNumber] = useState('');
  const [expiryMins, setExpiryMins] = useState<number>(30);
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [createError, setCreateError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const r: any = await list({ data: { status: filter || undefined } });
      setRows(r?.rows || []);
    } catch (e: any) { console.error(e); }
    setLoading(false);
  };

  const toggleSel = (id: string) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => setSelected(s => s.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));
  const bulkSetStatus = async (status: string) => {
    if (selected.size === 0) return;
    if (!confirm(`Mark ${selected.size} request(s) as "${status.replace(/_/g, ' ')}"?`)) return;
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map(id => upd({ data: { id, status: status as any } })));
      await load();
    } catch (e: any) { alert(e?.message || 'Bulk update failed'); }
    setBulkBusy(false);
  };
  const bulkApply = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Apply changes for ${selected.size} approved request(s)?`)) return;
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map(id => apply({ data: { id } })));
      await load();
    } catch (e: any) { alert(e?.message || 'Bulk apply failed'); }
    setBulkBusy(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(''); setCreatedLink(null);
    if (!orderNumber.trim()) return;
    setCreating(true);
    try {
      const r: any = await create({ data: { orderNumber: orderNumber.trim(), expiryMinutes: expiryMins } });
      setCreatedLink({ url: `${window.location.origin}${r.path}`, expiresAt: r.expiresAt });
      setOrderNumber('');
      load();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create link');
    }
    setCreating(false);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const setStatus = async (id: string, status: string) => {
    try { await upd({ data: { id, status: status as any } }); load(); } catch (e: any) { alert(e?.message); }
  };

  const applyChanges = async (id: string) => {
    if (!confirm('Apply requested changes directly to the order?')) return;
    try { await apply({ data: { id } }); load(); } catch (e: any) { alert(e?.message); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <TabHelp topic="order-modify" />
      <div>
        <h2 className="text-xl font-black">Order Modification Requests</h2>
        <p className="text-sm text-gray-500">Generate one-time links so customers can update their address, phone, or items before dispatch.</p>
      </div>

      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <h3 className="font-black text-gray-800 flex items-center gap-2"><Link2 size={16} className="text-orange-500" />Generate Modify Link</h3>
        <form onSubmit={handleCreate} className="grid sm:grid-cols-[1fr_120px_auto] gap-2">
          <input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="Order number (e.g. NP-12345)"
            className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          <input type="number" min={5} max={1440} value={expiryMins} onChange={e => setExpiryMins(Number(e.target.value) || 30)}
            className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" placeholder="mins" />
          <button type="submit" disabled={creating}
            className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50">
            {creating ? 'Creating…' : 'Generate'}
          </button>
        </form>
        {createError && <p className="text-sm text-red-500">{createError}</p>}
        {createdLink && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-green-700">Link created. Share via WhatsApp / Email / SMS:</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 text-xs bg-white border rounded-lg px-2 py-1.5 truncate">{createdLink.url}</code>
              <button type="button" onClick={() => copy(createdLink.url)} className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={11} /> Expires {new Date(createdLink.expiresAt).toLocaleString()}
            </p>
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-black text-gray-800">Modification Requests</h3>
          <div className="flex gap-2 items-center">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-xs bg-white">
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <button type="button" onClick={load} className="text-gray-500 hover:text-gray-800"><RefreshCw size={14} /></button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-8">No modification requests yet.</div>
        ) : (
          <>
            {selected.size > 0 && (
              <div className="flex flex-wrap gap-2 items-center bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs">
                <span className="font-bold text-orange-800">{selected.size} selected</span>
                <button disabled={bulkBusy} onClick={() => bulkSetStatus('approved')} className="px-2 py-1 bg-white border rounded-lg font-bold hover:border-orange-300 disabled:opacity-50">Approve</button>
                <button disabled={bulkBusy} onClick={() => bulkSetStatus('rejected')} className="px-2 py-1 bg-white border rounded-lg font-bold hover:border-orange-300 disabled:opacity-50">Reject</button>
                <button disabled={bulkBusy} onClick={bulkApply} className="px-2 py-1 bg-green-600 text-white rounded-lg font-bold disabled:opacity-50">Apply approved</button>
                <button disabled={bulkBusy} onClick={() => bulkSetStatus('completed')} className="px-2 py-1 bg-white border rounded-lg font-bold hover:border-orange-300 disabled:opacity-50">Mark completed</button>
                <button onClick={() => setSelected(new Set())} className="ml-auto text-gray-500 hover:underline">Clear</button>
              </div>
            )}
            <div className="flex items-center gap-2 px-1 pt-1 text-[11px] text-gray-500">
              <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} />
              <span>Select all on this page</span>
            </div>
            <div className="divide-y">
              {rows.map(r => (
                <div key={r.id} className="py-3 space-y-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm">#{r.order_number} <span className="text-xs text-gray-400">· {r.customer_name}</span></div>
                      <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <select value={r.status} onChange={e => setStatus(r.id, e.target.value)}
                        className="border rounded-lg px-2 py-1 text-xs bg-white">
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                      {r.status === 'approved' && (
                        <button type="button" onClick={() => applyChanges(r.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                          <PlayCircle size={12} /> Apply
                        </button>
                      )}
                    </div>
                  </div>
                  {(r.requested_address || r.requested_phone || r.requested_items || r.customer_notes) && (
                    <details className="text-xs text-gray-600">
                      <summary className="cursor-pointer text-orange-600 font-bold">View requested changes</summary>
                      <pre className="bg-gray-50 rounded-lg p-2 mt-1 overflow-auto text-[11px]">{JSON.stringify({
                        requested_address: r.requested_address,
                        requested_phone: r.requested_phone,
                        requested_items: r.requested_items,
                        customer_notes: r.customer_notes,
                      }, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

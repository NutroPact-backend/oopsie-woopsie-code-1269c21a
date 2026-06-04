// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Mail, Phone, MessageSquare, Trash2, Download, Search, RefreshCw, CheckCircle, Clock, Eye, X, Filter } from 'lucide-react';
import { TabHelp } from "./_TabHelp";

import API from '@/lib/api';
const AdminAPI = API;
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  read: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  new: <Mail size={11} />,
  read: <Eye size={11} />,
  resolved: <CheckCircle size={11} />,
};

function DetailModal({ sub, onClose, onStatusChange, onDelete }: { sub: any; onClose: () => void; onStatusChange: (id: string, status: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-black text-lg text-gray-900">{sub.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(sub.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-400 mb-1">Email</p>
              <a href={`mailto:${sub.email}`} className="text-blue-600 hover:underline break-all">{sub.email}</a>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-400 mb-1">Phone</p>
              <a href={`tel:${sub.phone}`} className="text-gray-800">{sub.phone || '—'}</a>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="text-xs font-bold text-gray-400 mb-1">Subject</p>
            <p className="text-gray-800 font-semibold">{sub.subject}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="text-xs font-bold text-gray-400 mb-2">Message</p>
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{sub.message}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-gray-500">Status:</p>
            {(['new', 'read', 'resolved'] as string[]).map(s => (
              <button key={s} onClick={() => onStatusChange(sub._id, s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold capitalize transition ${sub.status === s ? STATUS_COLORS[s] : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}>
                {STATUS_ICONS[s]} {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center p-5 border-t gap-3">
          <button onClick={() => { onDelete(sub._id); onClose(); }}
            className="flex items-center gap-2 px-4 py-2 text-red-500 border border-red-200 hover:bg-red-50 rounded-xl text-sm font-bold transition">
            <Trash2 size={14} /> Delete
          </button>
          <div className="flex gap-2">
            <a href={`mailto:${sub.email}?subject=Re: ${encodeURIComponent(sub.subject)}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition">
              <Mail size={14} /> Reply via Email
            </a>
            {sub.phone && (
              <a href={`https://wa.me/${sub.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition">
                <MessageSquare size={14} /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContactTab() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { status: statusFilter };
      if (search.trim()) params.search = search.trim();
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const { data } = await AdminAPI.get('/admin/contact', { params });
      setSubmissions(data);
    } catch {}
    setLoading(false);
  }, [search, statusFilter, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await AdminAPI.put(`/admin/contact/${id}`, { status });
    setSubmissions(prev => prev.map(s => s._id === id ? { ...s, status } : s));
    if (selected?._id === id) setSelected((s: any) => s ? { ...s, status } : s);
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm('Delete this message? This cannot be undone.')) return;
    await AdminAPI.delete(`/admin/contact/${id}`);
    setSubmissions(prev => prev.filter(s => s._id !== id));
  };

  const downloadCSV = () => {
    const params = new URLSearchParams();
    const token = sessionStorage.getItem('np_admin_token') || '';
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    const base = import.meta.env.VITE_API_URL || '/api';
    const url = `${base}/admin/contact/export?${params.toString()}`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('x-admin-token', token);
    // Fetch with auth header then trigger download
    fetch(url, { headers: { 'x-admin-token': token } })
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `contact-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(blobUrl);
      });
  };

  const counts = {
    all: submissions.length,
    new: submissions.filter(s => s.status === 'new').length,
    read: submissions.filter(s => s.status === 'read').length,
    resolved: submissions.filter(s => s.status === 'resolved').length,
  };

  return (
    <div className="space-y-5">
      <TabHelp topic="contact" />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Contact Submissions</h2>
          <p className="text-sm text-gray-500 mt-0.5">Messages received from the Contact Us form</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-bold hover:bg-gray-50 transition">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition">
            <Download size={14} /> Export Excel (CSV)
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', key: 'all', color: 'bg-gray-100 text-gray-700', icon: <MessageSquare size={16} /> },
          { label: 'New', key: 'new', color: 'bg-blue-100 text-blue-700', icon: <Mail size={16} /> },
          { label: 'Read', key: 'read', color: 'bg-yellow-100 text-yellow-700', icon: <Eye size={16} /> },
          { label: 'Resolved', key: 'resolved', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={16} /> },
        ].map(({ label, key, color, icon }) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`rounded-2xl p-4 text-left border-2 transition ${statusFilter === key ? 'border-orange-400 shadow-sm' : 'border-transparent'} ${color}`}>
            <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs font-bold uppercase tracking-wide">{label}</span></div>
            <p className="text-2xl font-black">{counts[key as keyof typeof counts]}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="text-xs font-bold text-gray-500 block mb-1"><Search size={10} className="inline mr-1" />Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name, email, message..." onKeyDown={e => e.key === 'Enter' && load()}
                className="w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-orange-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1"><Filter size={10} className="inline mr-1" />Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1"><Clock size={10} className="inline mr-1" />From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <button onClick={load} className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition">
            Apply
          </button>
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setFromDate(''); setToDate(''); }}
            className="px-4 py-2.5 border rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition">
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold">No submissions found</p>
            <p className="text-sm mt-1">Messages from your Contact Us page will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Date & Time</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Subject</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Message</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {submissions.map(sub => (
                  <tr key={sub._id} className={`hover:bg-gray-50 transition cursor-pointer ${sub.status === 'new' ? 'bg-blue-50/30' : ''}`}
                    onClick={() => { setSelected(sub); updateStatus(sub._id, sub.status === 'new' ? 'read' : sub.status); }}>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500">
                      {new Date(sub.createdAt).toLocaleDateString('en-IN')}<br />
                      <span className="text-gray-400">{new Date(sub.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className={`font-bold ${sub.status === 'new' ? 'text-gray-900' : 'text-gray-700'}`}>{sub.name}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-blue-600 text-xs">{sub.email}</p>
                      {sub.phone && <p className="text-gray-400 text-xs mt-0.5">{sub.phone}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-gray-700 text-xs font-medium">{sub.subject}</span>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="text-gray-500 text-xs truncate">{sub.message}</p>
                    </td>
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <select value={sub.status} onChange={e => updateStatus(sub._id, e.target.value)}
                        className={`text-xs font-bold border rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none ${STATUS_COLORS[sub.status]}`}>
                        <option value="new">New</option>
                        <option value="read">Read</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <a href={`mailto:${sub.email}?subject=Re: ${encodeURIComponent(sub.subject)}`}
                          className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Reply">
                          <Mail size={14} />
                        </a>
                        {sub.phone && (
                          <a href={`https://wa.me/${sub.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 text-green-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="WhatsApp">
                            <Phone size={14} />
                          </a>
                        )}
                        <button onClick={() => deleteSubmission(sub._id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          sub={selected}
          onClose={() => setSelected(null)}
          onStatusChange={updateStatus}
          onDelete={deleteSubmission}
        />
      )}
    </div>
  );
}

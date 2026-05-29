// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { listSupportConversations, getSupportThread, replySupportThread, setSupportStatus } from '@/lib/admin-ops.functions';
import { MessageCircle, Send, CheckCircle2, RefreshCw } from 'lucide-react';
import { TabHelp } from './_TabHelp';

export default function SupportInboxTab() {
  const listFn = useServerFn(listSupportConversations);
  const threadFn = useServerFn(getSupportThread);
  const replyFn = useServerFn(replySupportThread);
  const statusFn = useServerFn(setSupportStatus);

  const [filter, setFilter] = useState<'open' | 'handoff' | 'closed' | 'all'>('open');
  const [convs, setConvs] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [thread, setThread] = useState<{ conversation: any; messages: any[] } | null>(null);
  const [reply, setReply] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const loadList = () => listFn({ data: { status: filter } } as any).then((r: any) => { setConvs(r.items || []); setSelected(new Set()); });
  const loadThread = (id: string) => { setActive(id); threadFn({ data: { conversationId: id } } as any).then((r: any) => setThread(r)); };

  useEffect(() => { loadList(); /* eslint-disable-next-line */ }, [filter]);

  const toggleSel = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === convs.length ? new Set() : new Set(convs.map(c => c.id)));
  const bulkSetStatus = async (status: 'closed' | 'open') => {
    if (selected.size === 0) return;
    if (!confirm(`Mark ${selected.size} conversation(s) as ${status}?`)) return;
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map(id => statusFn({ data: { conversationId: id, status } } as any)));
      loadList();
      if (active && selected.has(active)) loadThread(active);
    } catch (e: any) { alert(e?.message || 'Bulk update failed'); }
    setBulkBusy(false);
  };

  const send = async () => {
    if (!active || !reply.trim()) return;
    await replyFn({ data: { conversationId: active, content: reply } } as any);
    setReply('');
    loadThread(active); loadList();
  };
  const close = async () => {
    if (!active) return;
    await statusFn({ data: { conversationId: active, status: 'closed' } } as any);
    loadThread(active); loadList();
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <TabHelp topic="supportInbox" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2"><MessageCircle size={22} /> Support Inbox</h1>
        <div className="flex items-center gap-2">
          {(['open', 'handoff', 'closed', 'all'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${filter === s ? 'bg-orange-500 text-white' : 'bg-white border hover:bg-gray-50'}`}>{s}</button>
          ))}
          <button onClick={loadList} className="p-1.5 border rounded-lg hover:bg-gray-50"><RefreshCw size={14} /></button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap gap-2 items-center bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs">
          <span className="font-bold text-orange-800">{selected.size} selected</span>
          <button disabled={bulkBusy} onClick={() => bulkSetStatus('closed')} className="px-2 py-1 bg-white border rounded-lg font-bold hover:border-orange-300 disabled:opacity-50">Close selected</button>
          <button disabled={bulkBusy} onClick={() => bulkSetStatus('open')} className="px-2 py-1 bg-white border rounded-lg font-bold hover:border-orange-300 disabled:opacity-50">Reopen selected</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-gray-500 hover:underline">Clear</button>
        </div>
      )}

      <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[70vh]">
        <div className="bg-white border rounded-2xl overflow-y-auto">
          {convs.length > 0 && (
            <label className="flex items-center gap-2 px-3 py-2 border-b text-[11px] text-gray-500 bg-gray-50">
              <input type="checkbox" checked={selected.size > 0 && selected.size === convs.length} onChange={toggleAll} />
              Select all
            </label>
          )}
          {convs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No conversations</div>
          ) : convs.map(c => (
            <div key={c.id} className={`w-full px-4 py-3 border-b hover:bg-orange-50/40 flex items-start gap-2 ${active === c.id ? 'bg-orange-50' : ''}`}>
              <input type="checkbox" className="mt-1" checked={selected.has(c.id)} onChange={() => toggleSel(c.id)} onClick={e => e.stopPropagation()} />
              <button onClick={() => loadThread(c.id)} className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm truncate">{c.subject || (c.user_id ? `User ${c.user_id.slice(0, 6)}` : `Guest ${c.guest_token?.slice(0, 6) || '—'}`)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    c.status === 'open' ? 'bg-green-100 text-green-700' :
                    c.status === 'handoff' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>{c.status}</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{new Date(c.last_message_at).toLocaleString()}</p>
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white border rounded-2xl flex flex-col">
          {!thread ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Select a conversation</div>
          ) : (
            <>
              <div className="px-5 py-3 border-b flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{thread.conversation?.subject || 'Conversation'}</p>
                  <p className="text-xs text-gray-400">{thread.conversation?.user_id ? `User ${thread.conversation.user_id.slice(0, 8)}` : `Guest ${thread.conversation?.guest_token?.slice(0, 8) || '—'}`}</p>
                </div>
                {thread.conversation?.status !== 'closed' && (
                  <button onClick={close} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-gray-50">
                    <CheckCircle2 size={13} /> Close
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {thread.messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      m.role === 'user' ? 'bg-gray-100' :
                      m.role === 'admin' ? 'bg-orange-500 text-white' :
                      m.role === 'assistant' ? 'bg-blue-50 text-blue-900' : 'bg-yellow-50 text-yellow-800'
                    }`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className={`text-[10px] mt-1 ${m.role === 'admin' ? 'text-orange-100' : 'text-gray-400'}`}>{m.role} · {new Date(m.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              {thread.conversation?.status !== 'closed' && (
                <div className="p-3 border-t flex gap-2">
                  <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }}
                    placeholder="Type your reply…" className="flex-1 border rounded-xl px-4 py-2 text-sm" />
                  <button onClick={send} disabled={!reply.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                    <Send size={14} /> Send
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

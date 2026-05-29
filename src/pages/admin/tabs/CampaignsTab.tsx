// @ts-nocheck
import { useEffect, useState, type ReactNode } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  listSegments, saveSegment, deleteSegment, previewSegment,
  listCampaigns, saveCampaign, deleteCampaign, sendCampaignNow,
  type SegmentRules,
} from '@/lib/campaigns.functions';
import { Users, Plus, Trash2, Eye, Send, Mail, MessageCircle, Bell, Smartphone, RefreshCw, X } from 'lucide-react';
import { TabHelp } from './_TabHelp';
import { useBulkSelection, BulkActionBar, SelectCheckbox } from '../components/BulkSelect';

type Segment = { id: string; name: string; description: string; rules: SegmentRules; cached_count: number; cached_at: string | null };
type Campaign = { id: string; name: string; segment_id: string | null; channel: string; subject: string; body: string; status: string; scheduled_at: string | null; sent_at: string | null; total_recipients: number; sent_count: number; failed_count: number; created_at: string };

const CHANNEL_ICONS: Record<string, ReactNode> = {
  email: <Mail size={12} />, whatsapp: <MessageCircle size={12} />,
  sms: <Smartphone size={12} />, push: <Bell size={12} />,
};

const EMPTY_RULES: SegmentRules = {};

export default function CampaignsTab() {
  const lsSegs = useServerFn(listSegments);
  const svSeg = useServerFn(saveSegment);
  const delSeg = useServerFn(deleteSegment);
  const pvSeg = useServerFn(previewSegment);
  const lsCamps = useServerFn(listCampaigns);
  const svCamp = useServerFn(saveCampaign);
  const delCamp = useServerFn(deleteCampaign);
  const sendCamp = useServerFn(sendCampaignNow);

  const [segs, setSegs] = useState<Segment[]>([]);
  const [camps, setCamps] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [segModal, setSegModal] = useState<Segment | 'new' | null>(null);
  const [campModal, setCampModal] = useState<Campaign | 'new' | null>(null);
  const bulkSeg = useBulkSelection(segs, (s) => s.id);
  const bulkCamp = useBulkSelection(camps, (c) => c.id);

  const load = async () => {
    setLoading(true);
    try {
      const [s, c]: any = await Promise.all([lsSegs({}), lsCamps({})]);
      setSegs(s?.rows || []); setCamps(c?.rows || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <TabHelp topic="campaigns" />
      <div>
        <h2 className="text-xl font-black flex items-center gap-2"><Users size={20} className="text-orange-500" /> Segments & Campaigns</h2>
        <p className="text-sm text-gray-500">Audiences banao, fir email / WhatsApp / SMS / push blast karo.</p>
      </div>

      {/* Segments */}
      <section className="bg-white rounded-2xl p-5 border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-gray-800">Customer Segments</h3>
          <div className="flex gap-2">
            <button onClick={load} className="text-gray-500 hover:text-gray-800"><RefreshCw size={14} /></button>
            <button onClick={() => setSegModal('new')} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Plus size={12} />New segment</button>
          </div>
        </div>
        {loading ? <div className="text-sm text-gray-400">Loading…</div>
          : segs.length === 0 ? <div className="text-sm text-gray-400 text-center py-6">No segments yet.</div>
          : (
            <>
              <BulkActionBar
                count={bulkSeg.count}
                ids={Array.from(bulkSeg.selected)}
                onClear={bulkSeg.clear}
                actions={[
                  { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} segments?',
                    run: async (ids) => { await Promise.all(ids.map(id => delSeg({ data: { id } }))); load(); } },
                ]}
              />
              {segs.length > 0 && (
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 pb-2">
                  <SelectCheckbox checked={bulkSeg.allSelected} indeterminate={bulkSeg.someSelected} onChange={bulkSeg.toggleAll} />
                  Select all ({segs.length})
                </label>
              )}
              <div className="divide-y">
                {segs.map(s => (
                  <div key={s.id} className="py-3 flex items-start justify-between gap-3">
                    <SelectCheckbox checked={bulkSeg.isSelected(s.id)} onChange={() => bulkSeg.toggleOne(s.id)} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm">{s.name} <span className="text-xs text-gray-400 font-normal">· {s.cached_count} customers</span></div>
                      {s.description && <div className="text-xs text-gray-500">{s.description}</div>}
                      <div className="text-[11px] text-gray-400">{rulesSummary(s.rules)}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setSegModal(s)} className="bg-gray-100 px-2 py-1 rounded-lg text-xs font-bold">Edit</button>
                      <button onClick={async () => { if (confirm('Delete segment?')) { await delSeg({ data: { id: s.id } }); load(); } }} className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-xs font-bold"><Trash2 size={11} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
      </section>

      {/* Campaigns */}
      <section className="bg-white rounded-2xl p-5 border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-gray-800">Campaigns</h3>
          <button onClick={() => setCampModal('new')} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Plus size={12} />New campaign</button>
        </div>
        {camps.length === 0 ? <div className="text-sm text-gray-400 text-center py-6">No campaigns yet.</div>
          : (
            <>
              <BulkActionBar
                count={bulkCamp.count}
                ids={Array.from(bulkCamp.selected)}
                onClear={bulkCamp.clear}
                actions={[
                  { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} campaigns?',
                    run: async (ids) => { await Promise.all(ids.map(id => delCamp({ data: { id } }))); load(); } },
                  { key: 'send', label: 'Send now', color: 'bg-green-600 hover:bg-green-700', confirm: 'Send {n} campaigns now?',
                    run: async (ids) => {
                      const eligible = camps.filter(c => ids.includes(c.id) && (c.status === 'draft' || c.status === 'scheduled' || c.status === 'failed'));
                      await Promise.all(eligible.map(c => sendCamp({ data: { id: c.id } }).catch(() => null)));
                      load();
                    } },
                ]}
              />
              {camps.length > 0 && (
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 pb-2">
                  <SelectCheckbox checked={bulkCamp.allSelected} indeterminate={bulkCamp.someSelected} onChange={bulkCamp.toggleAll} />
                  Select all ({camps.length})
                </label>
              )}
            <div className="divide-y">
              {camps.map(c => (
                <div key={c.id} className="py-3 space-y-1">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <SelectCheckbox checked={bulkCamp.isSelected(c.id)} onChange={() => bulkCamp.toggleOne(c.id)} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm flex items-center gap-2">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">{CHANNEL_ICONS[c.channel]} {c.channel}</span>
                        {c.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-md">{c.subject || c.body.slice(0, 80)}</div>
                      <div className="text-[11px] text-gray-400">
                        {c.sent_at ? `Sent ${new Date(c.sent_at).toLocaleString()} · ${c.sent_count}/${c.total_recipients} ok, ${c.failed_count} skip` : c.scheduled_at ? `Scheduled ${new Date(c.scheduled_at).toLocaleString()}` : 'Draft'}
                      </div>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        c.status === 'sent' ? 'bg-green-100 text-green-700'
                        : c.status === 'sending' ? 'bg-blue-100 text-blue-700'
                        : c.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700'
                        : c.status === 'failed' ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>{c.status}</span>
                      {(c.status === 'draft' || c.status === 'scheduled' || c.status === 'failed') && (
                        <button onClick={async () => { if (!confirm(`Send "${c.name}" now?`)) return; try { const r: any = await sendCamp({ data: { id: c.id } }); alert(`Queued: ${r.queued}\nSkipped (no ${c.channel}): ${r.skipped}\nFailed: ${r.failed}`); load(); } catch (e: any) { alert(e?.message); } }}
                          className="bg-green-500 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Send size={11} />Send</button>
                      )}
                      {c.status !== 'sending' && (
                        <button onClick={async () => { if (confirm('Delete campaign?')) { await delCamp({ data: { id: c.id } }); load(); } }} className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-xs font-bold"><Trash2 size={11} /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
      </section>

      {segModal && <SegmentModal initial={segModal === 'new' ? null : segModal} onClose={() => setSegModal(null)} onSave={async (patch) => { await svSeg({ data: patch }); setSegModal(null); load(); }} preview={pvSeg} />}
      {campModal && <CampaignModal initial={campModal === 'new' ? null : campModal} segments={segs} onClose={() => setCampModal(null)} onSave={async (patch) => { await svCamp({ data: patch }); setCampModal(null); load(); }} />}
    </div>
  );
}

function rulesSummary(r: SegmentRules): string {
  const parts: string[] = [];
  if (r.minOrders !== undefined) parts.push(`≥${r.minOrders} orders`);
  if (r.minLifetimeValue !== undefined) parts.push(`LTV ≥₹${r.minLifetimeValue}`);
  if (r.lastOrderDaysAgoMin !== undefined) parts.push(`lapsed ${r.lastOrderDaysAgoMin}+d`);
  if (r.lastOrderDaysAgoMax !== undefined) parts.push(`active <${r.lastOrderDaysAgoMax}d`);
  if (r.city) parts.push(`city: ${r.city}`);
  if (r.state) parts.push(`state: ${r.state}`);
  if (r.pincode) parts.push(`pin: ${r.pincode}`);
  if (r.hasSubscription) parts.push('has subscription');
  if (r.registeredOnly) parts.push('registered only');
  return parts.length ? parts.join(' · ') : 'all customers';
}

function SegmentModal({ initial, onClose, onSave, preview }: {
  initial: Segment | null;
  onClose: () => void;
  onSave: (p: any) => Promise<void>;
  preview: (p: any) => Promise<any>;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [desc, setDesc] = useState(initial?.description || '');
  const [rules, setRules] = useState<SegmentRules>(initial?.rules || EMPTY_RULES);
  const [pv, setPv] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const upd = (patch: Partial<SegmentRules>) => setRules({ ...rules, ...patch });

  const num = (v: string) => v === '' ? undefined : Number(v);
  const str = (v: string) => v.trim() === '' ? undefined : v.trim();

  const runPreview = async () => {
    setBusy(true);
    try { setPv(await preview({ data: { rules } })); }
    catch (e: any) { alert(e?.message); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-auto space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-lg">{initial ? 'Edit segment' : 'New segment'}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Segment name *" className="w-full border rounded-lg px-3 py-2 text-sm" />
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />

        <div className="border-t pt-3">
          <p className="text-xs font-bold uppercase text-gray-500 mb-2">Filters (all must match)</p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <label>Min orders<input type="number" value={rules.minOrders ?? ''} onChange={e => upd({ minOrders: num(e.target.value) })} className="w-full border rounded-lg px-2 py-1.5 mt-0.5" /></label>
            <label>Min lifetime value ₹<input type="number" value={rules.minLifetimeValue ?? ''} onChange={e => upd({ minLifetimeValue: num(e.target.value) })} className="w-full border rounded-lg px-2 py-1.5 mt-0.5" /></label>
            <label>Lapsed since (days)<input type="number" value={rules.lastOrderDaysAgoMin ?? ''} onChange={e => upd({ lastOrderDaysAgoMin: num(e.target.value) })} className="w-full border rounded-lg px-2 py-1.5 mt-0.5" /></label>
            <label>Active within (days)<input type="number" value={rules.lastOrderDaysAgoMax ?? ''} onChange={e => upd({ lastOrderDaysAgoMax: num(e.target.value) })} className="w-full border rounded-lg px-2 py-1.5 mt-0.5" /></label>
            <label>City<input value={rules.city ?? ''} onChange={e => upd({ city: str(e.target.value) })} className="w-full border rounded-lg px-2 py-1.5 mt-0.5" /></label>
            <label>State<input value={rules.state ?? ''} onChange={e => upd({ state: str(e.target.value) })} className="w-full border rounded-lg px-2 py-1.5 mt-0.5" /></label>
            <label>Pincode<input value={rules.pincode ?? ''} onChange={e => upd({ pincode: str(e.target.value) })} className="w-full border rounded-lg px-2 py-1.5 mt-0.5" /></label>
            <label>Must have<select value={rules.channelRequired ?? ''} onChange={e => upd({ channelRequired: (e.target.value || undefined) as any })} className="w-full border rounded-lg px-2 py-1.5 mt-0.5 bg-white">
              <option value="">— any contact —</option><option value="email">Email</option><option value="phone">Phone</option><option value="any">Email or phone</option>
            </select></label>
          </div>
          <div className="flex gap-3 mt-2 text-sm">
            <label className="flex items-center gap-1"><input type="checkbox" checked={!!rules.hasSubscription} onChange={e => upd({ hasSubscription: e.target.checked || undefined })} />Has active subscription</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={!!rules.registeredOnly} onChange={e => upd({ registeredOnly: e.target.checked || undefined })} />Registered users only</label>
          </div>
        </div>

        <div className="border-t pt-3">
          <button onClick={runPreview} disabled={busy} className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Eye size={12} />{busy ? 'Counting…' : 'Preview audience'}</button>
          {pv && (
            <div className="mt-2 text-xs bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="font-bold">{pv.total} customers match · {pv.withEmail} with email · {pv.withPhone} with phone</div>
              {pv.sample.length > 0 && <div className="text-gray-500">Sample: {pv.sample.map((s: any) => s.name || s.email || s.phone).join(', ')}</div>}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t">
          <button onClick={onClose} className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-sm font-bold">Cancel</button>
          <button disabled={!name.trim()} onClick={() => onSave({ id: initial?.id, name, description: desc, rules })}
            className="flex-1 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50">{initial ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}

function CampaignModal({ initial, segments, onClose, onSave }: {
  initial: Campaign | null;
  segments: Segment[];
  onClose: () => void;
  onSave: (p: any) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [segmentId, setSegmentId] = useState(initial?.segment_id || segments[0]?.id || '');
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'sms' | 'push'>((initial?.channel as any) || 'email');
  const [subject, setSubject] = useState(initial?.subject || '');
  const [body, setBody] = useState(initial?.body || '');
  const [scheduledAt, setScheduledAt] = useState(initial?.scheduled_at ? initial.scheduled_at.slice(0, 16) : '');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-auto space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-lg">{initial ? 'Edit campaign' : 'New campaign'}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Campaign name *" className="w-full border rounded-lg px-3 py-2 text-sm" />
        <select value={segmentId} onChange={e => setSegmentId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">— pick segment —</option>
          {segments.map(s => <option key={s.id} value={s.id}>{s.name} ({s.cached_count})</option>)}
        </select>
        <div className="flex gap-2">
          {(['email', 'whatsapp', 'sms', 'push'] as const).map(c => (
            <button key={c} type="button" onClick={() => setChannel(c)} className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold capitalize flex items-center justify-center gap-1 ${channel === c ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}>{CHANNEL_ICONS[c]}{c}</button>
          ))}
        </div>
        {channel === 'email' && (
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject" className="w-full border rounded-lg px-3 py-2 text-sm" />
        )}
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={`Message body... ${channel === 'sms' ? '(keep <160 chars)' : ''}`} rows={6} className="w-full border rounded-lg px-3 py-2 text-sm" />
        <label className="block text-xs">Schedule for later (optional)
          <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5" />
        </label>
        <div className="flex gap-2 pt-2 border-t">
          <button onClick={onClose} className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-sm font-bold">Cancel</button>
          <button disabled={!name.trim() || !segmentId || !body.trim()} onClick={() => onSave({ id: initial?.id, name, segmentId, channel, subject, body, scheduledAt: scheduledAt || undefined })}
            className="flex-1 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50">{initial ? 'Save' : 'Create draft'}</button>
        </div>
      </div>
    </div>
  );
}

// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ShieldCheck, Download, AlertTriangle, Loader2, RefreshCw, Ban, CheckCircle2, Flag, IndianRupee, Truck, Zap, Trash2 } from 'lucide-react';
import {
  generateAuthCodes,
  listAuthCodes,
  authStats,
  listFlaggedScans,
  updateAuthCodeStatus,
  listAuthReports,
  updateAuthReport,
  addCheckpoint,
  listCheckpoints,
  deleteCheckpoint,
  runAnomalyScan,
} from '@/lib/product-auth.functions';
import Phase5Hub from '@/pages/admin/components/Phase5Hub';
import { TabHelp } from './_TabHelp';
import { useBulkSelection, BulkActionBar, SelectCheckbox } from '../components/BulkSelect';

export default function ProductAuthTab() {
  const gen = useServerFn(generateAuthCodes);
  const list = useServerFn(listAuthCodes);
  const stats = useServerFn(authStats);
  const flagged = useServerFn(listFlaggedScans);
  const update = useServerFn(updateAuthCodeStatus);
  const listReports = useServerFn(listAuthReports);
  const updateReport = useServerFn(updateAuthReport);
  const addCp = useServerFn(addCheckpoint);
  const listCp = useServerFn(listCheckpoints);
  const delCp = useServerFn(deleteCheckpoint);
  const anomaly = useServerFn(runAnomalyScan);

  const [s, setS] = useState<any>(null);
  const [codes, setCodes] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [batchCode, setBatchCode] = useState('NP' + new Date().toISOString().slice(2, 7).replace('-', ''));
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(50);
  const [expiryDays, setExpiryDays] = useState(730);
  const [busy, setBusy] = useState(false);
  const [filterBatch, setFilterBatch] = useState('');
  // Phase 3
  const [cpBatch, setCpBatch] = useState('');
  const [cpStage, setCpStage] = useState<'manufactured'|'quality_check'|'warehoused'|'shipped'|'delivered_retailer'|'sold'>('manufactured');
  const [cpLocation, setCpLocation] = useState('');
  const [cpNotes, setCpNotes] = useState('');
  const [cpList, setCpList] = useState<any[]>([]);
  const [anomalyRes, setAnomalyRes] = useState<any>(null);
  const [anomalyBusy, setAnomalyBusy] = useState(false);

  const codeBulk = useBulkSelection(codes, (c: any) => c.id);
  const reportBulk = useBulkSelection(reports, (r: any) => r.id);
  const cpBulk = useBulkSelection(cpList, (c: any) => c.id);

  const loadCheckpoints = async () => {
    if (!cpBatch) { setCpList([]); return; }
    const r = await listCp({ data: { batchCode: cpBatch } });
    setCpList(r.checkpoints || []);
  };
  const saveCp = async () => {
    if (!cpBatch) return alert('Enter batch code');
    await addCp({ data: { batchCode: cpBatch, stage: cpStage, location: cpLocation || undefined, notes: cpNotes || undefined } });
    setCpLocation(''); setCpNotes('');
    await loadCheckpoints();
  };
  const removeCp = async (id: string) => {
    if (!confirm('Delete checkpoint?')) return;
    await delCp({ data: { id } });
    await loadCheckpoints();
  };
  const doAnomaly = async () => {
    setAnomalyBusy(true);
    try { setAnomalyRes(await anomaly()); await refresh(); }
    catch (e: any) { alert('Failed: ' + (e?.message || e)); }
    finally { setAnomalyBusy(false); }
  };

  const refresh = async () => {
    const [a, b, c, d] = await Promise.all([
      stats(),
      list({ data: { batch: filterBatch || undefined, limit: 200 } }),
      flagged(),
      listReports({ data: { limit: 100 } }),
    ]);
    setS(a); setCodes(b.codes); setScans(c.scans); setReports(d.reports);
  };

  const handleReport = async (id: string, status: any, extra: any = {}) => {
    await updateReport({ data: { id, status, ...extra } });
    await refresh();
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const doGenerate = async () => {
    if (!batchCode.match(/^[A-Z0-9-]+$/i)) return alert('Batch code: letters, numbers, dashes only');
    setBusy(true);
    try {
      const r = await gen({ data: { batchCode, productId: productId || undefined, quantity: qty, expiryDays } });
      const csv = ['code,full_code,hidden_scratch,batch,verify_url']
        .concat(r.codes.map(c => `${c.code},${c.full},${c.hidden},${c.batch},${window.location.origin}/verify/${encodeURIComponent(c.full)}`))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proofpack-${batchCode}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      alert(`✅ Generated ${r.count} codes. CSV downloaded — print the QR + scratch panel from this.`);
      await refresh();
    } catch (e: any) {
      alert('Failed: ' + (e?.message || e));
    } finally { setBusy(false); }
  };

  const toggleBlock = async (row: any) => {
    const next = row.status === 'blocked' ? 'unused' : 'blocked';
    await update({ data: { id: row.id, status: next } });
    await refresh();
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
      unused: 'bg-gray-100 text-gray-700',
      verified: 'bg-green-100 text-green-700',
      flagged_duplicate: 'bg-yellow-100 text-yellow-800',
      flagged_geo: 'bg-orange-100 text-orange-800',
      flagged_tamper: 'bg-red-100 text-red-700',
      blocked: 'bg-red-600 text-white',
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <TabHelp topic="productAuth" />
      <div className="flex items-center gap-3">
        <ShieldCheck className="text-orange-500" />
        <div>
          <h2 className="text-2xl font-black">Product Authentication — ProofPack</h2>
          <p className="text-sm text-gray-500">Cryptographic anti-counterfeit codes with geo + behavioral detection.</p>
        </div>
      </div>

      {/* Phase 4: Distribution endpoints */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
        <h3 className="font-bold mb-2 flex items-center gap-2"><ShieldCheck size={16} className="text-orange-500" /> Public verification endpoints (Phase 4)</h3>
        <p className="text-xs text-gray-600 mb-3">Share these with retailers, marketplaces and distributors so they can embed live authenticity proof in their listings.</p>
        <div className="space-y-2 text-xs font-mono">
          <div className="bg-white rounded-lg p-2 border border-orange-200 break-all">
            <span className="text-gray-500">JSON API:</span> GET <b>/api/public/verify-product?code=BATCH-NONCE-HMAC</b>
          </div>
          <div className="bg-white rounded-lg p-2 border border-orange-200 break-all">
            <span className="text-gray-500">SVG Badge:</span> <code>{`<img src="/api/public/trust-badge?batch=BATCH" alt="ProofPack verified" />`}</code>
          </div>
          <div className="bg-white rounded-lg p-2 border border-orange-200 break-all">
            <span className="text-gray-500">Certificate:</span> <b>/verify/{`<full-code>`}/certificate</b> (printable PDF-ready)
          </div>
        </div>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Codes" value={s?.totalCodes ?? '—'} />
        <StatCard label="Total Scans" value={s?.totalScans ?? '—'} />
        <StatCard label="Rejected Scans" value={s?.rejectedScans ?? '—'} accent="text-red-600" />
        <StatCard label="Verified" value={s?.byStatus?.verified ?? 0} accent="text-green-600" />
      </div>

      {/* Generate */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Download size={16} /> Generate new batch</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Input label="Batch code" value={batchCode} onChange={setBatchCode} />
          <Input label="Product ID (optional)" value={productId} onChange={setProductId} placeholder="e.g. whey-protein-1kg" />
          <NumInput label="Quantity" value={qty} onChange={setQty} min={1} max={5000} />
          <NumInput label="Expiry (days)" value={expiryDays} onChange={setExpiryDays} min={0} max={3650} />
          <button
            onClick={doGenerate}
            disabled={busy}
            className="self-end bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            Generate & Download CSV
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          CSV has the full signed code + hidden scratch code. Send to printer for QR + scratch panel. Hidden codes are stored as one-way hashes only.
        </p>
      </div>

      {/* Flagged scans */}
      {scans.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-red-700">
            <AlertTriangle size={16} /> Recent counterfeit / rejected scans ({scans.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-red-700">
                <tr><th className="py-1">Time</th><th>Code</th><th>Reason</th><th>IP</th><th>Location</th></tr>
              </thead>
              <tbody>
                {scans.slice(0, 30).map((sc) => (
                  <tr key={sc.id} className="border-t border-red-200">
                    <td className="py-1.5">{new Date(sc.scanned_at).toLocaleString()}</td>
                    <td className="font-mono">{sc.code}</td>
                    <td className="font-bold">{sc.rejection_reason}</td>
                    <td>{sc.ip || '—'}</td>
                    <td>{[sc.city, sc.country].filter(Boolean).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Codes */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h3 className="font-bold">Issued codes</h3>
          <div className="flex gap-2">
            <input
              value={filterBatch}
              onChange={e => setFilterBatch(e.target.value)}
              placeholder="Filter by batch"
              className="border rounded-lg px-3 py-1.5 text-sm"
            />
            <button onClick={refresh} className="bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 text-sm flex items-center gap-1.5">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
        <BulkActionBar
          count={codeBulk.count}
          ids={Array.from(codeBulk.selected)}
          onClear={codeBulk.clear}
          actions={[
            { key: 'block', label: 'Block', color: 'bg-red-600 hover:bg-red-700', confirm: 'Block {n} codes? Future scans will be rejected.',
              run: async (ids) => { await Promise.all(ids.map(id => update({ data: { id, status: 'blocked' } }))); await refresh(); } },
            { key: 'unblock', label: 'Unblock', color: 'bg-emerald-600 hover:bg-emerald-700',
              run: async (ids) => { await Promise.all(ids.map(id => update({ data: { id, status: 'unused' } }))); await refresh(); } },
          ]}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2 w-6">
                  <SelectCheckbox checked={codeBulk.allSelected} indeterminate={codeBulk.someSelected} onChange={codeBulk.toggleAll} title="Select all" />
                </th>
                <th className="py-2">Code</th><th>Batch</th><th>Status</th><th>Scans</th>
                <th>First scan</th><th>Last scan</th><th></th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-2"><SelectCheckbox checked={codeBulk.isSelected(c.id)} onChange={() => codeBulk.toggleOne(c.id)} /></td>
                  <td className="py-2 font-mono">{c.code}</td>
                  <td>{c.batch_code}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{c.scan_count}</td>
                  <td>{c.first_scan_at ? `${new Date(c.first_scan_at).toLocaleDateString()} · ${c.first_scan_country || '?'}` : '—'}</td>
                  <td>{c.last_scan_at ? new Date(c.last_scan_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <button
                      onClick={() => toggleBlock(c)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg ${c.status === 'blocked' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {c.status === 'blocked' ? <CheckCircle2 size={12} className="inline" /> : <Ban size={12} className="inline" />}
                      {c.status === 'blocked' ? ' Unblock' : ' Block'}
                    </button>
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No codes yet. Generate a batch above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Counterfeit reports (bounty queue) */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Flag size={16} className="text-orange-500" /> Counterfeit reports ({reports.length})
        </h3>
        <BulkActionBar
          count={reportBulk.count}
          ids={Array.from(reportBulk.selected)}
          onClear={reportBulk.clear}
          actions={[
            { key: 'investigate', label: 'Mark Investigating', color: 'bg-blue-600 hover:bg-blue-700',
              run: async (ids) => { await Promise.all(ids.map(id => updateReport({ data: { id, status: 'investigating' } }))); await refresh(); } },
            { key: 'reject', label: 'Reject', color: 'bg-gray-700 hover:bg-gray-800', confirm: 'Reject {n} reports?',
              run: async (ids) => { await Promise.all(ids.map(id => updateReport({ data: { id, status: 'rejected' } }))); await refresh(); } },
          ]}
        />
        {reports.length > 0 && (
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2">
            <SelectCheckbox checked={reportBulk.allSelected} indeterminate={reportBulk.someSelected} onChange={reportBulk.toggleAll} />
            Select all ({reports.length})
          </label>
        )}
        {reports.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No reports yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="border rounded-xl p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <SelectCheckbox checked={reportBulk.isSelected(r.id)} onChange={() => reportBulk.toggleOne(r.id)} />
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-bold">{r.reporter_name} <span className="text-xs text-gray-500 font-normal">· {r.reporter_email}</span></p>
                    <p className="text-xs text-gray-600 mt-0.5"><b>Reason:</b> {r.reason}</p>
                    {r.code && <p className="text-[11px] font-mono text-gray-500 mt-0.5">{r.code}</p>}
                    {r.purchase_location && <p className="text-xs text-gray-500 mt-0.5">📍 {r.purchase_location}</p>}
                    {r.details && <p className="text-xs text-gray-700 mt-1">{r.details}</p>}
                    {Array.isArray(r.photo_urls) && r.photo_urls.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {r.photo_urls.map((u: string, i: number) => (
                          <a key={i} href={u} target="_blank" rel="noopener noreferrer">
                            <img src={u} alt="" className="w-14 h-14 object-cover rounded border" />
                          </a>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(r.created_at).toLocaleString()} · IP {r.ip || '?'}</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-center ${
                      r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      r.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                      r.status === 'verified_counterfeit' ? 'bg-red-100 text-red-700' :
                      r.status === 'paid' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{r.status.replace('_', ' ')}</span>
                    {r.bounty_amount > 0 && <span className="text-xs font-bold text-green-700 text-center"><IndianRupee size={10} className="inline" />{r.bounty_amount}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {r.status === 'pending' && (
                    <button onClick={() => handleReport(r.id, 'investigating')} className="text-[11px] bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-lg">Investigate</button>
                  )}
                  {r.status !== 'paid' && r.status !== 'rejected' && (
                    <>
                      <button onClick={() => {
                        const amt = Number(prompt('Bounty amount (₹):', '500'));
                        if (amt > 0) handleReport(r.id, 'verified_counterfeit', { bountyAmount: amt });
                      }} className="text-[11px] bg-red-100 text-red-700 font-bold px-3 py-1 rounded-lg">Confirm counterfeit + set bounty</button>
                      <button onClick={() => handleReport(r.id, 'rejected')} className="text-[11px] bg-gray-100 text-gray-700 font-bold px-3 py-1 rounded-lg">Reject</button>
                    </>
                  )}
                  {r.status === 'verified_counterfeit' && r.bounty_amount > 0 && (
                    <button onClick={() => handleReport(r.id, 'paid', { markBountyPaid: true })} className="text-[11px] bg-green-100 text-green-700 font-bold px-3 py-1 rounded-lg">Mark bounty paid</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phase 3 — Supply chain checkpoints */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Truck size={16} className="text-orange-500" /> Supply chain checkpoints</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input value={cpBatch} onChange={e => setCpBatch(e.target.value.toUpperCase())} onBlur={loadCheckpoints} placeholder="Batch code" className="border rounded-lg px-3 py-2 text-sm md:col-span-1" />
          <select value={cpStage} onChange={e => setCpStage(e.target.value as any)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="manufactured">Manufactured</option>
            <option value="quality_check">Quality check</option>
            <option value="warehoused">Warehoused</option>
            <option value="shipped">Shipped</option>
            <option value="delivered_retailer">Delivered to retailer</option>
            <option value="sold">Sold</option>
          </select>
          <input value={cpLocation} onChange={e => setCpLocation(e.target.value)} placeholder="Location (city/warehouse)" className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />
          <input value={cpNotes} onChange={e => setCpNotes(e.target.value)} placeholder="Notes" className="border rounded-lg px-3 py-2 text-sm" />
          <button onClick={saveCp} className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg px-3 py-2 text-sm">Add</button>
        </div>
        {cpBatch && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">{cpList.length} checkpoint(s) for <b>{cpBatch}</b></p>
            <BulkActionBar
              count={cpBulk.count}
              ids={Array.from(cpBulk.selected)}
              onClear={cpBulk.clear}
              actions={[
                { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} checkpoints?',
                  run: async (ids) => { await Promise.all(ids.map(id => delCp({ data: { id } }))); await loadCheckpoints(); } },
              ]}
            />
            {cpList.length > 0 && (
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2">
                <SelectCheckbox checked={cpBulk.allSelected} indeterminate={cpBulk.someSelected} onChange={cpBulk.toggleAll} />
                Select all ({cpList.length})
              </label>
            )}
            <ol className="space-y-1.5">
              {cpList.map((cp) => (
                <li key={cp.id} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg p-2">
                  <SelectCheckbox checked={cpBulk.isSelected(cp.id)} onChange={() => cpBulk.toggleOne(cp.id)} />
                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  <span className="font-bold capitalize w-32">{cp.stage.replace(/_/g, ' ')}</span>
                  <span className="flex-1 text-gray-600">{cp.location || '—'} {cp.notes && `· ${cp.notes}`}</span>
                  <span className="text-gray-400">{new Date(cp.occurred_at).toLocaleString()}</span>
                  <button onClick={() => removeCp(cp.id)} className="text-red-500 hover:text-red-700"><Trash2 size={12} /></button>
                </li>
              ))}
              {cpList.length === 0 && <li className="text-xs text-gray-400 text-center py-3">No checkpoints yet.</li>}
            </ol>
          </div>
        )}
      </div>

      {/* Phase 3 — Anomaly scan */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-bold flex items-center gap-2"><Zap size={16} className="text-orange-500" /> Anomaly scan</h3>
            <p className="text-xs text-gray-500 mt-1">Auto-flag batches with &gt;30% rejection rate in last 30 days (min 10 scans).</p>
          </div>
          <button onClick={doAnomaly} disabled={anomalyBusy} className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl px-4 py-2 text-sm disabled:opacity-50 flex items-center gap-2">
            {anomalyBusy ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />} Run scan
          </button>
        </div>
        {anomalyRes && (
          <div className="mt-3 text-xs">
            <p className="text-gray-600">Scanned {anomalyRes.scannedBatches} batches · <b className="text-red-600">{anomalyRes.flaggedBatches.length} flagged</b></p>
            {anomalyRes.flaggedBatches.length > 0 && (
              <ul className="mt-2 space-y-1">
                {anomalyRes.flaggedBatches.map((b: any) => (
                  <li key={b.batch} className="bg-red-50 rounded-lg p-2 flex items-center gap-2">
                    <AlertTriangle size={12} className="text-red-600" />
                    <span className="font-mono font-bold">{b.batch}</span>
                    <span className="text-gray-600">{b.rejected}/{b.total} rejected ({b.rate}%)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-200">
        <p className="text-sm">
          🌐 <b>Public counterfeit map:</b>{' '}
          <a href="/verify/heatmap" target="_blank" rel="noopener noreferrer" className="text-orange-700 font-bold underline">/verify/heatmap</a>
          <span className="text-xs text-gray-500 ml-2">— shareable transparency page for customers</span>
        </p>
      </div>

      <Phase5Hub />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: any; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200">
      <p className="text-xs text-gray-500 font-semibold">{label}</p>
      <p className={`text-2xl font-black mt-1 ${accent || ''}`}>{value}</p>
    </div>
  );
}
function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="text-xs font-bold text-gray-600 block">
      {label}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" />
    </label>
  );
}
function NumInput({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <label className="text-xs font-bold text-gray-600 block">
      {label}
      <input type="number" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal" />
    </label>
  );
}

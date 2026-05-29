// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { getReturnByToken, submitReturn } from '@/lib/returns.functions';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import { formatPrice } from '@/lib/utils';
import { CheckCircle, Clock, X, Upload, AlertCircle } from 'lucide-react';

export default function ReturnPage() {
  const { token } = useParams({ strict: false }) as { token: string };
  const fetchByToken = useServerFn(getReturnByToken);
  const submit = useServerFn(submitReturn);

  const [state, setState] = useState<'loading' | 'invalid' | 'ready' | 'submitting' | 'done'>('loading');
  const [error, setError] = useState('');
  const [info, setInfo] = useState<any>(null);

  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [refundMode, setRefundMode] = useState<'wallet' | 'source'>('wallet');
  const [photos, setPhotos] = useState<string[]>([]);
  const { uploadFile, isUploading, progress } = useSimpleUpload({
    onSuccess: (url: string) => setPhotos(p => [...p, url].slice(0, 6)),
  });

  useEffect(() => {
    if (!token) { setState('invalid'); setError('Missing token'); return; }
    fetchByToken({ data: { token } })
      .then((r: any) => {
        if (r?.ok) { setInfo(r); setState('ready'); }
        else { setError(r?.error || 'Invalid link'); setState('invalid'); }
      })
      .catch(() => { setError('Could not verify link'); setState('invalid'); });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setState('submitting');
    try {
      await submit({ data: { token, reason: reason.trim(), details: details.trim(), photos, refundMode } });
      setState('done');
    } catch (err: any) {
      setError(err?.message || 'Submission failed');
      setState('ready');
    }
  };

  if (state === 'loading') {
    return <div className="max-w-xl mx-auto px-4 py-20 text-center text-gray-400">Verifying link…</div>;
  }

  if (state === 'invalid') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h1 className="text-2xl font-black mb-2">Link Not Available</h1>
        <p className="text-gray-500">{error}</p>
        <p className="text-xs text-gray-400 mt-4">Return links are valid for a short time and shared only by our support team.</p>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <CheckCircle size={56} className="mx-auto text-green-500 mb-4" />
        <h1 className="text-2xl font-black mb-2">Return Request Submitted</h1>
        <p className="text-gray-500">Our team will review and reach out within 24-48 hours.</p>
      </div>
    );
  }

  const expiresAt = new Date(info.expiresAt);
  const minsLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 60000));

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black mb-2">Return Request</h1>
      <p className="text-sm text-gray-500 mb-1">Order <span className="font-bold">{info.orderNumber}</span> · {formatPrice(Number(info.amount || 0))}</p>
      <p className="text-xs text-amber-600 flex items-center gap-1 mb-6"><Clock size={12} /> Link expires in ~{minsLeft} min</p>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl p-6 border border-gray-100">
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Reason for return *</label>
          <select value={reason} onChange={e => setReason(e.target.value)} required
            className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
            <option value="">Select a reason…</option>
            <option value="damaged">Product damaged / leaking</option>
            <option value="wrong_item">Wrong item received</option>
            <option value="quality">Quality issue</option>
            <option value="expired">Near expiry / expired</option>
            <option value="not_as_described">Not as described</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Tell us more</label>
          <textarea value={details} onChange={e => setDetails(e.target.value)} rows={4} maxLength={2000}
            placeholder="Describe the issue. Batch number / manufacturing date if visible helps."
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Photos (up to 6)</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border">
                <img src={p} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5"><X size={12} /></button>
              </div>
            ))}
            {photos.length < 6 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-xs text-gray-400 cursor-pointer hover:border-orange-400 hover:text-orange-500">
                {isUploading ? `${progress}%` : <><Upload size={18} /><span className="mt-1">Add</span></>}
                <input type="file" accept="image/*" className="hidden"
                  onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadFile(f); e.currentTarget.value = ''; }} />
              </label>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 block mb-2">Refund mode</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'wallet', label: '💰 NutroPay credit', desc: 'Instant after approval' },
              { id: 'source', label: '🏦 Original payment', desc: 'Takes 5-7 days' },
            ].map(m => (
              <button key={m.id} type="button" onClick={() => setRefundMode(m.id as any)}
                className={`p-3 rounded-xl border-2 text-left transition ${refundMode === m.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="font-bold text-sm">{m.label}</div>
                <div className="text-xs text-gray-500">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={state === 'submitting' || !reason}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-full font-bold transition disabled:opacity-50">
          {state === 'submitting' ? 'Submitting…' : 'Submit Return Request'}
        </button>
      </form>
    </div>
  );
}

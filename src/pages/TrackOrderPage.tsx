// @ts-nocheck
import { useEffect, useState } from 'react';
import { useSearch } from 'wouter';
import { formatPrice } from '@/lib/utils';
import API from '@/lib/api';
import { Package, Truck, CheckCircle, Clock, FileText, ExternalLink, MapPin } from 'lucide-react';

const statusSteps = ['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
const statusIcons: Record<string, React.ReactNode> = {
  placed: <Clock size={18} />,
  confirmed: <CheckCircle size={18} />,
  processing: <Package size={18} />,
  shipped: <Truck size={18} />,
  out_for_delivery: <Truck size={18} />,
  delivered: <CheckCircle size={18} />,
};

export default function TrackOrderPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [orderNumber, setOrderNumber] = useState(params.get('order') || '');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doTrack = async (num: string) => {
    if (!num) return;
    setLoading(true); setError('');
    try {
      const orderRes = await API.get(`/orders/track/${num}`);
      setOrder(orderRes.data);
    } catch { setError('Order not found. Please check your order number.'); }
    setLoading(false);
  };

  const handleTrack = (e: React.FormEvent) => { e.preventDefault(); doTrack(orderNumber); };

  // Auto-track if ?order= present
  useEffect(() => {
    const initial = params.get('order');
    if (initial) doTrack(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Normalize index: map order status to step
  const statusIndex = (s: string) => {
    const i = statusSteps.indexOf((s || '').toLowerCase());
    return i >= 0 ? i : ((s || '').toLowerCase() === 'pending' ? 0 : -1);
  };
  const currentStep = order ? statusIndex(order.orderStatus) : -1;
  const trk = order?.tracking;
  const history: any[] = Array.isArray(trk?.statusHistory) ? trk.statusHistory : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-black text-center mb-2">TRACK YOUR ORDER</h1>
      <p className="text-gray-500 text-center mb-8">Enter your order number to track your delivery</p>

      <form onSubmit={handleTrack} className="flex gap-3 mb-8">
        <input value={orderNumber} onChange={e => setOrderNumber(e.target.value)}
          placeholder="Enter Order Number (e.g. NP1234567890)"
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition" required />
        <button type="submit" disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50">
          {loading ? '...' : 'Track'}
        </button>
      </form>

      {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-6 text-center">{error}</div>}

      {order && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
              <div>
                <h2 className="font-black text-lg">{order.orderNumber}</h2>
                <p className="text-gray-500 text-sm">{order.items?.length} items • {formatPrice(order.total)}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.orderStatus === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {(order.orderStatus || 'pending').replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="relative">
              <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {statusSteps.map((step, i) => {
                  const done = i <= currentStep;
                  const current = i === currentStep;
                  return (
                    <div key={step} className="flex items-center gap-4 relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 flex-shrink-0 ${done ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'} ${current ? 'ring-4 ring-orange-100' : ''}`}>
                        {statusIcons[step]}
                      </div>
                      <span className={`font-semibold capitalize ${done ? 'text-gray-900' : 'text-gray-400'}`}>{step.replace('_', ' ')}</span>
                      {current && <span className="text-xs text-orange-500 font-bold ml-auto">Current</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Courier / AWB */}
          {(trk?.courier || trk?.awbNumber || trk?.trackingUrl) && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold mb-3 flex items-center gap-2"><Truck size={18} /> Shipment</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {trk.courier && <div><div className="text-xs text-gray-500">Courier</div><div className="font-bold">{trk.courier}</div></div>}
                {trk.awbNumber && <div><div className="text-xs text-gray-500">AWB / Tracking #</div><div className="font-mono font-bold">{trk.awbNumber}</div></div>}
                {trk.estimatedDelivery && <div><div className="text-xs text-gray-500">Estimated delivery</div><div className="font-bold">{new Date(trk.estimatedDelivery).toLocaleDateString()}</div></div>}
                {trk.lastSyncedAt && <div><div className="text-xs text-gray-500">Last update</div><div className="font-bold">{new Date(trk.lastSyncedAt).toLocaleString()}</div></div>}
              </div>
              {trk.trackingUrl && (
                <a href={trk.trackingUrl} target="_blank" rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold">
                  Track on courier site <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}

          {/* Status history */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold mb-3 flex items-center gap-2"><MapPin size={18} /> Tracking history</h3>
              <ol className="space-y-3">
                {[...history].reverse().map((h, idx) => (
                  <li key={idx} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-bold capitalize">{(h.status || '').replace(/_/g, ' ')}</div>
                      {h.note && <div className="text-xs text-gray-600">{h.note}</div>}
                      <div className="text-[11px] text-gray-400 mt-0.5">{h.at ? new Date(h.at).toLocaleString() : ''}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Invoice */}
          <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-bold flex items-center gap-2"><FileText size={18} /> Invoice</h3>
              <p className="text-xs text-gray-500 mt-1">Download or view your order invoice.</p>
            </div>
            <a href={`/invoice/${order.orderNumber}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-bold">
              <FileText size={14} /> View invoice
            </a>
          </div>

          {order.shippingAddress && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold mb-3">Delivery Address</h3>
              <p className="text-gray-600 text-sm">
                {order.shippingAddress.name}<br />
                {order.shippingAddress.street}, {order.shippingAddress.city}<br />
                {order.shippingAddress.state} - {order.shippingAddress.pincode}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

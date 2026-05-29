// @ts-nocheck
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLocation } from 'wouter';
import { formatPrice } from '@/lib/utils';
import API from '@/lib/api';
import { useSettings } from '@/lib/useSettings';
import { Package, LogOut, Wallet, Gift, Copy, Check, History, FileText, Truck, ExternalLink, XCircle, MapPin, Share2, Users } from 'lucide-react';
import PushToggle from '@/components/PushToggle';
import LanguagePicker from '@/components/LanguagePicker';

type Section = 'orders' | 'wallet' | 'coupons' | 'referrals';

export default function AccountPage() {
  const { user, logout } = useAuthStore();
  const [, navigate] = useLocation();
  const { settings } = useSettings();
  const cancellationUrl = settings?.cancellationChatbotUrl || '/support?order={order}';
  const initialSection: Section = (typeof window !== 'undefined' && ['wallet','coupons','orders','referrals'].includes(window.location.hash.replace('#',''))) ? (window.location.hash.replace('#','') as Section) : 'orders';
  const [section, setSection] = useState<Section>(initialSection);

  const [orders, setOrders] = useState<any[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; transactions: any[] }>({ balance: 0, transactions: [] });
  const [coupons, setCoupons] = useState<any[]>([]);
  const [referral, setReferral] = useState<{ code: string; referrals: any[]; signupBonus: number; firstOrderBonus: number; totalEarned: number }>({ code: '', referrals: [], signupBonus: 0, firstOrderBonus: 0, totalEarned: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate(`/login?redirect=${encodeURIComponent('/account' + (window.location.hash || ''))}`); return; }
    Promise.all([
      API.get('/account/orders').then(r => setOrders(r.data)).catch(() => API.get('/orders/my').then(r => setOrders(r.data))),
      API.get('/wallet/me').then(r => setWallet(r.data)),
      API.get('/coupons/my').then(r => setCoupons(r.data)),
      API.get('/referral/me').then(r => setReferral(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [user]);

  const handleLogout = () => { logout(); navigate('/'); };
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!user) return null;

  const activeCoupons = coupons.filter(c => !c.used && (!c.expiresAt || new Date(c.expiresAt) > new Date()));

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-xl">
            {user.name[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black">{user.name}</h1>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium transition">
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* Language preference */}
      <div className="bg-white border rounded-2xl p-4 mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-black">Language / भाषा</div>
          <div className="text-xs text-gray-500">Site, emails, WhatsApp & support will use this language.</div>
        </div>
        <div className="min-w-[200px]"><LanguagePicker variant="inline" /></div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <button onClick={() => setSection('orders')}
          className={`text-left p-4 rounded-2xl border-2 transition ${section === 'orders' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><Package size={14} /> ORDERS</div>
          <div className="text-2xl font-black mt-1">{orders.length}</div>
        </button>
        <button onClick={() => setSection('wallet')}
          className={`text-left p-4 rounded-2xl border-2 transition ${section === 'wallet' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><Wallet size={14} /> NUTROPAY</div>
          <div className="text-2xl font-black mt-1 text-orange-600">{formatPrice(wallet.balance)}</div>
        </button>
        <button onClick={() => setSection('coupons')}
          className={`text-left p-4 rounded-2xl border-2 transition ${section === 'coupons' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><Gift size={14} /> COUPONS</div>
          <div className="text-2xl font-black mt-1">{activeCoupons.length} <span className="text-sm text-gray-400 font-bold">active</span></div>
        </button>
        <button onClick={() => setSection('referrals')}
          className={`text-left p-4 rounded-2xl border-2 transition ${section === 'referrals' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><Share2 size={14} /> REFER</div>
          <div className="text-2xl font-black mt-1">{referral.referrals.length} <span className="text-sm text-gray-400 font-bold">friends</span></div>
        </button>
      </div>

      <PushToggle />


      <button onClick={() => navigate('/account/addresses')}
        className="w-full mb-8 flex items-center justify-between gap-3 p-4 rounded-2xl border-2 border-gray-200 bg-white hover:border-orange-400 transition text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center"><MapPin size={18} /></div>
          <div>
            <p className="font-bold text-sm">Saved addresses</p>
            <p className="text-xs text-gray-500">Manage your delivery addresses</p>
          </div>
        </div>
        <span className="text-gray-400 text-sm">→</span>
      </button>

      {loading && <div className="text-gray-400 text-sm">Loading...</div>}

      {/* Orders */}
      {section === 'orders' && !loading && (
        <>
          <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Package size={20} /> MY ORDERS</h2>
          {orders.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <Package size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="font-bold text-gray-600">No orders yet</p>
              <p className="text-gray-400 text-sm mt-1">Start shopping to see your orders here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => {
                const trk = order.tracking;
                const inv = order.invoice;
                const status = (order.orderStatus || '').toLowerCase();
                const isDelivered = status === 'delivered';
                return (
                  <div key={order._id || order.id} className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <div>
                        <p className="font-black">{order.orderNumber}</p>
                        <p className="text-gray-500 text-sm mt-1">{order.items?.length} items • {formatPrice(order.total)}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${isDelivered ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {(order.orderStatus || 'pending').toUpperCase()}
                      </span>
                    </div>
                    {(trk?.courier || trk?.awbNumber || trk?.trackingUrl) && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-blue-900">
                          <Truck size={14} />
                          <span className="font-bold">{trk.courier || 'Courier'}</span>
                          {trk.awbNumber && <span className="font-mono">· AWB {trk.awbNumber}</span>}
                          {trk.currentStatus && <span className="px-2 py-0.5 rounded-full bg-white border text-[10px] font-bold uppercase">{trk.currentStatus.replace('_', ' ')}</span>}
                        </div>
                        {trk.trackingUrl && (
                          <a href={trk.trackingUrl} target="_blank" rel="noreferrer" className="text-blue-700 font-bold inline-flex items-center gap-1 hover:underline">
                            Track <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => navigate(`/track-order?order=${order.orderNumber}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold transition">
                        <Truck size={12} /> Track order
                      </button>
                      <button onClick={() => window.open(`/invoice/${order.orderNumber}`, '_blank')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-gray-200 hover:border-gray-400 text-xs font-bold transition">
                        <FileText size={12} /> {inv?.invoiceNumber ? `Invoice ${inv.invoiceNumber}` : 'Get invoice'}
                      </button>
                      {!isDelivered && status !== 'cancelled' && cancellationUrl && (() => {
                        const url = cancellationUrl.includes('{order}') ? cancellationUrl.replace('{order}', order.orderNumber) : cancellationUrl;
                        const isInternal = url.startsWith('/');
                        return (
                          <a href={url}
                            {...(isInternal ? {} : { target: '_blank', rel: 'noreferrer' })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition">
                            <XCircle size={12} /> Need to cancel?
                          </a>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Wallet */}
      {section === 'wallet' && !loading && (
        <>
          <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl p-6 text-white mb-6">
            <div className="flex items-center gap-2 text-sm font-bold opacity-90"><Wallet size={16} /> NUTROPAY</div>
            <div className="text-4xl font-black mt-2">{formatPrice(wallet.balance)}</div>
            <p className="text-sm opacity-90 mt-2">Use at checkout — % of order applied automatically</p>
          </div>

          <h3 className="text-lg font-black mb-3 flex items-center gap-2"><History size={18} /> Transactions</h3>
          {wallet.transactions.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl text-gray-500 text-sm">
              No transactions yet. Earn NutroPay credit on eligible orders!
            </div>
          ) : (
            <div className="bg-white rounded-2xl border divide-y">
              {wallet.transactions.map((t: any) => (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm">{t.note || (t.type === 'credit' ? 'NutroPay credit' : 'NutroPay used')}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(t.createdAt).toLocaleDateString()}
                      {t.orderId && <> · Order {t.orderId}</>}
                      {t.expiresAt && <> · Expires {new Date(t.expiresAt).toLocaleDateString()}</>}
                    </div>
                  </div>
                  <div className={`font-black ${Number(t.amount) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {Number(t.amount) >= 0 ? '+' : ''}{formatPrice(Number(t.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Coupons */}
      {section === 'coupons' && !loading && (
        <>
          <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Gift size={20} /> MY COUPONS</h2>
          {coupons.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <Gift size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="font-bold text-gray-600">No coupons yet</p>
              <p className="text-gray-400 text-sm mt-1">Complete eligible orders to earn reward coupons</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {coupons.map((c: any) => {
                const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                const inactive = c.used || expired;
                return (
                  <div key={c.id}
                    className={`relative p-5 rounded-2xl border-2 border-dashed ${inactive ? 'bg-gray-50 border-gray-300 opacity-60' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase text-green-700">
                        {c.discountType === 'percent' ? `${c.value}% OFF` : `${formatPrice(Number(c.value))} OFF`}
                      </span>
                      {c.used ? <span className="text-xs font-bold text-gray-500">USED</span>
                        : expired ? <span className="text-xs font-bold text-red-500">EXPIRED</span>
                        : <span className="text-xs font-bold text-green-600">ACTIVE</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-black text-lg">{c.code}</code>
                      {!inactive && (
                        <button onClick={() => copyCode(c.code)} className="text-gray-400 hover:text-gray-700">
                          {copied === c.code ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {Number(c.minOrder) > 0 && <>Min order {formatPrice(Number(c.minOrder))} · </>}
                      {c.expiresAt ? `Expires ${new Date(c.expiresAt).toLocaleDateString()}` : 'No expiry'}
                    </div>
                    {c.sourceOrderId && <div className="text-[10px] text-gray-400 mt-1">From order {c.sourceOrderId}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Referrals */}
      {section === 'referrals' && !loading && (
        <>
          <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Share2 size={20} /> REFER & EARN</h2>
          {(() => {
            const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/login?ref=${referral.code}`;
            const shareMsg = `Try Nutropact! Sign up with my code ${referral.code} and we both earn NutroPay credit: ${shareUrl}`;
            return (
              <>
                <div className="bg-gradient-to-br from-purple-600 to-pink-500 rounded-3xl p-6 text-white mb-6">
                  <div className="text-xs font-bold opacity-90">YOUR REFERRAL CODE</div>
                  <div className="flex items-center gap-3 mt-2">
                    <code className="font-mono font-black text-3xl tracking-widest">{referral.code || '—'}</code>
                    {referral.code && (
                      <button onClick={() => copyCode(referral.code)} className="bg-white/20 hover:bg-white/30 rounded-full p-2">
                        {copied === referral.code ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    )}
                  </div>
                  <p className="text-sm opacity-90 mt-3">
                    Friend gets bonus on signup. You earn <span className="font-black">{formatPrice(referral.signupBonus)}</span> when they sign up
                    {referral.firstOrderBonus > 0 && <> + <span className="font-black">{formatPrice(referral.firstOrderBonus)}</span> on their first order</>}.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <a href={`https://wa.me/?text=${encodeURIComponent(shareMsg)}`} target="_blank" rel="noreferrer"
                       className="bg-white text-purple-700 px-4 py-2 rounded-full font-bold text-sm">Share on WhatsApp</a>
                    <button onClick={() => { navigator.clipboard.writeText(shareUrl); copyCode(shareUrl); }}
                       className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full font-bold text-sm">
                      {copied === shareUrl ? 'Link copied!' : 'Copy link'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                    <div className="text-xs font-bold text-gray-500">FRIENDS REFERRED</div>
                    <div className="text-2xl font-black mt-1">{referral.referrals.length}</div>
                  </div>
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-4">
                    <div className="text-xs font-bold text-gray-500">TOTAL EARNED</div>
                    <div className="text-2xl font-black mt-1 text-green-600">{formatPrice(referral.totalEarned)}</div>
                  </div>
                </div>

                <h3 className="text-lg font-black mb-3 flex items-center gap-2"><Users size={18} /> Activity</h3>
                {referral.referrals.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-2xl text-gray-500 text-sm">
                    No referrals yet. Share your code to start earning!
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border divide-y">
                    {referral.referrals.map((r: any) => (
                      <div key={r.id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm">
                            {r.eventType === 'signup' ? 'Friend signed up' : 'Friend completed first order'}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(r.createdAt).toLocaleDateString()}
                            {r.orderId && <> · Order {r.orderId}</>}
                          </div>
                        </div>
                        <div className="font-black text-green-600">+{formatPrice(Number(r.amount))}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}

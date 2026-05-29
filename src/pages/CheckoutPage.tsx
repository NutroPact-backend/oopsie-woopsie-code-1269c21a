// @ts-nocheck
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';
import { useLocation } from 'wouter';
import { Shield, Truck, Tag, CheckCircle, X } from 'lucide-react';
import { useSEO } from '@/lib/useSEO';
import { trackBeginCheckout, trackPurchase } from '@/lib/analytics';
import { CheckoutTrustBar } from '@/components/TrustBadges';
import API from '@/lib/api';
import SavedAddresses, { AddressRecord } from '@/components/SavedAddresses';
import { trackAbandonedCart, clearAbandonedCart } from '@/lib/abandonedCart';
import { useServerFn } from '@tanstack/react-start';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/lib/razorpay.functions';
import { initiatePhonePe } from '@/lib/phonepe.functions';
import { getMyWholesale } from '@/lib/wholesale.functions';

declare global { interface Window { Razorpay?: any } }

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [codInfo, setCodInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: '', street: '', city: '', state: '', pincode: '' });
  const [pincodeCheck, setPincodeCheck] = useState<{ status: 'idle' | 'checking' | 'ok' | 'fail'; message?: string; cod?: boolean } >({ status: 'idle' });
  const [showAddressBook, setShowAddressBook] = useState(!!user);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const applySavedAddress = (a: AddressRecord) => {
    setSelectedAddressId(a.id);
    setForm({
      name: a.full_name,
      phone: a.phone,
      street: [a.address_line1, a.address_line2, a.landmark && `Near ${a.landmark}`].filter(Boolean).join(', '),
      city: a.city,
      state: a.state,
      pincode: a.pincode,
    });
  };

  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // ----- Wallet -----
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletPercent, setWalletPercent] = useState(100);

  // ----- Priority (Fast) Delivery -----
  const [priorityShip, setPriorityShip] = useState(false);

  // ----- Wholesale / B2B -----
  const [wholesale, setWholesale] = useState<{ isWholesale: boolean; discountPercent: number; minOrder: number }>({ isWholesale: false, discountPercent: 0, minOrder: 0 });

  const priorityCfg = paymentSettings?.priorityShipping || {};
  const priorityFee = priorityShip && priorityCfg.enabled ? Math.max(0, Number(priorityCfg.amount) || 0) : 0;

  const shipping = (total() >= 999 ? 0 : 99) + priorityFee;
  const wholesaleEligible = wholesale.isWholesale && total() >= wholesale.minOrder;
  const wholesaleDiscount = wholesaleEligible ? Math.round((total() * wholesale.discountPercent) / 100) : 0;
  const discount = couponApplied?.discount || 0;
  const subTotal = total() + shipping - discount - wholesaleDiscount;

  // Payment-method offers (only INSTANT rewards modify grand total)
  const methodOffers: any[] = paymentSettings?.methodOffers || [];
  const offerForMethod = (method: string) => {
    const filtered = methodOffers.filter((o: any) => {
      if (!o?.active) return false;
      if (o.method !== method && o.method !== 'any_online') return false;
      if (o.method === 'any_online' && (method === 'cod' || method === 'partial_cod')) return false;
      if (subTotal < (Number(o.minOrder) || 0)) return false;
      return true;
    });
    return filtered[0] || null;
  };
  const computeAdjust = (o: any) => {
    if (!o) return 0;
    if ((o.rewardType || 'instant') !== 'instant') return 0;
    const raw = o.type === 'percent' ? (subTotal * (Number(o.value) || 0)) / 100 : (Number(o.value) || 0);
    const capped = o.kind === 'discount' && o.type === 'percent' && o.maxDiscount ? Math.min(raw, Number(o.maxDiscount)) : raw;
    return o.kind === 'discount' ? -capped : capped;
  };
  const activeOffer = offerForMethod(selectedPayment);
  const methodAdjust = computeAdjust(activeOffer);
  const baseTotal = subTotal + methodAdjust;

  // Wallet usage — % of subTotal, capped by balance
  const walletWanted = useWallet ? Math.round((baseTotal * Math.min(100, Math.max(0, walletPercent))) / 100) : 0;
  const walletUsed = Math.min(walletWanted, walletBalance, Math.max(0, baseTotal));
  const grandTotal = Math.max(0, baseTotal - walletUsed);



  useSEO({ title: 'Checkout', description: 'Secure checkout — NutroPact' });

  useEffect(() => {
    setMounted(true);
    API.get('/payment-settings').then(r => {
      setPaymentSettings(r.data);
      if (r.data.codEnabled) setSelectedPayment('cod');
      else if (r.data.razorpayEnabled) setSelectedPayment('razorpay');
      else if (r.data.upiEnabled) setSelectedPayment('upi');
    }).catch(() => { setPaymentSettings({ codEnabled: true }); setSelectedPayment('cod'); });
    if (user) API.get('/wallet/me').then(r => setWalletBalance(Number(r.data?.balance || 0))).catch(() => {});
  }, [user]);


  useEffect(() => {
    if (mounted && items.length > 0) {
      trackBeginCheckout(grandTotal, items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })));
    }
  }, [mounted]);

  // Abandoned-cart tracking — debounced snapshot (only when we have a recovery channel)
  useEffect(() => {
    if (!mounted || items.length === 0) return;
    const t = setTimeout(() => {
      trackAbandonedCart({
        user_id: user?.id ?? null,
        customer_email: user?.email || '',
        customer_phone: form.phone || '',
        customer_name: form.name || user?.name || '',
        items,
        subtotal: total(),
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [mounted, items, form.phone, form.name, user?.id]);

  useEffect(() => {
    if (mounted && items.length === 0) navigate('/cart');
  }, [mounted, items.length]);

  useEffect(() => {
    if (selectedPayment === 'cod' && paymentSettings?.codEnabled) {
      API.post('/payments/cod/calculate', { orderTotal: grandTotal }).then(r => setCodInfo(r.data)).catch(() => {});
    }
  }, [selectedPayment, grandTotal]);

  // Pincode serviceability (debounced)
  useEffect(() => {
    const pin = form.pincode.trim();
    if (!/^\d{6}$/.test(pin)) { setPincodeCheck({ status: 'idle' }); return; }
    setPincodeCheck({ status: 'checking' });
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/public/pincode-check?pincode=${pin}`, { signal: ctrl.signal })
        .then(r => r.json())
        .then((j: any) => {
          if (j?.serviceable) setPincodeCheck({ status: 'ok', message: j.message || 'Deliverable', cod: !!j.cod });
          else setPincodeCheck({ status: 'fail', message: j?.message || 'Not serviceable' });
        })
        .catch(() => setPincodeCheck({ status: 'idle' }));
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [form.pincode]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const { data } = await API.post('/marketing/coupon/validate', { code: couponCode, orderTotal: total() });
      setCouponApplied(data);
    } catch (err: any) {
      setCouponError(err.response?.data?.message || 'Invalid coupon');
      setCouponApplied(null);
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => { setCouponApplied(null); setCouponCode(''); setCouponError(''); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const rzpCreate = useServerFn(createRazorpayOrder);
  const rzpVerify = useServerFn(verifyRazorpayPayment);
  const ppInit = useServerFn(initiatePhonePe);
  const wholesaleFn = useServerFn(getMyWholesale);

  useEffect(() => {
    if (!user) { setWholesale({ isWholesale: false, discountPercent: 0, minOrder: 0 }); return; }
    wholesaleFn().then((r: any) => setWholesale(r)).catch(() => {});
  }, [user, wholesaleFn]);

  const placeOrder = async (paymentData: any): Promise<{ orderNumber: string }> => {
    const offerSnap = activeOffer ? {
      id: activeOffer.id, label: activeOffer.label, method: activeOffer.method,
      kind: activeOffer.kind, amount: methodAdjust,
      rewardType: activeOffer.rewardType || 'instant',
      reward: activeOffer.reward || null,
    } : null;
    const { data: order } = await API.post('/orders', {
      items: items.map(i => ({ product: i.id, name: i.name, image: i.image, flavor: i.flavor, size: i.size, price: i.price, quantity: i.quantity })),
      shippingAddress: form,
      paymentMethod: selectedPayment,
      couponCode: couponApplied?.code,
      userCouponId: couponApplied?.source === 'user_coupon' ? couponApplied?.id : undefined,
      couponDiscount: discount,
      subtotal: total(),
      shipping,
      discount,
      wholesaleDiscount,
      wholesalePercent: wholesaleEligible ? wholesale.discountPercent : 0,
      paymentMethodOffer: offerSnap,
      walletUsed,
      total: baseTotal,
      priorityShipping: priorityShip && !!priorityCfg.enabled,
      priorityShippingFee: priorityFee,
      ...paymentData
    });
    return order;
  };

  const finalizeAndRedirect = (orderNumber: string) => {
    trackPurchase(orderNumber, grandTotal, items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: i.category, pixels: i.pixels })));
    clearAbandonedCart();
    clearCart();
    navigate(`/track-order?order=${orderNumber}`);
  };

  const handleRazorpay = async () => {
    const ok = await loadRazorpayScript();
    if (!ok) { alert('Payment SDK failed to load. Check your connection.'); return; }
    const order = await placeOrder({ paymentStatus: 'pending' });
    const rzp = await rzpCreate({ data: { orderNumber: order.orderNumber, amount: grandTotal, currency: 'INR' } });
    await new Promise<void>((resolve, reject) => {
      const options = {
        key: rzp.keyId,
        amount: rzp.amount,
        currency: rzp.currency,
        order_id: rzp.rzpOrderId,
        name: paymentSettings?.merchantName || 'NutroPact',
        description: `Order ${order.orderNumber}`,
        prefill: { name: form.name, contact: form.phone, email: user?.email || '' },
        notes: { order_number: order.orderNumber },
        theme: { color: '#f97316' },
        handler: async (resp: any) => {
          try {
            await rzpVerify({ data: {
              orderNumber: order.orderNumber,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            }});
            finalizeAndRedirect(order.orderNumber);
            resolve();
          } catch (e) { reject(e); }
        },
        modal: { ondismiss: () => reject(new Error('cancelled')) },
      };
      const r = new window.Razorpay(options);
      r.on('payment.failed', () => reject(new Error('payment_failed')));
      r.open();
    });
  };

  const handlePhonePe = async () => {
    const order = await placeOrder({ paymentStatus: 'pending' });
    const r = await ppInit({ data: {
      orderNumber: order.orderNumber,
      amount: grandTotal,
      callbackOrigin: window.location.origin,
    }});
    clearAbandonedCart();
    clearCart();
    window.location.href = r.redirectUrl;
  };

  const handleCOD = async () => {
    const order = await placeOrder({ paymentStatus: 'pending' });
    finalizeAndRedirect(order.orderNumber);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate(`/login?redirect=${encodeURIComponent('/checkout')}`);
    const allFilled = Object.values(form).every(v => v.trim());
    if (!allFilled) return alert('Please fill all address fields');
    setLoading(true);
    try {
      if (selectedPayment === 'razorpay') await handleRazorpay();
      else if (selectedPayment === 'phonepe') await handlePhonePe();
      else if (selectedPayment === 'cod') await handleCOD();
      else {
        const order = await placeOrder({ paymentStatus: 'pending' });
        finalizeAndRedirect(order.orderNumber);
      }
    } catch (err: any) {
      if (err?.message !== 'cancelled') alert(err?.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const paymentMethods = [
    { id: 'cod', enabled: paymentSettings?.codEnabled ?? true, label: paymentSettings?.codLabel || 'Cash on Delivery', icon: '💵', desc: 'Pay on delivery' },
    { id: 'razorpay', enabled: paymentSettings?.razorpayEnabled, label: 'Razorpay', icon: '💳', desc: 'UPI, Cards, NetBanking' },
    { id: 'phonepe', enabled: paymentSettings?.phonepeEnabled, label: 'PhonePe', icon: '🟣', desc: 'UPI / Wallet / Cards' },
    { id: 'upi', enabled: paymentSettings?.upiEnabled, label: 'UPI Direct', icon: '🔗', desc: `Pay to ${paymentSettings?.upiId}` },
  ].filter(m => m.enabled);

  if (!mounted || items.length === 0) return null;

  return (
    <div>
      <CheckoutTrustBar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black mb-8">CHECKOUT</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <h2 className="text-lg font-bold flex items-center gap-2"><Truck size={18} className="text-orange-500" /> Delivery Address</h2>
                {user && (
                  <button type="button" onClick={() => setShowAddressBook(v => !v)}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 underline-offset-2 hover:underline">
                    {showAddressBook ? 'Hide saved' : 'Use saved address'}
                  </button>
                )}
              </div>
              {user && showAddressBook && (
                <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <SavedAddresses mode="pick" selectedId={selectedAddressId} onSelect={applySavedAddress} compact />
                </div>
              )}
              <div className="space-y-3">
                {[{ name: 'name', placeholder: 'Full Name' }, { name: 'phone', placeholder: 'Phone Number' }, { name: 'street', placeholder: 'Street Address' }, { name: 'city', placeholder: 'City' }, { name: 'state', placeholder: 'State' }, { name: 'pincode', placeholder: 'Pincode' }].map(field => (
                  <div key={field.name}>
                    <input name={field.name} placeholder={field.placeholder} value={form[field.name as keyof typeof form]} onChange={handleChange}
                      inputMode={field.name === 'pincode' || field.name === 'phone' ? 'numeric' : undefined}
                      maxLength={field.name === 'pincode' ? 6 : undefined}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition text-sm" required />
                    {field.name === 'pincode' && pincodeCheck.status !== 'idle' && (
                      <p className={`text-xs mt-1 px-1 ${pincodeCheck.status === 'ok' ? 'text-green-600' : pincodeCheck.status === 'fail' ? 'text-red-500' : 'text-gray-400'}`}>
                        {pincodeCheck.status === 'checking' ? 'Checking serviceability…' : pincodeCheck.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Shield size={18} className="text-orange-500" /> Payment Method</h2>
              <div className="space-y-3">
                {paymentMethods.map(method => {
                  const off = offerForMethod(method.id);
                  const adj = computeAdjust(off);
                  return (
                    <button key={method.id} onClick={() => setSelectedPayment(method.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition text-left ${selectedPayment === method.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className="text-2xl">{method.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{method.label}</p>
                        <p className="text-xs text-gray-500">{method.desc}</p>
                        {off && (
                          <span className={`inline-block mt-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${adj < 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {adj < 0 ? '🎉 ' : '⚠️ '}{off.label}{adj !== 0 && ` (${adj < 0 ? '-' : '+'}${formatPrice(Math.abs(adj))})`}
                          </span>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPayment === method.id ? 'border-orange-500' : 'border-gray-300'}`}>
                        {selectedPayment === method.id && <div className="w-3 h-3 bg-orange-500 rounded-full"></div>}
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>

            {priorityCfg.enabled && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <button type="button" onClick={() => setPriorityShip(v => !v)}
                  className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl border-2 transition text-left ${priorityShip ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">⚡</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm">{priorityCfg.label || 'Fast delivery'} {Number(priorityCfg.amount) > 0 && <span className="text-orange-600">(+{formatPrice(Number(priorityCfg.amount))})</span>}</p>
                      <p className="text-xs text-gray-500">{priorityCfg.description || 'Priority pickup — your order is shipped within minutes instead of the standard 2-hour batch.'}</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full relative transition shrink-0 ${priorityShip ? 'bg-orange-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${priorityShip ? 'left-[18px]' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {item.image && <img src={item.image} alt="" className="w-8 h-8 rounded object-cover bg-gray-50"  loading="lazy" decoding="async"/>}
                      <span className="text-gray-600 line-clamp-1">{item.name} {item.flavor ? `(${item.flavor})` : ''} ×{item.quantity}</span>
                    </div>
                    <span className="font-semibold flex-shrink-0 ml-2">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mb-4">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Tag size={14} className="text-orange-500" /> Coupon Code</p>
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-500" />
                      <span className="font-bold text-green-700 text-sm">{couponApplied.code}</span>
                      <span className="text-green-600 text-sm">- {formatPrice(discount)} off</span>
                    </div>
                    <button onClick={removeCoupon} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="FIRST10 or SAVE50" onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500 transition text-sm uppercase font-bold" />
                    <button onClick={applyCoupon} disabled={couponLoading}
                      className="bg-gray-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition disabled:opacity-50">
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
              </div>

              {user && walletBalance > 0 && (
                <div className="border-t pt-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">💰 Use NutroPay</p>
                      <p className="text-xs text-gray-500">Balance: {formatPrice(walletBalance)}</p>
                    </div>
                    <button type="button" onClick={() => setUseWallet(v => !v)}
                      className={`w-10 h-6 rounded-full relative transition ${useWallet ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${useWallet ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {useWallet && (
                    <div className="mt-3">
                      <input type="range" min={0} max={100} step={5} value={walletPercent}
                        onChange={e => setWalletPercent(Number(e.target.value))} className="w-full accent-orange-500" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{walletPercent}% of order</span>
                        <span className="font-bold text-green-600">- {formatPrice(walletUsed)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t pt-3 space-y-2 text-sm">
                {wholesale.isWholesale && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-xs">
                    <p className="font-bold text-sky-800">🏢 Wholesale account · {wholesale.discountPercent}% off</p>
                    {!wholesaleEligible && wholesale.minOrder > 0 && (
                      <p className="text-sky-700 mt-0.5">Add {formatPrice(wholesale.minOrder - total())} more to unlock wholesale pricing</p>
                    )}
                  </div>
                )}
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatPrice(total())}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span className={shipping - priorityFee === 0 ? 'text-green-600 font-semibold' : ''}>{shipping - priorityFee === 0 ? 'FREE' : formatPrice(shipping - priorityFee)}</span></div>
                {priorityFee > 0 && <div className="flex justify-between text-orange-600"><span>⚡ Fast delivery</span><span>+ {formatPrice(priorityFee)}</span></div>}
                {wholesaleDiscount > 0 && <div className="flex justify-between text-sky-700"><span>Wholesale ({wholesale.discountPercent}%)</span><span>- {formatPrice(wholesaleDiscount)}</span></div>}
                {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>- {formatPrice(discount)}</span></div>}
                {activeOffer && methodAdjust !== 0 && (
                  <div className={`flex justify-between ${methodAdjust < 0 ? 'text-green-600' : 'text-amber-700'}`}>
                    <span className="line-clamp-1 pr-2">{activeOffer.label}</span>
                    <span>{methodAdjust < 0 ? '-' : '+'} {formatPrice(Math.abs(methodAdjust))}</span>
                  </div>
                )}
                {activeOffer && (activeOffer.rewardType === 'wallet' || activeOffer.rewardType === 'coupon') && (
                  <div className="flex justify-between text-purple-600 text-xs bg-purple-50 px-2 py-1.5 rounded-lg">
                    <span>🎁 {activeOffer.rewardType === 'wallet' ? 'NutroPay credit' : 'Coupon'} after delivery</span>
                    <span className="font-bold">{activeOffer.label}</span>
                  </div>
                )}
                {walletUsed > 0 && (
                  <div className="flex justify-between text-green-600"><span>NutroPay</span><span>- {formatPrice(walletUsed)}</span></div>
                )}
                <div className="flex justify-between text-lg font-black border-t pt-2"><span>Total</span><span>{formatPrice(grandTotal)}</span></div>

              </div>

              <form onSubmit={handleSubmit}>
                <button type="submit" disabled={loading || !selectedPayment}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-full font-bold text-lg mt-4 transition disabled:opacity-50">
                  {loading ? 'Processing...' : selectedPayment === 'cod' ? 'Place Order (COD)' : `Pay ${formatPrice(grandTotal)}`}
                </button>
              </form>
              <p className="text-xs text-gray-400 text-center mt-2 flex items-center justify-center gap-1">
                <Shield size={12} /> 100% Secure & Encrypted Payment
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

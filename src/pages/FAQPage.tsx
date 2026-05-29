import { useSettings } from '@/lib/useSettings';
import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, Search, HelpCircle, MessageCircle, Truck, RefreshCw, ShieldCheck, CreditCard, FlaskConical } from 'lucide-react';
import { Link } from 'wouter';
import API from '@/lib/api';
import { T } from '@/lib/useContentT';

const DEFAULT_FAQS = [
  {
    category: 'Orders & Shipping',
    icon: 'truck',
    items: [
      { q: 'How long does delivery take?', a: 'Standard delivery takes 5–7 business days across India. Express delivery (2–3 business days) is available at checkout for major cities. Orders placed before 2 PM are dispatched the same day.' },
      { q: 'Do you ship across India?', a: 'Yes — we ship to all 29 states and 7 union territories. Free shipping on orders above ₹999. For remote pin codes, delivery may take an additional 1–2 days.' },
      { q: 'How do I track my order?', a: 'After dispatch, you\'ll receive a tracking link via SMS and email. You can also use the Track Order page on our website — just enter your order number or registered phone number.' },
      { q: 'Can I change my delivery address after ordering?', a: 'You can update the address within 2 hours of placing the order by contacting our support team. Once shipped, address changes are not possible.' },
    ],
  },
  {
    category: 'Returns & Refunds',
    icon: 'refresh',
    items: [
      { q: 'What is your return policy?', a: 'We accept returns within 7 days of delivery for damaged, defective, or incorrect products. Products must be unopened and in original packaging. Contact support with your order number and photos of the issue.' },
      { q: 'How long does a refund take?', a: 'Refunds are processed within 3–5 business days after we receive and inspect the returned product. The amount is credited to your original payment method.' },
      { q: 'Can I return an opened product?', a: 'We generally do not accept returns for opened products unless there is a quality issue or the product received is different from what was ordered. Please contact us — we evaluate each case fairly.' },
      { q: 'What if I received a damaged product?', a: 'Take photos of the damaged product and packaging immediately and contact support within 48 hours. We\'ll arrange a replacement or full refund at no cost to you.' },
    ],
  },
  {
    category: 'Product Quality',
    icon: 'flask',
    items: [
      { q: 'Are your products lab tested?', a: 'Yes. Every product is tested by accredited third-party labs for protein content accuracy, heavy metals, microbial safety, and banned substance screening. Lab certificates are available on request.' },
      { q: 'Are your supplements FSSAI approved?', a: 'All our products comply with FSSAI (Food Safety and Standards Authority of India) regulations. We carry proper FSSAI registration numbers, which are displayed on every product label.' },
      { q: 'Are your products informed-sport certified?', a: 'Select products carry Informed-Sport certification. Check the individual product page for certification details. We are actively expanding our certified range.' },
      { q: 'Do products contain banned substances?', a: 'No. Our products are manufactured in facilities that follow strict protocols to prevent cross-contamination. We conduct WADA banned substance testing on all performance supplements.' },
    ],
  },
  {
    category: 'Payments',
    icon: 'card',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept UPI (PhonePe, Google Pay, Paytm), credit/debit cards (Visa, Mastercard, RuPay), net banking, EMI, and Cash on Delivery (COD) for orders up to ₹10,000.' },
      { q: 'Is it safe to pay online?', a: 'Absolutely. Our payment gateway uses 256-bit SSL encryption and is PCI-DSS compliant. We never store your card details on our servers.' },
      { q: 'Can I pay in EMI?', a: 'Yes — 0% EMI is available on select credit cards for orders above ₹2,500. EMI options appear at checkout based on your card and bank.' },
      { q: 'My payment failed but money was deducted. What now?', a: 'This happens when a transaction times out. The amount is automatically reversed to your account within 5–7 business days. If it isn\'t, contact us with your transaction ID and we\'ll resolve it immediately.' },
    ],
  },
  {
    category: 'Account & Orders',
    icon: 'shield',
    items: [
      { q: 'Do I need to create an account to order?', a: 'You can check out as a guest. However, creating a free account lets you track orders, view order history, save addresses, and access exclusive member offers.' },
      { q: 'I forgot my password. What do I do?', a: 'Click "Forgot Password" on the login page and enter your registered email. You\'ll receive a reset link within 2 minutes. Check your spam folder if you don\'t see it.' },
      { q: 'Can I cancel my order?', a: 'Orders can be cancelled within 1 hour of placement. After that, cancellation depends on the dispatch status. Once shipped, cancellation is not possible but you can initiate a return after delivery.' },
      { q: 'How do I apply a coupon code?', a: 'On the cart or checkout page, you\'ll see a "Apply Coupon" field. Enter your code and click Apply. Only one coupon can be used per order. Check the T&C for each coupon\'s validity.' },
    ],
  },
  {
    category: 'Supplements & Advice',
    icon: 'help',
    items: [
      { q: 'Which protein should I buy as a beginner?', a: 'For most beginners, Whey Concentrate is the best value — 24g protein per scoop at an accessible price. If you\'re lactose intolerant or focused on cutting, Whey Isolate is the better choice.' },
      { q: 'Can I take multiple supplements together?', a: 'Most supplements are safe to combine. Common safe stacks: Whey + Creatine, Pre-Workout + BCAA. Avoid stacking multiple stimulants. When in doubt, consult a nutritionist or doctor.' },
      { q: 'Are your supplements safe for women?', a: 'Yes — protein, creatine, multivitamins, and most supplements are equally effective and safe for women. Dosing may differ slightly; product pages include gender-specific guidance.' },
      { q: 'Do I need supplements if I eat a balanced diet?', a: 'Whole foods should always come first. Supplements fill specific gaps — protein powder when food intake is insufficient, creatine for enhanced performance, multivitamins for micronutrient insurance. They supplement, not replace, a good diet.' },
    ],
  },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  truck: <Truck size={18} />,
  refresh: <RefreshCw size={18} />,
  flask: <FlaskConical size={18} />,
  card: <CreditCard size={18} />,
  shield: <ShieldCheck size={18} />,
  help: <HelpCircle size={18} />,
};

export default function FAQPage() {
  const { settings } = useSettings();
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [apiFaqs, setApiFaqs] = useState<any[] | null>(null);

  useEffect(() => {
    API.get('/faq').then(r => setApiFaqs(r.data || [])).catch(() => setApiFaqs(null));
  }, []);

  const customFaqs: any[] = apiFaqs !== null
    ? apiFaqs.filter((f: any) => f.enabled !== false)
    : (settings?.faqPage?.filter((f: any) => f.enabled !== false) || []);

  const categories = useMemo(() => {
    if (customFaqs.length > 0) {
      const cats = Array.from(new Set(customFaqs.map((f: any) => f.category || 'General')));
      return ['All', ...cats];
    }
    return ['All', ...DEFAULT_FAQS.map(g => g.category)];
  }, [customFaqs]);

  const allItems = useMemo(() => {
    if (customFaqs.length > 0) {
      return customFaqs.map((f: any, i: number) => ({ id: `c${i}`, category: f.category || 'General', q: f.question, a: f.answer }));
    }
    return DEFAULT_FAQS.flatMap(g => g.items.map((item, i) => ({ id: `${g.category}-${i}`, category: g.category, icon: g.icon, q: item.q, a: item.a })));
  }, [customFaqs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allItems.filter(item => {
      const matchCat = activeCategory === 'All' || item.category === activeCategory;
      const matchSearch = !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allItems, search, activeCategory]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filtered]);

  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <HelpCircle size={28} className="text-orange-500" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-3"><T>How can we help?</T></h1>
        <p className="text-gray-500 text-lg max-w-lg mx-auto"><T>Quick answers to the questions we hear most often.</T></p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mx-auto mb-10">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveCategory('All'); }}
          placeholder="Search your question..."
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:border-orange-400 text-sm"
        />
        {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold hover:text-gray-600"><T>Clear</T></button>}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap justify-center mb-10">
        {categories.map(cat => (
          <button key={cat} onClick={() => { setActiveCategory(cat); setSearch(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600'}`}>
            {cat !== 'All' && ICON_MAP[DEFAULT_FAQS.find(g => g.category === cat)?.icon || ''] && (
              <span className="opacity-80">{ICON_MAP[DEFAULT_FAQS.find(g => g.category === cat)?.icon || '']}</span>
            )}
            <T>{cat}</T>
          </button>
        ))}
      </div>

      {/* Results count when searching */}
      {search && (
        <p className="text-center text-sm text-gray-400 mb-6">
          {filtered.length === 0 ? <T>No results found</T> : <T>{`${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${search}"`}</T>}
        </p>
      )}

      {/* FAQ groups */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <Search size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-bold text-lg"><T>No matching questions</T></p>
          <p className="text-gray-400 text-sm mt-1"><T>Try different keywords or browse all categories</T></p>
          <button onClick={() => { setSearch(''); setActiveCategory('All'); }} className="mt-4 px-4 py-2 bg-orange-100 text-orange-700 font-bold rounded-xl text-sm hover:bg-orange-200 transition"><T>Clear filters</T></button>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped).map(([category, items]) => {
            const groupDef = DEFAULT_FAQS.find(g => g.category === category);
            return (
              <div key={category}>
                {(activeCategory === 'All' || search) && (
                  <div className="flex items-center gap-3 mb-4">
                    {groupDef && ICON_MAP[groupDef.icon] && (
                      <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500">
                        {ICON_MAP[groupDef.icon]}
                      </div>
                    )}
                    <h2 className="text-lg font-black text-gray-800"><T>{category}</T></h2>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">{items.length}</span>
                  </div>
                )}
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className={`border rounded-2xl overflow-hidden transition-all ${open === item.id ? 'border-orange-300 shadow-sm' : 'border-gray-200'}`}>
                      <button
                        onClick={() => setOpen(open === item.id ? null : item.id)}
                        className="w-full flex justify-between items-center px-6 py-4 text-left hover:bg-gray-50 transition">
                        <span className={`font-semibold text-sm leading-relaxed pr-4 ${open === item.id ? 'text-orange-600' : 'text-gray-800'}`}><T>{item.q}</T></span>
                        <ChevronDown size={18} className={`flex-shrink-0 text-gray-400 transition-transform duration-300 ${open === item.id ? 'rotate-180 text-orange-500' : ''}`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-300 ${open === item.id ? 'max-h-96' : 'max-h-0'}`}>
                        <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-orange-100 pt-4 bg-orange-50/30">
                          <T>{item.a}</T>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA */}
      <div className="mt-16 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 text-center text-white">
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageCircle size={24} className="text-orange-400" />
        </div>
        <h3 className="text-2xl font-black mb-2"><T>Still have questions?</T></h3>
        <p className="text-gray-400 mb-6 max-w-sm mx-auto"><T>Our team typically responds within 2 hours on business days.</T></p>
        <Link href={`${base}/contact`}>
          <button className="bg-orange-500 text-white px-8 py-3.5 rounded-xl font-black hover:bg-orange-600 transition text-sm"><T>Contact Support</T></button>
        </Link>
      </div>
    </div>
  );
}

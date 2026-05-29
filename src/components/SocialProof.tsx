// @ts-nocheck
import { useEffect, useState, useRef } from 'react';
import { ShoppingBag, Star, Users, X } from 'lucide-react';
import API from '@/lib/api';

const FIRST_NAMES = [
  'Aarav','Aditya','Akash','Amit','Ananya','Anjali','Ankit','Arjun','Aryan','Ayesha',
  'Deepak','Deepika','Dhruv','Divya','Gaurav','Harsh','Ishaan','Kavya','Kiran','Kunal',
  'Manish','Meera','Mohit','Nandini','Neha','Nikhil','Nisha','Parth','Pooja',
  'Prachi','Pranav','Prashant','Prateek','Priya','Rahul','Raj','Rajan','Rajesh','Ravi',
  'Ritesh','Rohit','Sachin','Sahil','Sandeep','Sarika','Saurabh','Shivam','Shruti','Sneha',
  'Sonia','Suresh','Swati','Tanvi','Tarun','Uday','Varun','Vikas','Vikram','Vishal',
  'Yash','Zara','Abhishek','Aditi','Alok','Bhavna','Chetan','Esha','Fatima','Gaurika',
  'Hitesh','Isha','Jayesh','Karishma','Lalit','Mona','Neel','Palak','Rakesh','Simran',
];

const LAST_INITIALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const CITIES = [
  'Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad',
  'Jaipur','Surat','Lucknow','Kanpur','Nagpur','Indore','Thane','Bhopal','Vadodara',
  'Patna','Ludhiana','Agra','Nashik','Faridabad','Meerut','Rajkot','Varanasi',
  'Chandigarh','Solapur','Hubli','Bareilly','Moradabad','Mysuru','Gurgaon','Noida',
  'Coimbatore','Jodhpur','Madurai','Raipur','Kota','Guwahati','Amritsar','Ranchi',
];

const REVIEW_PHRASES = [
  'gave 5 stars',
  'left a 5-star review',
  'rated this 5/5',
  'loves this product',
];

const VIEWER_PHRASES = [
  'people are viewing this right now',
  'people checked this in the last hour',
  'customers viewing this product',
];

const QTY_LABELS = [
  '', '', '', '', 'bought 2 packs of', 'ordered a combo of',
];

const PURCHASE_INTERVAL_MS = 15 * 60 * 1000;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOrCreateVisitorId(): string {
  const key = 'sp_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function getVisitorKey(): string {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.id || payload.sub || payload.userId) {
        return `user_${payload.id || payload.sub || payload.userId}`;
      }
    } catch {}
  }
  return getOrCreateVisitorId();
}

function getLastShown(visitorKey: string): number {
  return parseInt(localStorage.getItem(`sp_last_${visitorKey}`) || '0', 10);
}

function setLastShown(visitorKey: string) {
  localStorage.setItem(`sp_last_${visitorKey}`, String(Date.now()));
}

function getUsedNames(visitorKey: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`sp_names_${visitorKey}`) || '[]');
  } catch {
    return [];
  }
}

function addUsedName(visitorKey: string, name: string) {
  const used = getUsedNames(visitorKey);
  used.push(name);
  if (used.length >= FIRST_NAMES.length) {
    localStorage.removeItem(`sp_names_${visitorKey}`);
  } else {
    localStorage.setItem(`sp_names_${visitorKey}`, JSON.stringify(used));
  }
}

function pickUnusedName(visitorKey: string, pool: string[], useCustom: boolean): string {
  const used = getUsedNames(visitorKey);
  const available = pool.filter(n => !used.includes(n));
  const source = available.length > 0 ? available : pool;
  return source[Math.floor(Math.random() * source.length)];
}

function makeQueue<T>(pool: T[]): { next: () => T } {
  let queue: T[] = [];
  return {
    next() {
      if (queue.length === 0) queue = shuffle(pool);
      return queue.pop()!;
    }
  };
}

function randomTime(): string {
  const r = Math.random();
  if (r < 0.07) return 'just now';
  if (r < 0.25) return '1 min ago';
  if (r < 0.55) return `${Math.floor(Math.random() * 12) + 2} min ago`;
  if (r < 0.80) return `${Math.floor(Math.random() * 4) + 1} hr ago`;
  return `${Math.floor(Math.random() * 3) + 1} hr ago`;
}

function randomViewerCount(): number {
  return Math.floor(Math.random() * 35) + 8;
}

type NotifType = 'purchase' | 'review' | 'viewers';

interface Notification {
  type: NotifType;
  name?: string;
  city?: string;
  product: string;
  image: string | null;
  time: string;
  stars?: number;
  qty?: string;
  viewers?: number;
  reviewPhrase?: string;
  viewerPhrase?: string;
}

export default function SocialProof() {
  const [products, setProducts] = useState<any[]>([]);
  const [current, setCurrent] = useState<Notification | null>(null);
  const [visible, setVisible] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const timerRef = useRef<any>(null);
  const checkRef = useRef<any>(null);

  useEffect(() => {
    API.get('/settings').then(r => setSettings(r.data)).catch(() => {});
    API.get('/products').then(r => setProducts(r.data)).catch(() => {});
  }, []);

  const hideDelay = settings?.socialProofHideDelay ?? 5000;
  const enabled = settings ? (settings.socialProofEnabled !== false) : true;
  const customIconUrl: string = settings?.socialProofIconUrl || '';
  const customNames: string[] = settings?.socialProofCustomNames || [];
  const customCities: string[] = settings?.socialProofCustomCities || [];
  const namePool = customNames.length >= 5 ? customNames : FIRST_NAMES;
  const cityPool = customCities.length >= 3 ? customCities : CITIES;
  const useCustomNames = customNames.length >= 5;

  useEffect(() => {
    if (!enabled || products.length === 0) return;

    const lastInitQ = makeQueue(LAST_INITIALS);
    const cityQ = makeQueue(cityPool);
    const prodQ = makeQueue(products);
    const reviewPhraseQ = makeQueue(REVIEW_PHRASES);
    const viewerPhraseQ = makeQueue(VIEWER_PHRASES);

    let fireCount = 0;

    const tryFire = () => {
      const visitorKey = getVisitorKey();
      const lastShown = getLastShown(visitorKey);
      const now = Date.now();
      const msSinceLast = now - lastShown;

      const product = prodQ.next();
      const productName = product?.name || 'Performance Whey Protein';
      const productImage = product?.images?.[0] || null;

      let roll = Math.random();
      let type: NotifType;
      if (fireCount % 5 === 3) {
        type = 'viewers';
      } else if (roll < 0.70) {
        type = 'purchase';
      } else {
        type = 'review';
      }
      fireCount++;

      if ((type === 'purchase' || type === 'review') && msSinceLast < PURCHASE_INTERVAL_MS) {
        return;
      }

      const firstName = pickUnusedName(visitorKey, namePool, useCustomNames);
      const lastName = useCustomNames ? '' : ` ${lastInitQ.next()}.`;
      const city = cityQ.next();

      if (type === 'viewers') {
        setCurrent({
          type: 'viewers',
          product: productName,
          image: productImage,
          time: '',
          viewers: randomViewerCount(),
          viewerPhrase: viewerPhraseQ.next(),
        });
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setVisible(false), hideDelay);
      } else if (type === 'review') {
        setCurrent({
          type: 'review',
          name: `${firstName}${lastName}`,
          city,
          product: productName,
          image: productImage,
          time: randomTime(),
          stars: 5,
          reviewPhrase: reviewPhraseQ.next(),
        });
        addUsedName(visitorKey, firstName);
        setLastShown(visitorKey);
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setVisible(false), hideDelay);
      } else {
        const qtyRoll = Math.floor(Math.random() * QTY_LABELS.length);
        const qty = QTY_LABELS[qtyRoll];
        setCurrent({
          type: 'purchase',
          name: `${firstName}${lastName}`,
          city,
          product: productName,
          image: productImage,
          time: randomTime(),
          qty,
        });
        addUsedName(visitorKey, firstName);
        setLastShown(visitorKey);
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setVisible(false), hideDelay);
      }
    };

    const first = setTimeout(tryFire, 8000);
    const repeat = setInterval(tryFire, 60000);
    checkRef.current = repeat;

    return () => {
      clearTimeout(first);
      clearInterval(repeat);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, products, namePool, cityPool, hideDelay, useCustomNames]);

  if (!enabled || !current) return null;

  const iconSrc = customIconUrl || current.image;

  const renderContent = () => {
    if (current.type === 'viewers') {
      return (
        <>
          <p className="text-sm font-bold text-gray-900">
            <span className="text-orange-600">{current.viewers}</span> {current.viewerPhrase}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            <span className="font-medium text-gray-700">{current.product}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Be quick — stock is limited</p>
        </>
      );
    }
    if (current.type === 'review') {
      return (
        <>
          <p className="text-sm font-bold text-gray-900">{current.name} from {current.city}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {current.reviewPhrase} — <span className="font-medium text-gray-700">{current.product}</span>
          </p>
          <div className="flex items-center gap-1 mt-1">
            {[...Array(5)].map((_, i) => <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />)}
            <span className="text-xs text-gray-400 ml-1">{current.time}</span>
          </div>
        </>
      );
    }
    return (
      <>
        <p className="text-sm font-bold text-gray-900">{current.name} from {current.city}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {current.qty ? current.qty : 'just purchased'}{' '}
          <span className="font-medium text-gray-700">{current.product}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">{current.time}</p>
      </>
    );
  };

  const iconBg = current.type === 'viewers' ? 'bg-blue-100' : current.type === 'review' ? 'bg-yellow-100' : 'bg-orange-100';
  const IconFallback = current.type === 'viewers' ? <Users size={18} className="text-blue-500" />
    : current.type === 'review' ? <Star size={18} className="text-yellow-500" />
    : <ShoppingBag size={18} className="text-orange-500" />;

  return (
    <div
      className={`fixed bottom-4 left-4 z-40 max-w-xs transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      role="status"
      aria-live="polite"
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 ${iconBg} flex items-center justify-center`}>
          {iconSrc && current.type !== 'viewers' ? (
            <>
              <img
                src={iconSrc}
                alt={current.product}
                className="w-full h-full object-cover"
                loading="lazy" decoding="async"
                onError={e => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <span className="w-full h-full items-center justify-center" style={{ display: 'none' }}>
                {IconFallback}
              </span>
            </>
          ) : IconFallback}
        </div>
        <div className="flex-1 min-w-0">{renderContent()}</div>
        <button
          onClick={() => {
            setVisible(false);
            setLastShown(getVisitorKey());
          }}
          className="text-gray-300 hover:text-gray-500 flex-shrink-0 -mt-0.5"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

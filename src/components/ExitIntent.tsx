// @ts-nocheck
import { useEffect, useState } from 'react';
import { X, Zap } from 'lucide-react';
import { Link } from 'wouter';
import API from '@/lib/api';

const STORAGE_KEY = 'np_exit_intent_shown';

const DEFAULT_SETTINGS = {
  exitIntentEnabled: true,
  exitIntentTitle: "Wait! Don't Go.",
  exitIntentSubtitle: 'Here\'s an exclusive offer just for you',
  exitIntentCoupon: 'FIRST10',
  exitIntentDiscountText: '10% OFF',
  exitIntentBullets: ['Valid on your first order', 'Free delivery above ₹999', 'Lab tested, authentic products'],
  exitIntentBtnText: 'Shop Now & Save 10%',
  exitIntentImage: '',
};

export default function ExitIntent() {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cfg, setCfg] = useState<typeof DEFAULT_SETTINGS>(DEFAULT_SETTINGS);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    API.get('/settings').then(r => {
      const s = r.data;
      setCfg({
        exitIntentEnabled: s.exitIntentEnabled !== false,
        exitIntentTitle: s.exitIntentTitle || DEFAULT_SETTINGS.exitIntentTitle,
        exitIntentSubtitle: s.exitIntentSubtitle || DEFAULT_SETTINGS.exitIntentSubtitle,
        exitIntentCoupon: s.exitIntentCoupon || DEFAULT_SETTINGS.exitIntentCoupon,
        exitIntentDiscountText: s.exitIntentDiscountText || DEFAULT_SETTINGS.exitIntentDiscountText,
        exitIntentBullets: Array.isArray(s.exitIntentBullets) && s.exitIntentBullets.length ? s.exitIntentBullets : DEFAULT_SETTINGS.exitIntentBullets,
        exitIntentBtnText: s.exitIntentBtnText || DEFAULT_SETTINGS.exitIntentBtnText,
        exitIntentImage: s.exitIntentImage || '',
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cfg.exitIntentEnabled) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    let triggered = false;

    const handleMouseLeave = (e: MouseEvent) => {
      if (triggered) return;
      if (e.clientY <= 10) {
        triggered = true;
        sessionStorage.setItem(STORAGE_KEY, '1');
        setTimeout(() => setShow(true), 200);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [cfg.exitIntentEnabled]);

  const copyCode = () => {
    navigator.clipboard.writeText(cfg.exitIntentCoupon).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!show) return null;

  const showImage = cfg.exitIntentImage && !imgError;

  return (
    <div className="np-exit-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShow(false)}>
      <div
        className="np-exit-card relative bg-white rounded-2xl shadow-2xl w-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setShow(false)}
          className="np-exit-close absolute top-2 right-2 text-white/90 hover:text-white z-10"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="np-exit-head bg-gradient-to-br from-orange-500 to-orange-600 text-white text-center shrink-0">
          {showImage ? (
            <div className="np-exit-icon mx-auto rounded-xl overflow-hidden shadow-lg border-2 border-white/30">
              <img
                src={cfg.exitIntentImage}
                alt="Offer"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)} loading="lazy" decoding="async"
              />
            </div>
          ) : (
            <div className="np-exit-icon bg-white/20 rounded-full flex items-center justify-center mx-auto">
              <Zap className="np-exit-zap text-white fill-white" />
            </div>
          )}
          <h2 className="np-exit-title font-black leading-tight">{cfg.exitIntentTitle}</h2>
          <p className="np-exit-sub text-orange-100">{cfg.exitIntentSubtitle}</p>
        </div>

        <div className="np-exit-body text-center">
          <p className="np-exit-lead text-gray-600">
            Get <span className="text-orange-500 font-black np-exit-discount">{cfg.exitIntentDiscountText}</span> your first order with code:
          </p>

          <button
            onClick={copyCode}
            className="np-exit-coupon group w-full border-2 border-dashed border-orange-300 rounded-xl hover:border-orange-500 transition-colors"
          >
            <span className="np-exit-code font-black text-orange-500 tracking-widest block">{cfg.exitIntentCoupon}</span>
            <span className="np-exit-copy block text-gray-400 group-hover:text-orange-500 transition-colors">
              {copied ? '✓ Copied!' : 'Click to copy'}
            </span>
          </button>

          {cfg.exitIntentBullets.length > 0 && (
            <ul className="np-exit-bullets text-gray-500 text-left">
              {cfg.exitIntentBullets.map((b: string, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-green-500 shrink-0">✓</span> <span className="min-w-0">{b}</span>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/products"
            onClick={() => setShow(false)}
            className="np-exit-cta block w-full bg-orange-500 text-white font-black rounded-xl hover:bg-orange-600 transition-colors"
          >
            {cfg.exitIntentBtnText}
          </Link>
          <button onClick={() => setShow(false)} className="np-exit-skip text-gray-400 hover:text-gray-600 underline block mx-auto">
            No thanks, I'll pay full price
          </button>
        </div>
      </div>

      <style>{`
        .np-exit-card { max-width: min(420px, 94vw); max-height: 94dvh; max-height: 94vh; display: flex; flex-direction: column; }
        .np-exit-head { padding: clamp(12px, 2.6vh, 24px) clamp(16px, 5vw, 28px); }
        .np-exit-icon { width: clamp(36px, 7vh, 56px); height: clamp(36px, 7vh, 56px); margin-bottom: clamp(6px, 1.4vh, 12px); }
        .np-exit-zap { width: clamp(18px, 3.4vh, 24px); height: clamp(18px, 3.4vh, 24px); }
        .np-exit-title { font-size: clamp(15px, 3vh, 24px); margin-bottom: clamp(2px, 0.4vh, 4px); }
        .np-exit-sub { font-size: clamp(11px, 1.7vh, 14px); }
        .np-exit-body { padding: clamp(12px, 2.4vh, 22px) clamp(16px, 5vw, 28px); display: flex; flex-direction: column; min-height: 0; }
        .np-exit-lead { font-size: clamp(11px, 1.7vh, 14px); margin-bottom: clamp(8px, 1.6vh, 16px); }
        .np-exit-discount { font-size: clamp(12px, 2vh, 16px); }
        .np-exit-coupon { padding: clamp(8px, 1.6vh, 14px) 12px; margin-bottom: clamp(8px, 1.6vh, 16px); }
        .np-exit-code { font-size: clamp(18px, 3.2vh, 26px); }
        .np-exit-copy { font-size: clamp(10px, 1.4vh, 12px); margin-top: 2px; }
        .np-exit-bullets { font-size: clamp(10px, 1.5vh, 12px); margin-bottom: clamp(8px, 1.6vh, 16px); display: flex; flex-direction: column; gap: clamp(2px, 0.5vh, 6px); }
        .np-exit-cta { padding: clamp(9px, 1.8vh, 14px) 12px; font-size: clamp(13px, 2vh, 16px); }
        .np-exit-skip { font-size: clamp(10px, 1.3vh, 12px); margin-top: clamp(6px, 1.2vh, 12px); }
        /* Very short viewports: drop bullets entirely so nothing clips */
        @media (max-height: 520px) {
          .np-exit-bullets { display: none; }
        }
        @media (max-height: 440px) {
          .np-exit-icon { display: none; }
          .np-exit-sub { display: none; }
        }
      `}</style>
    </div>
  );
}


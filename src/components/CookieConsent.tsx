// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';

const KEY = 'nutropact:cookie-consent';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (!v) setShow(true);
    } catch { /* private mode */ }
  }, []);

  const decide = (accepted: boolean) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ accepted, ts: Date.now() }));
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-2 bottom-2 z-[60] sm:inset-x-auto sm:bottom-4 sm:left-4 sm:right-4 sm:mx-auto sm:max-w-3xl"
    >
      <div className="rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-foreground sm:text-sm">
            We use cookies to keep the site working, remember your cart, and improve performance.
            By using NutroPact you agree to our{' '}
            <Link to="/privacy" className="underline">Privacy Policy</Link>.
            Compliant with India's DPDP Act.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => decide(false)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              Decline
            </button>
            <button
              onClick={() => decide(true)}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

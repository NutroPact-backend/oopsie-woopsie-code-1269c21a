// @ts-nocheck
import { useEffect, useState } from 'react';

type Props = {
  messages: string[];
  intervalSec: number;
  transition: 'fade' | 'slide-up' | 'none' | string;
  bg: string;
  color: string;
  fontSize: number;
  fontWeight: string | number;
  paddingY: number;
};

export default function AnnouncementBar({ messages, intervalSec, transition, bg, color, fontSize, fontWeight, paddingY }: Props) {
  const list = messages.length ? messages : [];
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (list.length <= 1) return;
    // Respect reduced-motion + save-data: skip animation, still rotate.
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const useAnim = !reduced && transition !== 'none';
    const showMs = Math.max(1, intervalSec) * 1000;
    const fadeMs = 350;

    const id = window.setInterval(() => {
      if (!useAnim) {
        setI(prev => (prev + 1) % list.length);
        return;
      }
      setVisible(false);
      window.setTimeout(() => {
        setI(prev => (prev + 1) % list.length);
        setVisible(true);
      }, fadeMs);
    }, showMs);
    return () => window.clearInterval(id);
  }, [list.length, intervalSec, transition]);

  if (!list.length) return null;

  const anim =
    transition === 'slide-up'
      ? { transform: visible ? 'translateY(0)' : 'translateY(-100%)', opacity: visible ? 1 : 0 }
      : transition === 'none'
      ? {}
      : { opacity: visible ? 1 : 0 };

  return (
    <div
      style={{
        backgroundColor: bg,
        color,
        fontSize: `${fontSize}px`,
        fontWeight,
        paddingTop: `${paddingY}px`,
        paddingBottom: `${paddingY}px`,
      }}
      className="text-center px-4 relative overflow-hidden"
      aria-live="polite"
    >
      <span
        style={{
          display: 'inline-block',
          transition: transition === 'none' ? 'none' : 'opacity 320ms ease, transform 320ms ease',
          ...anim,
        }}
      >
        {list[i]}
      </span>
    </div>
  );
}

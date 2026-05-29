// @ts-nocheck
import { useEffect, useState } from 'react';

export type LabCompound = { name: string; value: string; status?: string };
export type LabReportProps = {
  enabled?: boolean;
  batchNumber?: string;
  testDate?: string;
  labName?: string;
  certNumber?: string;
  signatureName?: string;
  signatureRole?: string;
  stampText?: string;
  footerNote?: string;
  title?: string;
  subtitle?: string;
  compounds?: LabCompound[];
};

const DEFAULT_COMPOUNDS: LabCompound[] = [
  { name: 'Whey Protein', value: '24.8 g', status: 'PASS' },
  { name: 'BCAA', value: '5.6 g', status: 'PASS' },
  { name: 'Heavy Metals', value: '<0.01 ppm', status: 'PASS' },
  { name: 'Microbial', value: 'Not Detected', status: 'PASS' },
  { name: 'Banned Substances', value: 'None', status: 'PASS' },
  { name: 'Added Sugar', value: '0.4 g', status: 'PASS' },
];

export default function LabReportBanner(p: LabReportProps) {
  if (p.enabled === false) return null;

  const compounds = p.compounds?.length ? p.compounds : DEFAULT_COMPOUNDS;
  const today = new Date().toISOString().slice(0, 10);
  const batch = p.batchNumber || `NP-${today.replace(/-/g, '')}-A1`;
  const cert = p.certNumber || 'NABL/2025/0042';
  const lab = p.labName || 'Eurofins Analytical Services';
  const date = p.testDate || today;
  const sig = p.signatureName || 'Dr. A. Verma';
  const role = p.signatureRole || 'Lab Director, NABL';
  const stamp = p.stampText || 'VERIFIED';
  const title = p.title || 'Every batch. Open lab. Zero secrets.';
  const subtitle = p.subtitle || 'Each NutroPact tub ships with a real third-party certificate of analysis. Here is a live snapshot of the latest one.';
  const footer = p.footerNote || 'Scan the QR on your tub or visit /coa with your batch number to download the full PDF report.';

  // marquee ticker text
  const ticker = compounds.map(c => `${c.name.toUpperCase()} ${c.value} ✓`).join('   •   ');

  // tiny animated dot for the seal
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => (t + 1) % 360), 60);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative bg-[#0a0a0a] text-white py-16 sm:py-24 overflow-hidden">
      {/* faint blueprint grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-10">
          <p className="text-[11px] font-bold tracking-[0.3em] text-orange-400 mb-3">
            CERTIFICATE OF ANALYSIS — LIVE
          </p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.05]">{title}</h2>
          <p className="mt-4 text-gray-400 text-base sm:text-lg leading-relaxed">{subtitle}</p>
        </div>

        {/* the receipt */}
        <div className="relative mx-auto max-w-4xl">
          {/* perforated edges */}
          <div
            aria-hidden
            className="absolute -left-2 top-3 bottom-3 w-4"
            style={{
              backgroundImage:
                'radial-gradient(circle at 8px 8px, #0a0a0a 6px, transparent 7px)',
              backgroundSize: '16px 16px',
            }}
          />
          <div
            aria-hidden
            className="absolute -right-2 top-3 bottom-3 w-4"
            style={{
              backgroundImage:
                'radial-gradient(circle at 8px 8px, #0a0a0a 6px, transparent 7px)',
              backgroundSize: '16px 16px',
            }}
          />

          <div
            className="relative bg-[#f4efe4] text-[#1a1a1a] rounded-sm shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] px-6 sm:px-12 py-8 sm:py-12 font-mono"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0,0,0,0.025) 0 1px, transparent 1px 28px)',
            }}
          >
            {/* watermark stamp */}
            <div
              aria-hidden
              className="absolute right-6 sm:right-12 top-6 sm:top-10 select-none"
              style={{ transform: `rotate(${-12 + Math.sin(tick / 30) * 2}deg)` }}
            >
              <div className="relative h-24 w-24 sm:h-32 sm:w-32 rounded-full border-[3px] border-red-600/80 flex items-center justify-center">
                <div className="absolute inset-2 rounded-full border-2 border-red-600/50" />
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs font-black text-red-600/90 tracking-[0.2em]">
                    {stamp}
                  </p>
                  <p className="text-[8px] sm:text-[9px] font-bold text-red-600/70 mt-0.5">
                    {date}
                  </p>
                </div>
              </div>
            </div>

            {/* header */}
            <div className="border-b-2 border-dashed border-black/30 pb-5 mb-6">
              <p className="text-[10px] font-bold tracking-[0.25em] text-black/60">
                NUTROPACT — INDEPENDENT LAB ASSAY
              </p>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight mt-2">
                Batch <span className="text-orange-600">{batch}</span>
              </h3>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-[11px] sm:text-xs">
                <div><span className="text-black/50">CERT NO. </span><span className="font-bold">{cert}</span></div>
                <div><span className="text-black/50">DATE </span><span className="font-bold">{date}</span></div>
                <div className="col-span-2 sm:col-span-1"><span className="text-black/50">LAB </span><span className="font-bold">{lab}</span></div>
              </div>
            </div>

            {/* compound table */}
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-black/50 text-[10px] sm:text-[11px] tracking-[0.15em]">
                  <th className="text-left pb-2 font-bold">PARAMETER</th>
                  <th className="text-right pb-2 font-bold">RESULT</th>
                  <th className="text-right pb-2 font-bold">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {compounds.map((c, i) => (
                  <tr key={i} className="border-t border-dashed border-black/20">
                    <td className="py-2.5 font-semibold uppercase tracking-wider text-[11px] sm:text-xs">{c.name}</td>
                    <td className="py-2.5 text-right font-bold">{c.value}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-black tracking-wider rounded-sm ${
                        (c.status || 'PASS').toUpperCase() === 'PASS'
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}>
                        {(c.status || 'PASS').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* signature row */}
            <div className="mt-8 pt-5 border-t-2 border-dashed border-black/30 flex items-end justify-between gap-6">
              <div>
                <p className="font-['Caveat',cursive] text-2xl sm:text-3xl leading-none text-black/80" style={{ fontFamily: 'cursive' }}>
                  {sig}
                </p>
                <p className="text-[10px] sm:text-xs text-black/60 mt-1 tracking-wider">{role}</p>
              </div>
              {/* fake barcode */}
              <div aria-hidden className="hidden sm:flex items-end gap-[2px] h-10">
                {Array.from({ length: 38 }).map((_, i) => (
                  <span
                    key={i}
                    className="bg-black"
                    style={{ width: 2, height: `${30 + ((i * 53) % 70) * 0.15}px`, opacity: i % 3 === 0 ? 1 : 0.85 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ticker */}
        <div className="relative mt-8 overflow-hidden border-y border-white/10 py-3">
          <div
            className="whitespace-nowrap text-xs sm:text-sm font-mono text-orange-300/90 tracking-wider"
            style={{ animation: 'lab-marquee 40s linear infinite' }}
          >
            <span className="inline-block pr-12">{ticker}   •   {ticker}</span>
          </div>
          <style>{`@keyframes lab-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
        </div>

        <p className="mt-6 text-center text-xs sm:text-sm text-gray-500 max-w-2xl mx-auto">
          {footer}
        </p>
      </div>
    </section>
  );
}

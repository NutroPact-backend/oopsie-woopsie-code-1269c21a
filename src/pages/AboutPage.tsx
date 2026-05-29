import { useSettings } from '@/lib/useSettings';
import LabReportBanner from '@/components/about/LabReportBanner';
import { T } from '@/lib/useContentT';



type Stat = { value: string; label: string };
type Pillar = { icon: string; title: string; text: string };
type StoryBlock = { heading: string; text: string; image?: string };
type Cert = { image: string; label: string };

const DEFAULTS = {
  kicker: 'OUR STORY',
  title: 'Built for athletes who refuse to compromise.',
  subtitle:
    'NutroPact is a homegrown nutrition company crafting lab-tested, transparent supplements — engineered in India, trusted by athletes across the country.',
  heroImage:
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1600&q=70',
  badges: ['FSSAI Approved', 'Made in India', 'Lab Tested', 'No Banned Substances'],

  stats: [
    { value: '50K+', label: 'Athletes served' },
    { value: '100%', label: 'Lab tested batches' },
    { value: '5+', label: 'Years of trust' },
    { value: '4.8★', label: 'Customer rating' },
  ] as Stat[],

  missionTitle: 'Our Mission',
  missionText:
    'To make world-class sports nutrition accessible, honest and proudly Indian — without proprietary blends, hidden fillers, or marketing fluff.',
  visionTitle: 'Our Vision',
  visionText:
    'A generation of Indian athletes that trains harder, recovers smarter and never has to choose between quality and value.',

  story: [
    {
      heading: 'It started in a small gym in 2019.',
      text:
        'Frustrated by overpriced imports and under-dosed local brands, our founders began formulating their own protein in collaboration with FSSAI-certified labs. Word spread fast — and NutroPact was born.',
      image:
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=70',
    },
    {
      heading: 'Every label tells the full truth.',
      text:
        'We publish complete amino acid profiles, third-party assays and batch numbers on every tub. If a number isn’t on the label, it isn’t in the scoop. That is the NutroPact promise.',
      image:
        'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=1200&q=70',
    },
  ] as StoryBlock[],

  pillars: [
    { icon: '🧪', title: 'Lab Verified', text: 'Every batch tested by NABL-accredited labs for protein, heavy metals & purity.' },
    { icon: '🇮🇳', title: 'Proudly Indian', text: 'Formulated and manufactured in FSSAI-approved facilities across India.' },
    { icon: '🚫', title: 'No Fillers', text: 'Zero amino spiking, zero proprietary blends, zero banned substances.' },
    { icon: '💪', title: 'Athlete First', text: 'Built with input from national-level athletes, coaches and nutritionists.' },
    { icon: '🌱', title: 'Clean Sourcing', text: 'Premium grass-fed whey, traceable creatine, pharma-grade actives.' },
    { icon: '🤝', title: 'Real Support', text: 'WhatsApp & call support from real humans — not bots.' },
  ] as Pillar[],

  certsTitle: 'Certifications & Standards',
  certs: [
    { image: '', label: 'FSSAI' },
    { image: '', label: 'GMP' },
    { image: '', label: 'ISO 9001' },
    { image: '', label: 'NABL Tested' },
  ] as Cert[],

  founderImage:
    'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=800&q=70',
  founderName: 'Rohan Mehta',
  founderRole: 'Founder & Head of Formulation',
  founderQuote:
    '“We don’t sell supplements. We sell trust — bottled in a tub. If it’s not good enough for my own training, it doesn’t go on the shelf.”',

  ctaTitle: 'Train with nutrition you can actually trust.',
  ctaText: 'Browse the full range of lab-tested NutroPact essentials.',
  ctaButton: 'Shop the range',
  ctaLink: '/products',
};

export default function AboutPage() {
  const { settings } = useSettings();
  const p: any = { ...DEFAULTS, ...(settings?.aboutPage || {}) };

  // arrays: if admin set them (even empty) we respect that; otherwise defaults
  const stats: Stat[] = Array.isArray(p.stats) && p.stats.length ? p.stats : DEFAULTS.stats;
  const story: StoryBlock[] = Array.isArray(p.story) && p.story.length ? p.story : DEFAULTS.story;
  const pillars: Pillar[] = Array.isArray(p.pillars) && p.pillars.length ? p.pillars : DEFAULTS.pillars;
  const badges: string[] = Array.isArray(p.badges) && p.badges.length ? p.badges : DEFAULTS.badges;
  const certs: Cert[] = Array.isArray(p.certs) && p.certs.length ? p.certs : DEFAULTS.certs;

  return (
    <div className="bg-white text-gray-900">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs sm:text-sm font-bold tracking-[0.25em] text-orange-500 mb-4">
              <T>{p.kicker}</T>
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight">
              <T>{p.title}</T>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
              <T>{p.subtitle}</T>
            </p>
            {badges.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {badges.map((b, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    <T>{b}</T>
                  </span>
                ))}
              </div>
            )}
          </div>
          {p.heroImage && (
            <div className="relative">
              <div className="aspect-[5/4] w-full overflow-hidden rounded-3xl bg-gray-100 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
                <img
                  src={p.heroImage}
                  alt="About NutroPact"
                  loading="lazy"
                  width={1200}
                  height={960}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-5 -left-5 hidden sm:block rounded-2xl bg-white shadow-lg border border-gray-100 px-5 py-3">
                <p className="text-2xl font-black text-orange-500 leading-none">{stats[0]?.value}</p>
                <p className="text-xs text-gray-500 font-medium mt-1"><T>{stats[0]?.label}</T></p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* LAB REPORT BANNER (unique) */}
      <LabReportBanner {...(p.labReport || {})} />



      {/* STATS */}
      <section className="border-b border-gray-100 bg-gray-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center sm:text-left">
              <p className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">{s.value}</p>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mt-1 uppercase tracking-wider">
                <T>{s.label}</T>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* MISSION + VISION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-gray-100 p-8 sm:p-10 bg-white hover:shadow-sm transition">
          <p className="text-xs font-bold tracking-[0.2em] text-orange-500 mb-3"><T>01 — MISSION</T></p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight"><T>{p.missionTitle}</T></h2>
          <p className="mt-4 text-gray-600 leading-relaxed"><T>{p.missionText}</T></p>
        </div>
        <div className="rounded-3xl border border-gray-100 p-8 sm:p-10 bg-gray-900 text-white">
          <p className="text-xs font-bold tracking-[0.2em] text-orange-400 mb-3"><T>02 — VISION</T></p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight"><T>{p.visionTitle}</T></h2>
          <p className="mt-4 text-gray-300 leading-relaxed"><T>{p.visionText}</T></p>
        </div>
      </section>

      {/* STORY BLOCKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 space-y-16 sm:space-y-24">
        {story.map((b, i) => (
          <div
            key={i}
            className={`grid lg:grid-cols-2 gap-8 lg:gap-14 items-center ${i % 2 ? 'lg:[&>div:first-child]:order-2' : ''}`}
          >
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-orange-500 mb-3">
                <T>CHAPTER</T> {String(i + 1).padStart(2, '0')}
              </p>
              <h3 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight"><T>{b.heading}</T></h3>
              <p className="mt-5 text-gray-600 leading-relaxed text-base sm:text-lg"><T>{b.text}</T></p>
            </div>
            {b.image && (
              <div className="aspect-[4/3] w-full overflow-hidden rounded-3xl bg-gray-100">
                <img
                  src={b.image}
                  alt={b.heading}
                  loading="lazy"
                  width={1200}
                  height={900}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
        ))}
      </section>

      {/* PILLARS */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold tracking-[0.2em] text-orange-500 mb-3"><T>WHAT WE STAND FOR</T></p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              <T>Six promises on every tub we ship.</T>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {pillars.map((pl, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-gray-100 p-6 hover:border-orange-200 hover:shadow-sm transition"
              >
                <div className="text-3xl mb-3">{pl.icon}</div>
                <h4 className="font-black text-lg tracking-tight"><T>{pl.title}</T></h4>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed"><T>{pl.text}</T></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CERTS */}
      {certs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <p className="text-xs font-bold tracking-[0.2em] text-orange-500 mb-3 text-center"><T>QUALITY</T></p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-center mb-10">
            <T>{p.certsTitle}</T>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {certs.map((c, i) => (
              <div
                key={i}
                className="aspect-[3/2] rounded-2xl border border-gray-100 bg-white flex flex-col items-center justify-center p-4 hover:border-gray-200 transition"
              >
                {c.image ? (
                  <img
                    src={c.image}
                    alt={c.label}
                    loading="lazy"
                    width={160}
                    height={80}
                    className="max-h-12 object-contain"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 font-black">
                    ✓
                  </div>
                )}
                <p className="mt-2 text-xs font-bold text-gray-600 tracking-wider uppercase"><T>{c.label}</T></p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FOUNDER */}
      {(p.founderName || p.founderQuote) && (
        <section className="bg-gray-900 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid md:grid-cols-[260px_1fr] gap-8 md:gap-12 items-center">
            {p.founderImage && (
              <div className="mx-auto md:mx-0 h-40 w-40 sm:h-56 sm:w-56 rounded-full overflow-hidden border-4 border-orange-500">
                <img
                  src={p.founderImage}
                  alt={p.founderName}
                  loading="lazy"
                  width={400}
                  height={400}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-orange-400 mb-3">
                <T>A NOTE FROM OUR FOUNDER</T>
              </p>
              <blockquote className="text-xl sm:text-2xl lg:text-3xl font-medium leading-snug">
                <T>{p.founderQuote}</T>
              </blockquote>
              <div className="mt-6">
                <p className="font-black tracking-tight">{p.founderName}</p>
                <p className="text-sm text-gray-400"><T>{p.founderRole}</T></p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 text-white p-8 sm:p-14 text-center shadow-[0_30px_60px_-30px_rgba(249,115,22,0.5)]">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight max-w-2xl mx-auto">
            <T>{p.ctaTitle}</T>
          </h2>
          <p className="mt-3 text-orange-50 max-w-xl mx-auto"><T>{p.ctaText}</T></p>
          <a
            href={p.ctaLink || '/products'}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white text-orange-600 px-7 py-3.5 font-bold text-sm sm:text-base hover:bg-gray-50 transition"
          >
            <T>{p.ctaButton}</T> →
          </a>
        </div>
      </section>
    </div>
  );
}

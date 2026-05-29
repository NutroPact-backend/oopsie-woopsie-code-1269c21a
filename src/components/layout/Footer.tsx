// @ts-nocheck
import { Link } from 'wouter';
import { useState } from 'react';
import { useSettings } from '@/lib/useSettings';
import MarketplaceStrip from '@/components/MarketplaceStrip';

const defaultBlocks = (s: any) => [
  { type: 'logo', order: 0, enabled: true, width: 16, mobileWidth: 100, align: 'center', mobileAlign: 'center', logo: s?.logo || '', logoWidth: s?.footerLogoWidth || 120, mobileLogoWidth: 72 },
  {
    type: 'links', title: 'Useful Links', order: 1, enabled: true, width: 18, mobileWidth: 100,
    links: [
      { label: 'About US!', href: '/about' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use', href: '/terms' },
      { label: 'Shipping Policy', href: '/shipping' },
      { label: 'Return Policy', href: '/refund' },
    ],
  },
  {
    type: 'links', title: 'Explore', order: 2, enabled: true, width: 18, mobileWidth: 100,
    links: [
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQs', href: '/faq' },
      { label: 'Track Order', href: '/track-order' },
    ],
  },
  {
    type: 'text', title: 'Contact Us', order: 3, enabled: true, width: 30, mobileWidth: 100,
    text: `<strong>Contact Number :</strong> ${s?.phone || '+91-8955590350'}<br/><br/><strong>NutroPact Support Email :</strong> ${s?.email || 'info@nutropact.com'}<br/><br/><strong>Email & Call Timings</strong><br/>Monday to Saturday (11:00 AM - 6:00 PM)`,
  },
  { type: 'social', title: 'Follow Us On', order: 4, enabled: true, width: 18, mobileWidth: 100, socialIcons: s?.footerSocialIcons || [], badges: s?.footerBadges || [] },
];

function normalizeBlocks(s: any) {
  if (s?.footerBlocks?.length) return s.footerBlocks;
  const legacyColumns = (s?.footerColumns || []).map((col: any, i: number) => ({ ...col, order: i + 1, enabled: true }));
  return legacyColumns.length ? [{ type: 'logo', order: 0, enabled: true, width: 16, logo: s?.logo || '', logoWidth: s?.footerLogoWidth || 120 }, ...legacyColumns] : defaultBlocks(s);
}

export default function Footer() {
  const { settings: s } = useSettings();
  const [openSection, setOpenSection] = useState<number | null>(null);

  const siteName = s?.siteName || 'NUTROPACT';
  const footerBg = s?.footerBg || '#58b385';
  const footerText = s?.footerText || '#000000';
  const copyright = s?.footerCopyright || '© 2026 NutroPact. All rights reserved.';
  const blocks = normalizeBlocks(s)
    .filter((block: any) => block.enabled !== false)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  const dynamicSocials = Array.isArray(s?.socialLinks)
    ? s.socialLinks.filter((x: any) => x?.url).map((x: any) => ({ url: x.url, label: x.label, image: x.icon || x.image || '' }))
    : [];
  const fallbackSocials = dynamicSocials.length ? dynamicSocials : [
    s?.instagram && { url: s.instagram, label: 'Instagram' },
    s?.youtube && { url: s.youtube, label: 'YouTube' },
    s?.facebook && { url: s.facebook, label: 'Facebook' },
  ].filter(Boolean);

  const titleStyle = (block: any) => ({
    color: block.titleColor || footerText,
    fontSize: `${block.titleSize || 16}px`,
    fontWeight: block.titleWeight || '700',
  });

  const linkStyle = (block: any) => ({
    color: block.linkColor || footerText,
    fontSize: `${block.linkSize || 14}px`,
    fontWeight: block.linkWeight || '400',
  });

  const textStyle = (block: any) => ({
    color: block.textColor || footerText,
    fontSize: `${block.textSize || 14}px`,
    fontWeight: block.textWeight || '400',
  });

  return (
    <footer style={{ backgroundColor: footerBg, color: footerText }} className="uf-footer app-bottom-safe">
      <div className="uf-flex">
        {blocks.map((block: any, i: number) => {
          const width = block.width || 20;
          const mobileWidth = block.mobileWidth || 100;
          const align = block.align || 'left';
          const mobileAlign = block.mobileAlign || align;
          const isOpen = openSection === i;

          return (
            <div key={block._id || i} className="uf-block"
              style={{
                flex: `0 0 ${width}%`,
                maxWidth: `${width}%`,
                textAlign: align,
                '--mobile-width': `${mobileWidth}%`,
                '--mobile-align': mobileAlign,
              } as any}>
              {block.type === 'logo' && (block.logo || s?.logo) && (
                <div className="uf-logo-wrap">
                  <img src={block.logo || s?.logo} alt={siteName} style={{ width: block.logoWidth || s?.footerLogoWidth || 120 }}  loading="lazy" decoding="async"/>
                </div>
              )}

              {block.type === 'links' && (
                <div className="uf-panel">
                  {block.title && (
                    <button type="button" className="uf-panel-title" onClick={() => setOpenSection(isOpen ? null : i)} style={titleStyle(block)}>
                      <span>{block.title}</span>
                      <svg className={`uf-arrow ${isOpen ? 'uf-arrow--open' : ''}`} viewBox="0 0 12 12" fill="none">
                        <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  <ul className={`uf-links ${isOpen ? 'uf-links--open' : ''}`}>
                    {(block.links || []).map((link: any, j: number) => (
                      <li key={j}><Link href={link.href || '#'} style={linkStyle(block)}>{link.label}</Link></li>
                    ))}
                  </ul>
                </div>
              )}

              {block.type === 'text' && (
                <div className="uf-panel">
                  {block.title && (
                    <button type="button" className="uf-panel-title" onClick={() => setOpenSection(isOpen ? null : i)} style={titleStyle(block)}>
                      <span>{block.title}</span>
                      <svg className={`uf-arrow ${isOpen ? 'uf-arrow--open' : ''}`} viewBox="0 0 12 12" fill="none">
                        <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                  <div className={`uf-text ${isOpen ? 'uf-text--open' : ''}`} style={textStyle(block)} dangerouslySetInnerHTML={{ __html: block.text || '' }} />
                </div>
              )}

              {block.type === 'social' && (
                <div className="uf-social-wrap">
                  {block.title && <p className="uf-static-title" style={titleStyle(block)}>{block.title}</p>}
                  <div className="uf-social-icons">
                    {((block.socialIcons || []).length ? block.socialIcons : fallbackSocials).map((icon: any, j: number) => (
                      <a key={j} href={icon.url || '#'} target="_blank" rel="noopener noreferrer" aria-label={icon.label || 'Social'}>
                        {icon.image ? <img src={icon.image} alt={icon.label || ''} style={{ width: icon.size || 28, height: icon.size || 28 }}  loading="lazy" decoding="async"/> : <span style={linkStyle(block)}>{icon.label}</span>}
                      </a>
                    ))}
                  </div>
                  {!!(block.badges || []).length && (
                    <div className="uf-badges">
                      {(block.badges || []).map((badge: any, j: number) => {
                        const img = <img src={badge.image} alt={badge.label || 'Badge'} style={{ width: badge.width || 60 }}  loading="lazy" decoding="async"/>;
                        return badge.url ? <a key={j} href={badge.url} target="_blank" rel="noopener noreferrer">{img}</a> : <span key={j}>{img}</span>;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <MarketplaceStrip />

      <div className="uf-copyright" style={{ borderColor: `${footerText}30`, color: footerText }}>
        {copyright}
      </div>

      <style>{`
        .uf-footer { padding: 30px 20px 16px; overflow: hidden; }
        .uf-flex { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; max-width: 1400px; margin: 0 auto; }
        .uf-block { min-width: 0; }
        .uf-logo-wrap { display: flex; justify-content: center; }
        .uf-logo-wrap img { height: auto; max-width: 100%; object-fit: contain; }
        .uf-panel-title { background: none; border: 0; width: 100%; padding: 0; margin: 0 0 12px; color: inherit; font-family: inherit; display: flex; align-items: center; justify-content: space-between; cursor: default; text-align: inherit; }
        .uf-static-title { margin: 0 0 12px; }
        .uf-arrow { width: 14px; height: 14px; display: none; transition: transform 0.25s; }
        .uf-arrow--open { transform: rotate(180deg); }
        .uf-links { list-style: none; padding: 0; margin: 0; }
        .uf-links li { margin-bottom: 10px; }
        .uf-links a { text-decoration: none; opacity: 0.88; transition: opacity 0.2s; }
        .uf-links a:hover { opacity: 1; }
        .uf-text { line-height: 1.55; opacity: 0.92; }
        .uf-text strong { font-weight: 700; }
        .uf-social-wrap { display: flex; flex-direction: column; gap: 10px; }
        .uf-social-icons { display: flex; flex-wrap: wrap; gap: 9px; align-items: center; }
        .uf-social-icons a { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }
        .uf-social-icons img { object-fit: contain; display: block; }
        .uf-badges { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 14px; }
        .uf-badges img { height: auto; max-width: 100%; object-fit: contain; display: block; }
        .uf-copyright { max-width: 1400px; margin: 18px auto 0; padding-top: 12px; border-top: 1px solid; text-align: center; font-size: 12px; opacity: 0.72; }

        @media (max-width: 768px) {
          .uf-footer { padding: 10px 10px 12px; }
          .uf-flex { gap: 0; display: block; }
          .uf-block { width: var(--mobile-width) !important; max-width: var(--mobile-width) !important; text-align: var(--mobile-align) !important; margin: 0 auto; }
          .uf-logo-wrap { justify-content: center; padding: 0 0 6px; }
          .uf-logo-wrap img { max-width: 90px; }
          .uf-panel { border-top: 1px solid rgba(0,0,0,0.18); }
          .uf-panel-title { cursor: pointer; margin: 0; padding: 8px 0; text-align: left; }
          .uf-arrow { display: block; }
          .uf-links, .uf-text { max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.3s ease, opacity 0.2s ease; }
          .uf-links--open, .uf-text--open { max-height: 640px; opacity: 1; padding-bottom: 10px; }
          .uf-links li { margin-bottom: 8px; }
          .uf-social-wrap { border-top: 1px solid rgba(0,0,0,0.18); padding: 9px 0 0; gap: 7px; }
          .uf-static-title { margin: 0 0 6px; text-align: left; }
          .uf-social-icons { justify-content: flex-end; gap: 6px; margin-top: -24px; }
          .uf-badges { gap: 7px; margin-top: 8px; justify-content: flex-start; }
          .uf-badges img { max-width: 48px; }
          .uf-copyright { font-size: 11px; margin-top: 10px; padding-top: 10px; }
        }
      `}</style>
    </footer>
  );
}

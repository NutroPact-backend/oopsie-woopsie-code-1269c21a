// @ts-nocheck
import { Link, useLocation } from 'wouter';
import { useState, useRef, useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useSettings } from '@/lib/useSettings';
import { formatPrice } from '@/lib/utils';
import API from '@/lib/api';
import AnnouncementBar from './AnnouncementBar';
import LanguagePicker from '@/components/LanguagePicker';
import WhatsAppHeader from '@/components/WhatsAppHeader';


export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const count = useCartStore(s => s.count());
  const { user, logout } = useAuthStore();
  const { settings: s } = useSettings();
  const searchRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const [walletBal, setWalletBal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setWalletBal(null); return; }
    API.get('/wallet/me')
      .then(r => { if (!cancelled) setWalletBal(Number(r.data?.balance || 0)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const siteName = s?.siteName || 'NUTROPACT';
  const navLinks = s?.navLinks || [
    { label: 'All Products', href: '/products' },
    { label: 'Our Story', href: '/about' },
    { label: 'Track Order', href: '/track-order' },
    { label: 'Contact Us', href: '/contact' },
  ];

  const headerStyle: any = {
    '--header-bg': s?.headerBg || '#ffffff',
    '--header-text': s?.headerText || '#111111',
    '--header-accent': s?.headerAccent || '#f97316',
    '--header-border': s?.headerBorder || '#e5e5e5',
    '--menu-font-size': `${s?.menuFontSize || 14}px`,
    '--menu-font-weight': s?.menuFontWeight || '500',
    '--menu-text-transform': s?.menuTextTransform || 'uppercase',
    '--menu-gap': `${s?.menuGap || 18}px`,
    '--icon-size': `${s?.iconSize || 21}px`,
    '--logo-width-desktop': `${s?.logoWidthDesktop || 170}px`,
    '--logo-width-mobile': `${s?.logoWidthMobile || 130}px`,
    '--desktop-padding-y': `${s?.headerDesktopPaddingY || 12}px`,
    '--desktop-padding-x': `${s?.headerDesktopPaddingX || 20}px`,
    '--mobile-padding-y': `${s?.headerMobilePaddingY || 10}px`,
    '--mobile-padding-x': `${s?.headerMobilePaddingX || 12}px`,
    '--drawer-bg': s?.mobileDrawerBg || '#2f2f2f',
    '--drawer-text': s?.mobileDrawerText || '#ffffff',
    '--drawer-border': s?.mobileDrawerBorder || '#565656',
    '--drawer-width': `${s?.mobileDrawerWidth || 88}%`,
  };

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!s) return;
    if (s.seoTitle || s.siteName) document.title = s.seoTitle || s.siteName;
    if (s.favicon) {
      let icon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        document.head.appendChild(icon);
      }
      icon.href = s.favicon;
    }
  }, [s]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setSearchOpen(false); setOpenDropdown(null); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
    }
  };

  return (
    <>
      {s?.announcementEnabled && (
        <AnnouncementBar
          messages={
            (Array.isArray((s as any)?.announcementMessages) && (s as any).announcementMessages.length
              ? (s as any).announcementMessages
              : [s?.announcementText]
            ).filter((m: any) => typeof m === 'string' && m.trim())
          }
          intervalSec={Number((s as any)?.announcementInterval) || 4}
          transition={(s as any)?.announcementTransition || 'fade'}
          bg={s?.announcementBg || '#4CAF9A'}
          color={s?.announcementColor || '#ffffff'}
          fontSize={s?.announcementFontSize || 14}
          fontWeight={s?.announcementFontWeight || '500'}
          paddingY={s?.announcementPaddingY || 8}
        />
      )}


      <header data-app-header className="ch-header app-header" style={headerStyle as React.CSSProperties}>
        <div className="ch-main">
          <div className="ch-left">
            <button className="ch-hamburger md-hide" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <span /><span /><span />
            </button>
            <Link href="/" className={`ch-logo ch-logo--${s?.logoPosition || 'left'}`} aria-label={siteName}>
              {s?.logo
                ? <img src={s.logo} alt={siteName} className="ch-logo-img"  loading="lazy" decoding="async"/>
                : <span className="ch-logo-text">{siteName}</span>
              }
            </Link>
          </div>

          <nav className={`ch-nav ch-nav--${s?.menuPosition || 'center'} desktop-only`}>
            <ul className="ch-menu">
              {navLinks.map((link: any, i: number) => (
                <li key={i} className="ch-menu-item"
                  onMouseEnter={() => link.children?.length && setOpenDropdown(link.label)}
                  onMouseLeave={() => setOpenDropdown(null)}>
                  {link.children?.length ? (
                    <>
                      <button className="ch-menu-link ch-menu-btn">
                        <span>{link.label}</span>
                        <svg className="ch-caret" viewBox="0 0 16 10"><path d="M2 2.25L8 7.75L14 2.25" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      {openDropdown === link.label && (
                        <div className="ch-dropdown">
                          <ul>
                            {link.children.map((child: any, j: number) => (
                              <li key={j}><Link href={child.href} className="ch-dropdown-link" onClick={() => setOpenDropdown(null)}>{child.label}</Link></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <Link href={link.href} className="ch-menu-link">{link.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="ch-actions">
            {s?.showSearch !== false && (
              <button className="ch-icon-btn" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.8 18.1a7.3 7.3 0 1 1 5.1-2.1l4.1 4.1-1.4 1.4-4.1-4.1a7.2 7.2 0 0 1-3.7.7Zm0-2a5.3 5.3 0 1 0 0-10.6 5.3 5.3 0 0 0 0 10.6Z" /></svg>
              </button>
            )}
            {(() => {
              const here = typeof window !== 'undefined' ? window.location.pathname + window.location.search + window.location.hash : '/';
              const walletHref = user ? '/account#wallet' : `/login?redirect=${encodeURIComponent('/account#wallet')}`;
              const accountHref = user ? '/account' : `/login?redirect=${encodeURIComponent(here)}`;
              return (
                <>
                  <Link href={walletHref} className="ch-icon-btn ch-wallet-btn" aria-label={`Wallet balance ${formatPrice(walletBal || 0)}`} title={user ? `Wallet: ${formatPrice(walletBal || 0)}` : 'Login to view wallet'}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 7H5a1 1 0 1 1 0-2h14V3H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-3 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" /></svg>
                    <span className="ch-wallet-badge">{user ? formatPrice(walletBal || 0) : 'NutroPay'}</span>
                    {(walletBal || 0) > 0 && <span className="ch-wallet-dot" aria-hidden="true" />}
                  </Link>
                  {s?.showAccount !== false && (
                    <Link href={accountHref} className="ch-icon-btn" aria-label="Account">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12.2a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9 11.3h-2v-1.2c0-2.6-2.9-4.6-7-4.6s-7 2-7 4.6v1.2H3v-1.2c0-3.9 3.7-6.6 9-6.6s9 2.7 9 6.6v1.2Z" /></svg>
                    </Link>
                  )}
                </>
              );
            })()}


            <span className="ch-lang-wrap"><LanguagePicker variant="header" /></span>

            <WhatsAppHeader slot="header-left" />
            <WhatsAppHeader slot="header-right" />
            <WhatsAppHeader slot="before-cart" />

            {s?.showCart !== false && (
              <Link href="/cart" className="ch-icon-btn ch-cart-btn" aria-label="Cart">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 22a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm10 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM6.2 6l1 7.2h9.9L18.9 6H6.2Zm12.4 9.2H5.5L3.8 3H1V1h4.5l.4 3h15.6l-2.9 11.2Z" /></svg>
                {s?.showCartCount !== false && count > 0 && <span className="ch-cart-count">{count}</span>}
              </Link>
            )}
          </div>
        </div>

        {searchOpen && (
          <div className="ch-search-bar">
            <form onSubmit={handleSearch} className="ch-search-form">
              <div className="ch-search-field">
                <input ref={searchRef} type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..." />
                <button type="submit" aria-label="Search">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.8 18.1a7.3 7.3 0 1 1 5.1-2.1l4.1 4.1-1.4 1.4-4.1-4.1a7.2 7.2 0 0 1-3.7.7Zm0-2a5.3 5.3 0 1 0 0-10.6 5.3 5.3 0 0 0 0 10.6Z" /></svg>
                </button>
              </div>
              <button type="button" onClick={() => setSearchOpen(false)} className="ch-search-close">Close</button>
            </form>
          </div>
        )}

        {menuOpen && <div className="ch-overlay" onClick={() => setMenuOpen(false)} />}

        <aside className={`ch-drawer ${menuOpen ? 'ch-drawer--open' : ''}`}>
          <div className="ch-drawer-top">
            {s?.showSearch !== false && (
              <form onSubmit={handleSearch} className="ch-mobile-search">
                <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." />
                <button type="submit"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M10.8 18.1a7.3 7.3 0 1 1 5.1-2.1l4.1 4.1-1.4 1.4-4.1-4.1a7.2 7.2 0 0 1-3.7.7Zm0-2a5.3 5.3 0 1 0 0-10.6 5.3 5.3 0 0 0 0 10.6Z" /></svg></button>
              </form>
            )}
            <button onClick={() => setMenuOpen(false)} className="ch-drawer-close" aria-label="Close">×</button>
          </div>
          <nav className="ch-drawer-nav">
            {navLinks.map((link: any, i: number) => (
              <div key={i}>
                {link.children?.length ? (
                  <details className="ch-drawer-details">
                    <summary>
                      <span>{link.label}</span>
                      <svg className="ch-drawer-caret" viewBox="0 0 16 10"><path d="M2 2.25L8 7.75L14 2.25" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </summary>
                    <div className="ch-drawer-sub">
                      {link.children.map((child: any, j: number) => (
                        <Link key={j} href={child.href} onClick={() => setMenuOpen(false)}>{child.label}</Link>
                      ))}
                    </div>
                  </details>
                ) : (
                  <Link href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</Link>
                )}
              </div>
            ))}
            <div className="ch-drawer-lang"><LanguagePicker variant="drawer" /></div>
            {user ? (
              <button onClick={() => { logout(); setMenuOpen(false); }} className="ch-drawer-logout">Logout</button>
            ) : (
              <Link href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search + window.location.hash : '/')}`} onClick={() => setMenuOpen(false)} className="ch-drawer-login">Login / Register</Link>
            )}
          </nav>
        </aside>
      </header>

      <style>{`
        .ch-header { position: sticky; top: 0; z-index: 50; background: var(--header-bg); color: var(--header-text); border-bottom: 1px solid var(--header-border); }
        .ch-main { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px; padding: var(--desktop-padding-y) var(--desktop-padding-x); }
        .ch-left { display: flex; align-items: center; gap: 12px; }
        .ch-logo { display: inline-flex; align-items: center; text-decoration: none; color: var(--header-text); }
        .ch-logo-img { display: block; width: auto; max-width: var(--logo-width-desktop); max-height: 80px; }
        .ch-logo-text { font-size: 22px; font-weight: 900; color: var(--header-accent); letter-spacing: -0.5px; }
        .ch-nav { min-width: 0; }
        .ch-nav--left { justify-self: start; }
        .ch-nav--center { justify-self: center; }
        .ch-nav--right { justify-self: end; }
        .ch-menu { display: flex; align-items: center; gap: var(--menu-gap); padding: 0; margin: 0; list-style: none; }
        .ch-menu-item { position: relative; }
        .ch-menu-link, .ch-menu-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 4px; color: var(--header-text); text-decoration: none; background: transparent; border: 0; font-size: var(--menu-font-size); font-weight: var(--menu-font-weight); text-transform: var(--menu-text-transform); cursor: pointer; white-space: nowrap; transition: color 0.15s; }
        .ch-menu-link:hover, .ch-menu-btn:hover { color: var(--header-accent); }
        .ch-caret { width: 14px; height: 9px; flex-shrink: 0; }
        .ch-dropdown { position: absolute; top: 100%; left: 0; min-width: 200px; background: #fff; border-radius: 8px; box-shadow: 0 16px 40px rgba(0,0,0,0.15); z-index: 30; padding: 6px 0; }
        .ch-dropdown ul { list-style: none; margin: 0; padding: 0; }
        .ch-dropdown-link { display: block; padding: 10px 16px; color: #111; text-decoration: none; font-size: 14px; transition: background 0.15s, color 0.15s; }
        .ch-dropdown-link:hover { background: #f5f5f5; color: var(--header-accent); }
        .ch-actions { display: flex; align-items: center; gap: 12px; justify-self: end; }
        .ch-icon-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; width: var(--icon-size); height: var(--icon-size); border: 0; background: transparent; color: var(--header-text); text-decoration: none; padding: 0; cursor: pointer; transition: color 0.15s; }
        .ch-icon-btn:hover { color: var(--header-accent); }
        .ch-icon-btn svg { width: var(--icon-size); height: var(--icon-size); }
        .ch-cart-count { position: absolute; top: -8px; right: -8px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 999px; background: var(--header-accent); color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .ch-wallet-btn { width: auto !important; padding: 4px 10px 4px 8px !important; gap: 6px; background: color-mix(in srgb, var(--header-accent) 12%, transparent); border-radius: 999px; }
        .ch-wallet-btn:hover { background: color-mix(in srgb, var(--header-accent) 20%, transparent); }
        .ch-wallet-btn svg { width: 16px !important; height: 16px !important; color: var(--header-accent); }
        .ch-wallet-badge { font-size: 12px; font-weight: 800; color: var(--header-accent); line-height: 1; white-space: nowrap; }
        .ch-wallet-dot { position: absolute; top: 2px; right: 2px; width: 8px; height: 8px; border-radius: 999px; background: #ef4444; box-shadow: 0 0 0 2px var(--header-bg); animation: chPulse 1.6s ease-in-out infinite; }
        @keyframes chPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.25); opacity: 0.7; } }
        @media (max-width: 480px) { .ch-wallet-badge { display: none; } .ch-wallet-btn { width: var(--icon-size) !important; padding: 0 !important; border-radius: 999px; } .ch-wallet-btn svg { width: var(--icon-size) !important; height: var(--icon-size) !important; } }
        .ch-search-bar { border-top: 1px solid var(--header-border); background: var(--header-bg); padding: 12px var(--desktop-padding-x); }
        .ch-search-form { display: flex; align-items: center; gap: 12px; max-width: 900px; margin: 0 auto; }
        .ch-search-field { flex: 1; display: grid; grid-template-columns: 1fr 44px; border: 1px solid var(--header-border); overflow: hidden; border-radius: 8px; }
        .ch-search-field input { width: 100%; height: 40px; border: 0; padding: 0 12px; font-size: 14px; outline: none; background: transparent; }
        .ch-search-field button { height: 40px; border: 0; background: var(--header-accent); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .ch-search-close { border: 0; background: transparent; color: var(--header-text); cursor: pointer; font-size: 14px; white-space: nowrap; }
        .ch-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 70; }
        .ch-drawer { position: fixed; top: 0; left: 0; width: min(var(--drawer-width), 420px); height: 100vh; overflow-y: auto; background: var(--drawer-bg); color: var(--drawer-text); box-shadow: 20px 0 40px rgba(0,0,0,0.2); z-index: 80; transform: translateX(-100%); transition: transform 0.3s ease; }
        .ch-drawer--open { transform: translateX(0); }
        .ch-drawer-top { display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--drawer-border); align-items: center; }
        .ch-drawer-close { border: 0; background: transparent; color: var(--drawer-text); font-size: 28px; line-height: 1; padding: 0; cursor: pointer; }
        .ch-mobile-search { display: grid; grid-template-columns: 1fr 38px; background: rgba(255,255,255,0.1); overflow: hidden; border-radius: 6px; }
        .ch-mobile-search input { width: 100%; height: 36px; border: 0; padding: 0 10px; font-size: 13px; outline: none; background: transparent; color: var(--drawer-text); }
        .ch-mobile-search input::placeholder { color: var(--drawer-text); opacity: 0.7; }
        .ch-mobile-search button { display: flex; align-items: center; justify-content: center; width: 38px; height: 36px; border: 0; background: transparent; color: var(--drawer-text); cursor: pointer; }
        .ch-drawer-nav { padding: 0 14px 20px; }
        .ch-drawer-nav > div > a, .ch-drawer-details summary { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; padding: 12px 0; border-bottom: 1px solid var(--drawer-border); text-decoration: none; color: var(--drawer-text); font-size: 15px; font-weight: 700; cursor: pointer; transition: color 0.15s; background: transparent; border-left: 0; border-right: 0; border-top: 0; }
        .ch-drawer-nav > div > a:hover { color: var(--header-accent); }
        .ch-drawer-details { border-bottom: 1px solid var(--drawer-border); }
        .ch-drawer-details summary { border-bottom: 0; list-style: none; }
        .ch-drawer-details summary::-webkit-details-marker { display: none; }
        .ch-drawer-caret { width: 16px; height: 10px; flex-shrink: 0; transition: transform 0.2s; }
        .ch-drawer-details[open] .ch-drawer-caret { transform: rotate(180deg); }
        .ch-drawer-sub { padding-left: 12px; padding-bottom: 8px; }
        .ch-drawer-sub a { display: block; padding: 8px 0; border-bottom: 1px solid var(--drawer-border); text-decoration: none; color: var(--drawer-text); font-size: 14px; opacity: 0.85; }
        .ch-drawer-sub a:hover { opacity: 1; color: var(--header-accent); }
        .ch-drawer-login { display: block; margin-top: 16px; background: var(--header-accent); color: #fff; text-align: center; padding: 12px; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 14px; }
        .ch-drawer-logout { display: block; margin-top: 16px; background: transparent; border: 1px solid var(--drawer-border); color: var(--drawer-text); width: 100%; text-align: center; padding: 10px; border-radius: 50px; font-weight: 600; cursor: pointer; font-size: 14px; }
        .ch-lang-wrap { display: none; }
        @media (min-width: 900px) { .ch-lang-wrap { display: inline-flex; } }
        .ch-drawer-lang { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--drawer-border); }
        .ch-hamburger { display: none; flex-direction: column; justify-content: center; gap: 4px; width: 24px; height: 24px; border: 0; background: transparent; color: var(--header-text); padding: 0; cursor: pointer; }
        .ch-hamburger span { display: block; width: 20px; height: 2px; border-radius: 999px; background: currentColor; }
        .desktop-only { display: flex; }
        .md-hide { display: none; }
        @media (max-width: 768px) {
          .ch-main { grid-template-columns: auto 1fr auto; padding: var(--mobile-padding-y) var(--mobile-padding-x); }
          .desktop-only { display: none !important; }
          .md-hide { display: flex !important; }
          .ch-logo-img { max-width: var(--logo-width-mobile); }
          .ch-logo { position: absolute; left: 50%; transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
}

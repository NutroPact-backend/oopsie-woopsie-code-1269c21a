// @ts-nocheck
/**
 * Capacitor native bridge helpers — all guarded so they are pure no-ops
 * in the browser and during SSR. Safe to call from any client component.
 *
 * We do NOT statically import any @capacitor/* package at module scope
 * because that would pull native shims into the web bundle. Everything
 * is dynamically imported only when running inside a real native shell.
 */

export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
}

export function nativePlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as any).Capacitor;
  const p = cap?.getPlatform?.();
  return p === 'ios' || p === 'android' ? p : 'web';
}

let initDone = false;

/**
 * Initialize native plugins once after first paint. Idempotent + safe on web.
 */
export async function initNative(): Promise<void> {
  if (initDone || !isNative()) return;
  initDone = true;

  try {
    const [{ StatusBar, Style }, { SplashScreen }, { App }, { Keyboard }] = await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
      import('@capacitor/app'),
      import('@capacitor/keyboard'),
    ]);

    // Status bar — light bg, dark icons
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    } catch { /* iOS may reject setBackgroundColor */ }

    // Hide native splash once the web app is interactive
    try { await SplashScreen.hide(); } catch { }

    // Hardware back button → router back, exit if at root
    try {
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else App.exitApp();
      });
    } catch { }

    // Keep keyboard from covering inputs
    try {
      Keyboard.addListener('keyboardWillShow', (info) => {
        document.documentElement.style.setProperty('--kb-height', `${info.keyboardHeight}px`);
      });
      Keyboard.addListener('keyboardWillHide', () => {
        document.documentElement.style.setProperty('--kb-height', '0px');
      });
    } catch { }

    // Tag <html> so CSS can target native shells
    document.documentElement.dataset.native = nativePlatform();
  } catch (err) {
    console.warn('[native] init failed', err);
  }
}

/** Native share sheet with web fallback. */
export async function shareNative(opts: { title?: string; text?: string; url?: string }) {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share(opts);
      return true;
    } catch { /* fallthrough */ }
  }
  if (typeof navigator !== 'undefined' && (navigator as any).share) {
    try { await (navigator as any).share(opts); return true; } catch { return false; }
  }
  return false;
}

/** Light haptic tick (no-op on web). */
export async function tapHaptic() {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { }
}

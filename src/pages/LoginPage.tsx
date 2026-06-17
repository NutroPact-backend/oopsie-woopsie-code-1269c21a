// @ts-nocheck
import { useState } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

import { useAuthStore } from "@/store/authStore";
import { useSettings } from "@/lib/useSettings";
import { requestPhoneOtp, phoneSignIn } from "@/lib/phone-otp.functions";
import TurnstileWidget from "@/components/TurnstileWidget";
import { LOCALES, type LocaleCode } from "@/lib/locales";
import { setLocale, getLocale } from "@/lib/i18n";

type Mode = "password" | "emailOtp" | "phoneOtp";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("password");
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [signupLang, setSignupLang] = useState<LocaleCode>(() => getLocale());
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpCode, setOtpCode] = useState("");
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRequired = !!(import.meta.env.VITE_TURNSTILE_SITE_KEY);
  const { refresh } = useAuthStore();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string; ref?: string };
  // Sanitize redirect: must be a same-origin path (single leading slash, no protocol-relative
  // "//evil.com", no backslash trick, no whitespace). Otherwise fall back to /account.
  const rawRedirect = typeof search.redirect === "string" ? search.redirect : "";
  const safeRedirect =
    /^\/(?![\/\\])[^\s]*$/.test(rawRedirect) ? rawRedirect : "/account";
  const redirectTo = safeRedirect;
  const refCode = (typeof search.ref === "string" ? search.ref : (typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("ref") || sessionStorage.getItem("ref_code") || "") : ""))
    .toString().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (refCode && typeof window !== "undefined") sessionStorage.setItem("ref_code", refCode);

  const reqPhoneOtp = useServerFn(requestPhoneOtp);
  const doPhoneSignIn = useServerFn(phoneSignIn);

  const { settings } = useSettings();
  const auth = (settings?.auth ?? {}) as any;
  const signupEnabled = auth.signupEnabled !== false;
  const emailLoginEnabled = auth.emailLoginEnabled !== false;
  const googleEnabled = auth.googleEnabled !== false;
  const phoneOtpEnabled = !!(auth.phoneLoginEnabled || auth.phoneOtpEnabled);
  const emailOtpEnabled = !!auth.emailMagicLinkEnabled;
  const minPasswordLength = Number(auth.minPasswordLength) || 8;
  const requireTerms = !!auth.requireSignupTerms;
  const signupTermsText: string = auth.signupTermsText || "By creating an account, you agree to our Terms of Service and Privacy Policy.";
  const signupBonusNote: string = auth.signupBonusNote || "";

  const resetMsgs = () => { setError(""); setInfo(""); };

  // ─────── Password (email/password) ───────
  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); resetMsgs();
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        await refresh();
        navigate({ to: redirectTo });
      } else {
        if (!signupEnabled) throw new Error("Sign-ups are currently disabled");
        if (form.password.length < minPasswordLength) throw new Error(`Password must be at least ${minPasswordLength} characters`);
        if (requireTerms && !termsAccepted) throw new Error("Please accept the Terms & Conditions to continue");
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/account`,
            data: { name: form.name, phone: form.phone, preferred_language: signupLang, ...(refCode ? { referral_code: refCode } : {}) },
          },
        });
        if (error) throw error;
        setLocale(signupLang);
        setInfo("Check your inbox to verify your email, then log in.");
        setIsLogin(true);
      }
    } catch (err: any) { setError(err?.message || "Something went wrong"); }
    setLoading(false);
  };

  const handleGoogle = async () => {
    resetMsgs();
    // Direct Supabase OAuth — no Lovable wrapper. Browser redirects to Google,
    // then back to /auth/callback which exchanges the code for a session.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` },
    });
    if (error) setError(error.message || "Google sign-in failed");
  };

  // ─────── Email OTP (Supabase native) ───────
  const sendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); resetMsgs();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: form.email,
        options: { shouldCreateUser: signupEnabled, emailRedirectTo: `${window.location.origin}${redirectTo}` },
      });
      if (error) throw error;
      setInfo("6-digit code bhej diya hai — apna email check karein.");
      setOtpStep("verify");
    } catch (err: any) { setError(err?.message || "Failed to send OTP"); }
    setLoading(false);
  };

  const verifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); resetMsgs();
    try {
      const { error } = await supabase.auth.verifyOtp({ email: form.email, token: otpCode, type: "email" });
      if (error) throw error;
      await refresh();
      navigate({ to: redirectTo });
    } catch (err: any) { setError(err?.message || "Invalid OTP"); }
    setLoading(false);
  };

  // ─────── Phone OTP (custom server fn) ───────
  const sendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (captchaRequired && !captchaToken) { setError("Please complete the security check"); return; }
    setLoading(true); resetMsgs(); setDebugOtp(null);
    try {
      const res = await reqPhoneOtp({ data: { phone: form.phone, captchaToken: captchaToken || undefined } });
      setInfo(res.mode === "test" ? "Test mode: OTP server logs / admin se milegi." : "OTP aapke number par bhej diya gaya hai.");
      if (res.debugOtp) setDebugOtp(res.debugOtp);
      setOtpStep("verify");
    } catch (err: any) { setError(err?.message || "Failed to send OTP"); setCaptchaToken(null); }
    setLoading(false);
  };

  const verifyPhoneOtpFn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); resetMsgs();
    try {
      const res = await doPhoneSignIn({ data: { phone: form.phone, code: otpCode } });
      // Exchange the magiclink token_hash for a session client-side
      const { error } = await supabase.auth.verifyOtp({ token_hash: res.tokenHash, type: "magiclink" });
      if (error) throw error;
      await refresh();
      navigate({ to: redirectTo });
    } catch (err: any) { setError(err?.message || "Verification failed"); }
    setLoading(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m); setOtpStep("request"); setOtpCode(""); setDebugOtp(null); resetMsgs();
  };

  // If currently on register but signups disabled, force back to login
  if (mode === "password" && !isLogin && !signupEnabled) setIsLogin(true);

  const tabBtn = (m: Mode, label: string) => (
    <button type="button" onClick={() => switchMode(m)}
      className={`flex-1 py-2 text-sm font-medium border-b-2 transition ${mode === m ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md">
        <h1 className="text-3xl font-black mb-2">
          {mode === "password" ? (isLogin ? "LOGIN" : "REGISTER") : mode === "emailOtp" ? "EMAIL OTP" : "PHONE OTP"}
        </h1>
        <p className="text-gray-500 mb-6">
          {mode === "password" ? (isLogin ? "Welcome back!" : "Create your account") : "One-time code se sign in karein"}
        </p>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {emailLoginEnabled && tabBtn("password", "Password")}
          {emailOtpEnabled && tabBtn("emailOtp", "Email OTP")}
          {phoneOtpEnabled && tabBtn("phoneOtp", "Phone OTP")}
        </div>

        {/* Google (shown on password mode) */}
        {mode === "password" && googleEnabled && (
          <>
            <button onClick={handleGoogle} type="button"
              className="w-full border border-gray-300 hover:bg-gray-50 rounded-xl py-3 mb-4 flex items-center justify-center gap-2 font-medium transition">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            {emailLoginEnabled && <div className="text-center text-xs text-gray-400 my-3">— or —</div>}
          </>
        )}

        {/* PASSWORD MODE */}
        {mode === "password" && emailLoginEnabled && (
          <form onSubmit={handlePassword} className="space-y-4">
            {!isLogin && (
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full Name" required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition" />
            )}
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email Address" required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition" />
            {!isLogin && (
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone Number"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition" />
            )}
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Preferred language / पसंदीदा भाषा</label>
                <select value={signupLang} onChange={(e) => setSignupLang(e.target.value as LocaleCode)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition bg-white">
                  {LOCALES.map((l) => (
                    <option key={l.code} value={l.code}>{l.native} — {l.english}</option>
                  ))}
                </select>
              </div>
            )}
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={`Password (min ${minPasswordLength})`} required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition" />
            {!isLogin && signupBonusNote && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 text-sm rounded-xl px-3 py-2">
                🎁 {signupBonusNote}
              </div>
            )}
            {!isLogin && refCode && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-3 py-2">
                ✓ Referral code applied: <span className="font-black">{refCode}</span>
              </div>
            )}
            {!isLogin && requireTerms && (
              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-orange-500 shrink-0" />
                <span>
                  I accept the{" "}
                  <button type="button" onClick={() => setShowTerms(!showTerms)} className="text-orange-600 font-bold underline">
                    Terms & Conditions
                  </button>
                </span>
              </label>
            )}
            {!isLogin && requireTerms && showTerms && (
              <div className="bg-gray-50 border rounded-xl p-3 text-xs text-gray-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
                {signupTermsText}
              </div>
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {info && <p className="text-green-600 text-sm">{info}</p>}
            <button type="submit" disabled={loading || (!isLogin && requireTerms && !termsAccepted)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-full font-bold text-lg transition disabled:opacity-50">
              {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
            </button>
            {signupEnabled && (
              <button type="button" onClick={() => { setIsLogin(!isLogin); resetMsgs(); }}
                className="w-full text-center mt-2 text-gray-500 hover:text-gray-700 transition text-sm">
                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            )}
          </form>
        )}

        {/* EMAIL OTP MODE */}
        {mode === "emailOtp" && (
          <form onSubmit={otpStep === "request" ? sendEmailOtp : verifyEmailOtp} className="space-y-4">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email Address" required disabled={otpStep === "verify"}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition disabled:bg-gray-50" />
            {otpStep === "verify" && (
              <input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code" required inputMode="numeric" maxLength={10}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center tracking-widest text-lg focus:outline-none focus:border-orange-500 transition" />
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {info && <p className="text-green-600 text-sm">{info}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-full font-bold text-lg transition disabled:opacity-50">
              {loading ? "Please wait..." : otpStep === "request" ? "Send OTP" : "Verify & Login"}
            </button>
            {otpStep === "verify" && (
              <button type="button" onClick={() => { setOtpStep("request"); setOtpCode(""); resetMsgs(); }}
                className="w-full text-center text-gray-500 hover:text-gray-700 text-sm">← Change email</button>
            )}
          </form>
        )}

        {/* PHONE OTP MODE */}
        {mode === "phoneOtp" && (
          <form onSubmit={otpStep === "request" ? sendPhoneOtp : verifyPhoneOtpFn} className="space-y-4">
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone (e.g. +919876543210)" required disabled={otpStep === "verify"}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition disabled:bg-gray-50" />
            {otpStep === "verify" && (
              <>
                <input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="OTP code" required inputMode="numeric" maxLength={10}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center tracking-widest text-lg focus:outline-none focus:border-orange-500 transition" />
                {debugOtp && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 text-center">
                    Test mode OTP: <span className="font-mono font-bold">{debugOtp}</span>
                  </p>
                )}
              </>
            )}
            {otpStep === "request" && <TurnstileWidget onToken={setCaptchaToken} action="phone_otp" />}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {info && <p className="text-green-600 text-sm">{info}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-full font-bold text-lg transition disabled:opacity-50">
              {loading ? "Please wait..." : otpStep === "request" ? "Send OTP" : "Verify & Login"}
            </button>
            {otpStep === "verify" && (
              <button type="button" onClick={() => { setOtpStep("request"); setOtpCode(""); resetMsgs(); }}
                className="w-full text-center text-gray-500 hover:text-gray-700 text-sm">← Change number</button>
            )}
          </form>
        )}

        {!emailLoginEnabled && mode === "password" && (
          <p className="text-sm text-gray-500 text-center py-4">Email/password sign-in is currently disabled.</p>
        )}
      </div>
    </div>
  );
}

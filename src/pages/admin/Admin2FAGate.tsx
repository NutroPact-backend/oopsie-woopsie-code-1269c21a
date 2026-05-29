// @ts-nocheck
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Mail, KeyRound, LogOut, Loader2 } from "lucide-react";
import {
  request2FAChallenge,
  verify2FAChallenge,
  validate2FASession,
} from "@/lib/security.functions";
import { useAuthStore } from "@/store/authStore";

const TOKEN_KEY = "admin_2fa_token";

export function Admin2FAGate({ children }: { children: React.ReactNode }) {
  const { logout } = useAuthStore();
  const reqChallenge = useServerFn(request2FAChallenge);
  const verify = useServerFn(verify2FAChallenge);
  const validate = useServerFn(validate2FASession);

  const [state, setState] = useState<"checking" | "passed" | "challenge" | "enroll">("checking");
  const [method, setMethod] = useState<"totp" | "email" | null>(null);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"otp" | "backup">("otp");
  const [trust, setTrust] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Try existing token, else request challenge
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          const res = await validate({ data: { token } });
          if (res.valid) { setState("passed"); return; }
          localStorage.removeItem(TOKEN_KEY);
        }
        const ch = await reqChallenge();
        if (!ch.required) { setState("passed"); return; }
        if (!ch.enrolled) { setState("enroll"); return; }
        setMethod(ch.method as any);
        setState("challenge");
      } catch (e: any) {
        setErr(e?.message || "Security check failed");
        setState("challenge");
      }
    })();
  }, []);

  const resend = async () => {
    setErr(""); setLoading(true);
    try {
      const ch = await reqChallenge();
      setMethod((ch.method as any) ?? method);
    } catch (e: any) { setErr(e?.message || "Failed"); }
    setLoading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const res = await verify({ data: { code, kind, trustDevice: trust } });
      if (res.ok && res.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
        setState("passed");
      }
    } catch (e: any) { setErr(e?.message || "Invalid code"); }
    setLoading(false);
  };

  if (state === "passed") return <>{children}</>;

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (state === "enroll") {
    // First-time admin: allow access but flash a banner so they go enroll in Security tab.
    return (
      <>
        <div className="bg-amber-500 text-white text-center text-xs font-bold py-2 px-4">
          ⚠ 2FA is not enabled on your admin account. Go to <strong>System → Security & 2FA</strong> and enroll now to keep this account secure.
        </div>
        {children}
      </>
    );
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
            {method === "email" ? <Mail className="text-orange-500" /> : <ShieldCheck className="text-orange-500" />}
          </div>
          <div>
            <h1 className="text-xl font-black">Verify it's you</h1>
            <p className="text-xs text-gray-500">
              {method === "email" ? "Enter the 6-digit code sent to your email" : "Enter the 6-digit code from your authenticator app"}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={kind === "backup" ? "Backup code" : "6-digit code"}
            inputMode={kind === "backup" ? "text" : "numeric"}
            autoFocus
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center font-mono text-lg tracking-widest focus:border-orange-500 focus:outline-none"
          />
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} />
            Trust this device for 30 days
          </label>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full rounded-full bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Verify & continue"}
          </button>
        </form>

        <div className="flex items-center justify-between mt-5 text-xs">
          <button
            type="button"
            onClick={() => { setKind(kind === "otp" ? "backup" : "otp"); setCode(""); setErr(""); }}
            className="text-orange-600 font-semibold flex items-center gap-1 hover:underline"
          >
            <KeyRound size={12} /> Use {kind === "otp" ? "backup code" : "OTP"}
          </button>
          {method === "email" && kind === "otp" && (
            <button type="button" onClick={resend} disabled={loading} className="text-gray-500 hover:underline">
              Resend email
            </button>
          )}
        </div>

        <button onClick={logout} className="mt-6 w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-red-500">
          <LogOut size={12} /> Cancel & sign out
        </button>
      </div>
    </div>
  );
}

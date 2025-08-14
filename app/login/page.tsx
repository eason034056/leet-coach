"use client";
import React, { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 檢查 URL 中是否有錯誤參數（從 auth callback 傳來的）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, []);

  async function signInOtp() {
    setError(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({ 
      email, 
      options: { 
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined 
      }
    });
    if (error) setError(error.message); else setSent(true);
  }
  async function signInGithub() {
    setError(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'github', 
      options: { 
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined 
      } 
    });
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-xl font-semibold">LeetCoach — Sign in</h1>
        <p className="text-sm text-slate-500 mt-1">Use email magic link or GitHub OAuth.</p>
        <div className="mt-4 space-y-3">
          <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
          <button className="w-full rounded-xl bg-slate-900 text-white px-3 py-2 text-sm" onClick={signInOtp} disabled={!email}>Send magic link</button>
          <div className="text-center text-xs text-slate-400">or</div>
          <button className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-100" onClick={signInGithub}>Continue with GitHub</button>
          {sent && <div className="text-emerald-600 text-sm">Magic link sent. Check your email.</div>}
          {error && <div className="text-rose-600 text-sm">{error}</div>}
        </div>
      </div>
    </div>
  );
}



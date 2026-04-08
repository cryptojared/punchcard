"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (mode === "signup") {
      // Sign up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Create business profile
        const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const { error: bizError } = await supabase.from("businesses").insert({
          id: data.user.id,
          name: businessName,
          slug,
          email,
          owner_id: data.user.id,
        });

        if (bizError) {
          setError("Account created but business profile failed. Contact support.");
          setLoading(false);
          return;
        }

        setSuccess("Account created! Check your email to confirm, then sign in.");
        setMode("signin");
      }
    } else {
      // Sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
      } else {
        window.location.href = "/dashboard";
      }
    }

    setLoading(false);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2.5rem', color: '#78716c', fontSize: '0.9375rem' }}>
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Punchcard
          </Link>

          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.5rem' }}>
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p style={{ color: '#78716c', fontSize: '0.9375rem' }}>
              {mode === "signin"
                ? "Sign in to manage your loyalty cards"
                : "Start your 30-day free trial"}
            </p>
          </div>

          <button onClick={handleGoogle} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginBottom: '1.5rem', gap: '0.75rem' }}>
            <svg style={{ width: '1.25rem', height: '1.25rem' }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, height: '1px', background: '#fde68a' }} />
            <span style={{ fontSize: '0.8125rem', color: '#a8a29e' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#fde68a' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === "signup" && (
              <div>
                <label className="label">Business name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="The Daily Grind"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder={mode === "signup" ? "Create a password (min 8 chars)" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 8 : 1}
              />
            </div>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.875rem', color: '#dc2626' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.875rem', color: '#15803d' }}>
                {success}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', padding: '0.75rem', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}>
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9375rem', color: '#78716c' }}>
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setSuccess(""); }}
              style={{ color: '#d97706', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
            >
              {mode === "signin" ? "Sign up free" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* Right — branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#fffbeb] to-[#fde68a] items-center justify-center p-12">
        <div style={{ maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>
            <svg viewBox="0 0 80 80" style={{ width: '5rem', height: '5rem' }}>
              <rect width="80" height="80" rx="20" fill="#f59e0b"/>
              <text x="40" y="55" textAnchor="middle" fill="white" fontSize="40" fontWeight="bold">P</text>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1c1917', marginBottom: '1rem', lineHeight: 1.2 }}>
            Your customers will love how easy this is.
          </h2>
          <p style={{ fontSize: '1.0625rem', color: '#78716c', lineHeight: 1.6 }}>
            No app downloads. No paper cards. Just scan, punch, and reward. Your regulars will feel like VIPs.
          </p>
        </div>
      </div>
    </div>
  );
}

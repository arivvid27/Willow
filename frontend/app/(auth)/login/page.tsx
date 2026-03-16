"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { Leaf, LogIn } from "lucide-react";
import Link from "next/link";
import GoogleButton from "@/components/GoogleButton";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else router.push("/dashboard");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6"
      style={{ background: "var(--color-bg)" }}>
      <div className="w-full max-w-md animate-fade-up">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--color-accent)" }} aria-hidden="true">
            <Leaf size={20} style={{ color: "var(--color-accent-text)" }} />
          </div>
          <span className="font-display text-2xl font-semibold" style={{ color: "var(--color-accent)" }}>
            Willow
          </span>
        </div>

        <div className="rounded-2xl p-8"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-md)" }}>

          <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: "var(--color-text)" }}>
            Welcome back
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            Sign in to your care team account
          </p>

          {/* Google OAuth */}
          <GoogleButton label="Sign in with Google" />

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--color-text-subtle)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          </div>

          {/* Email + password form */}
          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="input" placeholder="you@example.com"
                aria-describedby={error ? "login-error" : undefined} />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input id="password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="input" placeholder="••••••••" />
            </div>

            {error && (
              <p id="login-error" role="alert" className="text-sm rounded-lg p-3"
                style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-danger)", border: "1px solid rgba(239,68,68,0.3)" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center" aria-busy={loading}>
              <LogIn size={17} aria-hidden="true" />
              {loading ? "Signing in…" : "Sign in with email"}
            </button>
          </form>

          <p className="text-sm mt-5 text-center" style={{ color: "var(--color-text-muted)" }}>
            New to Willow?{" "}
            <Link href="/signup" className="font-medium underline underline-offset-2"
              style={{ color: "var(--color-accent)" }}>Create an account</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

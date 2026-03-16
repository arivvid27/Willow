"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { Leaf, UserPlus } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [childName, setChildName] = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = getSupabase();
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError || !authData.user) { setError(authError?.message ?? "Signup failed"); setLoading(false); return; }
    const userId = authData.user.id;
    const { data: profile, error: profileError } = await supabase
      .from("profiles").insert({ child_name: childName, created_by: userId }).select().single();
    if (profileError) { setError(profileError.message); setLoading(false); return; }
    await supabase.from("caregiver_access").insert({ profile_id: profile.id, user_id: userId, role: "owner" });
    setDone(true); setLoading(false);
  }

  const cardStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    boxShadow: "var(--shadow-md)",
  };

  if (done) return (
    <main className="min-h-dvh flex items-center justify-center p-6" style={{ background: "var(--color-bg)" }}>
      <div className="rounded-2xl p-8 max-w-md w-full text-center animate-fade-up" style={cardStyle}>
        <div className="text-4xl mb-4">&#127807;</div>
        <h1 className="font-display text-2xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>Check your email</h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          We sent a confirmation link to <strong>{email}</strong>. Click it then{" "}
          <Link href="/login" className="underline" style={{ color: "var(--color-accent)" }}>sign in</Link>.
        </p>
      </div>
    </main>
  );

  return (
    <main className="min-h-dvh flex items-center justify-center p-6" style={{ background: "var(--color-bg)" }}>
      <div className="w-full max-w-md animate-fade-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--color-accent)" }}>
            <Leaf size={20} style={{ color: "var(--color-accent-text)" }} />
          </div>
          <span className="font-display text-2xl font-semibold" style={{ color: "var(--color-accent)" }}>Willow</span>
        </div>

        <div className="rounded-2xl p-8" style={cardStyle}>
          <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: "var(--color-text)" }}>
            Create your account
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>Start coordinating care in minutes.</p>

          <form onSubmit={handleSignup} noValidate className="space-y-4">
            <div>
              <label htmlFor="childName" className="label">Care recipient's name</label>
              <input id="childName" type="text" required value={childName}
                onChange={(e) => setChildName(e.target.value)} className="input" placeholder="e.g. Jamie" />
              <p className="text-xs mt-1" style={{ color: "var(--color-text-subtle)" }}>
                The person whose care you are coordinating.
              </p>
            </div>
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input id="password" type="password" autoComplete="new-password" required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="At least 8 characters" />
            </div>
            {error && (
              <p role="alert" className="text-sm rounded-lg p-3"
                style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-danger)", border: "1px solid rgba(239,68,68,0.3)" }}>
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2" aria-busy={loading}>
              <UserPlus size={17} aria-hidden="true" />
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-sm mt-5 text-center" style={{ color: "var(--color-text-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-medium underline underline-offset-2" style={{ color: "var(--color-accent)" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

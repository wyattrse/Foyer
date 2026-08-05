"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      setBusy(false);
      if (error) return setError(error.message);
      setNotice(
        "Account created. If email confirmation is enabled on your Supabase project, check your inbox before signing in.",
      );
      setMode("signin");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#141311] px-4">
      <div className="w-full max-w-sm rounded-lg border border-[#38342A] bg-[#1D1B17] p-6">
        <h1 className="mb-1 text-xl font-medium text-[#F2EEE4]">Foyer</h1>
        <p className="mb-6 text-xs uppercase tracking-wide text-[#9A927E]">
          {mode === "signin" ? "Sign in to your dashboard" : "Create your agent account"}
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-[#9A927E]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-[#38342A] bg-[#242119] px-3 py-2.5 text-sm text-[#F2EEE4] outline-none focus:border-[#C63A2E]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-[#9A927E]">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-[#38342A] bg-[#242119] px-3 py-2.5 text-sm text-[#F2EEE4] outline-none focus:border-[#C63A2E]"
            />
          </div>

          {error && <p className="text-xs text-[#E2543E]">{error}</p>}
          {notice && <p className="text-xs text-[#D9A44E]">{notice}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-[#C63A2E] py-2.5 text-sm font-medium text-[#FBF3EF] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 text-xs text-[#9A927E] hover:text-[#F2EEE4]"
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

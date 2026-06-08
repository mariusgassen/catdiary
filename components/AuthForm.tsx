"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

type OAuthProvider = { id: string; label: string };

const OAUTH_ICONS: Record<string, string> = {
  google: "G",
  apple: "",
  facebook: "f",
};

export function AuthForm({
  mode,
  oauthProviders,
}: {
  mode: "sign-in" | "register";
  oauthProviders: OAuthProvider[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/feed";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, displayName }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error === "EMAIL_TAKEN" ? "That email is already registered." : "Registration failed.");
          return;
        }
      }

      const result = await signIn("credentials", { email, password, redirect: false, callbackUrl });
      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <h1 className="text-xl font-semibold">{mode === "sign-in" ? "Sign in" : "Create your account"}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "register" && (
          <input
            required
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
          />
        )}
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
        />
        <input
          required
          type="password"
          minLength={8}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {mode === "sign-in" ? "Sign in" : "Register"}
        </button>
      </form>

      {oauthProviders.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
            <span className="h-px flex-1 bg-current opacity-20" />
            or continue with
            <span className="h-px flex-1 bg-current opacity-20" />
          </div>
          {oauthProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => signIn(provider.id, { callbackUrl })}
              className="flex items-center justify-center gap-2 rounded border border-black/15 px-3 py-2 text-sm dark:border-white/20"
            >
              <span aria-hidden>{OAUTH_ICONS[provider.id] ?? "→"}</span>
              Continue with {provider.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

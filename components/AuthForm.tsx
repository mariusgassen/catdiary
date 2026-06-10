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

  const [identifier, setIdentifier] = useState(""); // sign-in: email or username
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const REGISTER_ERRORS: Record<string, string> = {
    EMAIL_TAKEN: "That email is already registered.",
    USERNAME_TAKEN: "That username is taken.",
    INVALID_USERNAME: "Usernames are 3-30 lowercase letters, numbers, dots or underscores.",
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password, displayName }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(REGISTER_ERRORS[data?.error as string] ?? "Registration failed.");
          return;
        }
      }

      const result = await signIn("credentials", {
        identifier: mode === "register" ? email : identifier,
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setError("Invalid credentials.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 rounded-xl border border-border bg-surface px-6 py-7 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight">
        {mode === "sign-in" ? "Open your diary" : "Start your diary"}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "register" && (
          <>
            <input
              required
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
            />
            <input
              required
              placeholder="Username"
              value={username}
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9][a-zA-Z0-9._]*"
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
            />
          </>
        )}
        {mode === "register" ? (
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
          />
        ) : (
          <input
            required
            type="text"
            placeholder="Email or username"
            value={identifier}
            autoCapitalize="none"
            autoCorrect="off"
            onChange={(e) => setIdentifier(e.target.value)}
            className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
          />
        )}
        <input
          required
          type="password"
          minLength={8}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/30 transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {mode === "sign-in" ? "Sign in" : "Register"}
        </button>
      </form>

      {oauthProviders.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            or continue with
            <span className="h-px flex-1 bg-border" />
          </div>
          {oauthProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => signIn(provider.id, { callbackUrl })}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-accent/40"
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

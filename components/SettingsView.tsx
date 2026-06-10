"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { ChevronLeft, Loader2, LogOut } from "lucide-react";
import { InviteFriends } from "@/components/InviteFriends";
import { ThemeToggle } from "@/components/ThemeToggle";

type SettingsUser = {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  isPrivate: boolean;
};

const PROFILE_ERRORS: Record<string, string> = {
  USERNAME_TAKEN: "That username is taken.",
  INVALID_USERNAME: "Usernames are 3-30 lowercase letters, numbers, dots or underscores.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-3 rounded-xl border border-border bg-surface px-4 py-4 shadow-sm">
      <h2 className="pb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsView({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [username, setUsername] = useState(user.username ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [isPrivate, setIsPrivate] = useState(user.isPrivate);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setError(null);
    setProfileSaved(false);
    const nextUsername = username.trim().toLowerCase();
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          bio: bio.trim() || null,
          // The handle can be changed but not removed — only send it when set.
          ...(nextUsername && nextUsername !== user.username ? { username: nextUsername } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(PROFILE_ERRORS[data?.error as string] ?? "Could not save your profile.");
        return;
      }
      setProfileSaved(true);
      router.refresh();
    } catch {
      setError("Could not save your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function togglePrivate() {
    const next = !isPrivate;
    setIsPrivate(next);
    setError(null);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrivate: next }),
    });
    if (!res.ok) {
      setIsPrivate(!next);
      setError("Could not update your privacy setting.");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="flex items-center gap-2 px-4">
        <Link
          href={`/profile/${user.id}`}
          className="p-1.5 -m-1.5 text-muted hover:text-foreground transition-colors"
          aria-label="Back to my diary"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
      </header>

      <Section title="Profile">
        <form onSubmit={saveProfile} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted">Username</span>
            <div className="flex items-center rounded-xl border border-border bg-background focus-within:ring-1 focus-within:ring-accent">
              <span className="pl-3 text-sm text-muted select-none">@</span>
              <input
                required={user.username != null}
                value={username}
                minLength={3}
                maxLength={30}
                pattern="[a-z0-9][a-z0-9._]*"
                autoCapitalize="none"
                autoCorrect="off"
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="min-w-0 flex-1 bg-transparent py-2.5 pl-0.5 pr-3 text-sm outline-none"
              />
            </div>
            <span className="text-xs text-muted">
              Your handle — used to sign in and shown when you have no display name.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted">Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              placeholder={username ? `@${username}` : "How you appear to others"}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="A line about you and the cats you meet…"
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingProfile}
              className="self-start rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/30 transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {savingProfile ? <Loader2 size={16} className="animate-spin" /> : "Save"}
            </button>
            {profileSaved && <span className="text-xs text-muted">Saved</span>}
          </div>
        </form>
      </Section>

      <Section title="Privacy">
        <button
          onClick={togglePrivate}
          role="switch"
          aria-checked={isPrivate}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium">Private diary</span>
            <span className="block text-xs text-muted">
              Only approved readers can see your entries.
            </span>
          </span>
          <span
            aria-hidden
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              isPrivate ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                isPrivate ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </Section>

      <Section title="Invite friends">
        <InviteFriends />
      </Section>

      <Section title="Appearance">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Theme</span>
          <ThemeToggle />
        </div>
      </Section>

      <Section title="Account">
        <dl className="flex flex-col gap-2 pb-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Email</dt>
            <dd className="truncate font-medium">{user.email}</dd>
          </div>
        </dl>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-accent/40"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </Section>

      {error && <p className="px-4 text-sm text-red-500">{error}</p>}
    </div>
  );
}

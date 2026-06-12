"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { signOut, useSession } from "next-auth/react";
import { Camera, ChevronLeft, Loader2, LogOut, Bell, BellOff, Trash2 } from "lucide-react";
import { InviteFriends } from "@/components/InviteFriends";
import { ThemeToggle } from "@/components/ThemeToggle";
import { displayNameFor } from "@/lib/userDisplay";

type SettingsUser = {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  isPrivate: boolean;
  avatarKey: string | null;
  image: string | null;
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyFollows: boolean;
  notifyMentions: boolean;
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
  const { update: updateSession } = useSession();
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [username, setUsername] = useState(user.username ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [isPrivate, setIsPrivate] = useState(user.isPrivate);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [avatarKey, setAvatarKey] = useState(user.avatarKey);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Notification prefs
  const [notifyLikes, setNotifyLikes] = useState(user.notifyLikes);
  const [notifyComments, setNotifyComments] = useState(user.notifyComments);
  const [notifyFollows, setNotifyFollows] = useState(user.notifyFollows);
  const [notifyMentions, setNotifyMentions] = useState(user.notifyMentions);

  // Web push subscription state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPushSupported(true);
    // Check if already subscribed
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(!!sub);
    });
    // Fetch VAPID public key
    fetch("/api/push-subscriptions").then(async (res) => {
      if (res.ok) {
        const data = (await res.json()) as { vapidPublicKey: string | null };
        setVapidKey(data.vapidPublicKey);
      }
    });
  }, []);

  const avatarSrc = avatarKey
    ? `/api/photos/${avatarKey}`
    : user.image ?? null;

  const initials = (displayNameFor(user)[0] ?? "?").toUpperCase();

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body: formData });
      if (!res.ok) {
        setAvatarError("Could not upload photo.");
        return;
      }
      const { avatarKey: newKey } = await res.json() as { avatarKey: string };
      setAvatarKey(newKey);
      await updateSession({ avatarKey: newKey });
      router.refresh();
    } catch {
      setAvatarError("Could not upload photo.");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const res = await fetch("/api/avatar", { method: "DELETE" });
      if (!res.ok) {
        setAvatarError("Could not remove photo.");
        return;
      }
      setAvatarKey(null);
      await updateSession({ avatarKey: null });
      router.refresh();
    } catch {
      setAvatarError("Could not remove photo.");
    } finally {
      setAvatarUploading(false);
    }
  }

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

  async function toggleNotifPref(
    key: "notifyLikes" | "notifyComments" | "notifyFollows" | "notifyMentions",
    current: boolean,
    setter: (v: boolean) => void,
  ) {
    const next = !current;
    setter(next);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    });
    if (!res.ok) setter(current);
  }

  async function deleteAccount() {
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      if (!res.ok) {
        setError("Could not delete your account.");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Could not delete your account.");
    } finally {
      setDeletingAccount(false);
    }
  }

  async function togglePush() {
    if (!pushSupported || !vapidKey) return;
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push-subscriptions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
        const raw = sub.toJSON() as { endpoint: string; keys?: { p256dh: string; auth: string } };
        await fetch("/api/push-subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: raw.endpoint, keys: raw.keys }),
        });
        setPushEnabled(true);
      }
    } catch {
      // permission denied or push registration failed — swallow silently
    } finally {
      setPushLoading(false);
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
        {/* Avatar upload */}
        <div className="flex items-center gap-3 pb-4">
          <div className="relative">
            <label htmlFor="avatar-input" className="cursor-pointer block">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="Your avatar"
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center text-accent text-2xl font-semibold ring-2 ring-border select-none">
                  {initials}
                </div>
              )}
              <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-sm pointer-events-none">
                <Camera size={11} />
              </span>
            </label>
            <input
              ref={avatarInputRef}
              id="avatar-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleAvatarChange}
              disabled={avatarUploading}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-medium">Profile photo</span>
            {avatarUploading ? (
              <span className="flex items-center gap-1 text-xs text-muted">
                <Loader2 size={11} className="animate-spin" /> Uploading…
              </span>
            ) : avatarError ? (
              <span className="text-xs text-red-500">{avatarError}</span>
            ) : (
              <span className="text-xs text-muted">Tap to change</span>
            )}
          </div>
          {avatarKey && !avatarUploading && (
            <button
              type="button"
              onClick={removeAvatar}
              className="shrink-0 text-xs text-muted transition-colors hover:text-red-500"
            >
              Remove
            </button>
          )}
        </div>
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

      <Section title="Notifications">
        <div className="flex flex-col gap-3">
          {(
            [
              { key: "notifyLikes", label: "Paws (likes)", desc: "When someone paws your entry", value: notifyLikes, setter: setNotifyLikes },
              { key: "notifyComments", label: "Notes & replies", desc: "When someone comments or replies", value: notifyComments, setter: setNotifyComments },
              { key: "notifyFollows", label: "New readers", desc: "When someone starts following you", value: notifyFollows, setter: setNotifyFollows },
              { key: "notifyMentions", label: "Mentions", desc: "When someone @mentions you", value: notifyMentions, setter: setNotifyMentions },
            ] as const
          ).map(({ key, label, desc, value, setter }) => (
            <button
              key={key}
              onClick={() => void toggleNotifPref(key, value, setter as (v: boolean) => void)}
              role="switch"
              aria-checked={value}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted">{desc}</span>
              </span>
              <span
                aria-hidden
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  value ? "bg-accent" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                    value ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          ))}

          {pushSupported && vapidKey && (
            <button
              onClick={() => void togglePush()}
              disabled={pushLoading}
              className="flex w-full items-center justify-between gap-3 text-left disabled:opacity-50"
            >
              <span className="min-w-0 flex items-center gap-2">
                {pushEnabled ? <Bell size={16} className="text-accent shrink-0" /> : <BellOff size={16} className="text-muted shrink-0" />}
                <span>
                  <span className="block text-sm font-medium">Push notifications</span>
                  <span className="block text-xs text-muted">
                    {pushEnabled ? "Enabled on this device" : "Get alerts even when the app is closed"}
                  </span>
                </span>
              </span>
              {pushLoading ? (
                <Loader2 size={16} className="animate-spin text-muted shrink-0" />
              ) : (
                <span
                  aria-hidden
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    pushEnabled ? "bg-accent" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                      pushEnabled ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </span>
              )}
            </button>
          )}
        </div>
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

      <Section title="Danger zone">
        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:border-red-400 dark:border-red-900 dark:text-red-400"
          >
            <Trash2 size={15} />
            Delete account
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground/80">
              This permanently deletes your account, diary, and all entries. There is no undo.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void deleteAccount()}
                disabled={deletingAccount}
                className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
              >
                {deletingAccount ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete everything
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Section>

      {error && <p className="px-4 text-sm text-red-500">{error}</p>}
    </div>
  );
}

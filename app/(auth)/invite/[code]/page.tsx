import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getInviterByCode } from "@/lib/invites";
import { displayNameFor } from "@/lib/userDisplay";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const inviter = await getInviterByCode(code);
  if (!inviter) {
    return { title: "Cat Diary" };
  }

  const name = displayNameFor(inviter);
  const title = `${name} invited you to Cat Diary`;
  const description = `Join Cat Diary, a field journal for the cats you meet, and read along with ${name}'s diary.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  const [session, inviter] = await Promise.all([auth(), getInviterByCode(code)]);

  // Already journaling — the invitation resolves to the inviter's diary.
  if (session?.user?.id) {
    redirect(inviter ? `/profile/${inviter.id}` : "/feed");
  }

  if (!inviter) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-5 rounded-xl border border-border bg-surface px-6 py-7 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">This invitation has wandered off</h1>
        <p className="text-sm text-muted">
          The invite link doesn&rsquo;t match any diary — it may have been mistyped. You can still
          start a diary of your own.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/register"
            className="rounded-xl bg-accent px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm shadow-accent/30 transition-transform active:scale-[0.98]"
          >
            Start your diary
          </Link>
          <Link
            href="/sign-in"
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-sm transition-colors hover:border-accent/40"
          >
            I already have one — sign in
          </Link>
        </div>
      </div>
    );
  }

  const name = displayNameFor(inviter);
  const entryCount = inviter._count.catEntries;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-5 rounded-xl border border-border bg-surface px-6 py-7 shadow-sm">
      <span className="stamp self-start px-2 py-0.5 text-[11px] font-semibold text-accent">
        Invitation
      </span>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{name} invited you to Cat Diary</h1>
        <p className="pt-2 text-sm text-muted">
          A field journal for the cats you meet — photograph them, note where they crossed your
          path, and read along with friends.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
        {inviter.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={inviter.image} alt={name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-base font-semibold text-accent select-none">
            {name[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}&rsquo;s Diary</p>
          <p className="text-xs text-muted">
            {entryCount} {entryCount === 1 ? "entry" : "entries"}
            {inviter.username && ` · @${inviter.username}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href={`/register?invite=${encodeURIComponent(code)}`}
          className="rounded-xl bg-accent px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm shadow-accent/30 transition-transform active:scale-[0.98]"
        >
          Start your diary
        </Link>
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent(`/profile/${inviter.id}`)}`}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-sm transition-colors hover:border-accent/40"
        >
          I already have one — sign in
        </Link>
      </div>

      <p className="text-xs text-muted">
        Join with this link and you&rsquo;ll follow {name}&rsquo;s diary from day one.
      </p>
    </div>
  );
}

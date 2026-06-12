import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getInviterByCode } from "@/lib/invites";
import { displayNameFor } from "@/lib/userDisplay";
import { possessiveDiaryEn, possessiveDiaryDe, possessiveDiaryTitleEn, possessiveDiaryTitleDe } from "@/lib/possessiveDiary";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const locale = await getLocale();
  const inviter = await getInviterByCode(code);
  if (!inviter) {
    return { title: "Cat Diary" };
  }

  const name = displayNameFor(inviter);
  const possessiveDiary =
    locale === "de"
      ? possessiveDiaryDe(name)
      : possessiveDiaryEn(name);
  const title = `${name} invited you to Cat Diary`;
  const description = `Join Cat Diary, a field journal for the cats you meet, and track ${possessiveDiary}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  const locale = await getLocale();
  const [session, inviter] = await Promise.all([auth(), getInviterByCode(code)]);
  const t = await getTranslations("invite.landing");

  // Already journaling — the invitation resolves to the inviter's diary.
  if (session?.user?.id) {
    redirect(inviter ? `/profile/${inviter.id}` : "/feed");
  }

  if (!inviter) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-5 rounded-xl border border-border bg-surface px-6 py-7 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">{t("invalidTitle")}</h1>
        <p className="text-sm text-muted">
          {t("invalidDescription")}
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/register"
            className="rounded-xl bg-accent px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm shadow-accent/30 transition-transform active:scale-[0.98]"
          >
            {t("startDiary")}
          </Link>
          <Link
            href="/sign-in"
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-sm transition-colors hover:border-accent/40"
          >
            {t("alreadyHave")}
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
        {t("stamp")}
      </span>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("heading", { name })}</h1>
        <p className="pt-2 text-sm text-muted">
          {t("description")}
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
          <p className="truncate text-sm font-semibold">
            {locale === "de"
              ? possessiveDiaryTitleDe(name)
              : possessiveDiaryTitleEn(name)}
          </p>
          <p className="text-xs text-muted">
            {t("entryCount", { count: entryCount })}
            {inviter.username && ` · @${inviter.username}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href={`/register?invite=${encodeURIComponent(code)}`}
          className="rounded-xl bg-accent px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm shadow-accent/30 transition-transform active:scale-[0.98]"
        >
          {t("startDiary")}
        </Link>
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent(`/profile/${inviter.id}`)}`}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-sm transition-colors hover:border-accent/40"
        >
          {t("alreadyHave")}
        </Link>
      </div>

      <p className="text-xs text-muted">
        {t("footerText", {
          name: locale === "de"
            ? possessiveDiaryDe(name)
            : possessiveDiaryEn(name)
        })}
      </p>
    </div>
  );
}

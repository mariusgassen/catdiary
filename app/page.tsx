import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, MapPin, PawPrint, PenLine, Users } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/feed");
  }

  const t = await getTranslations("home");
  const locale = await getLocale();

  const STAMP_DATE = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" });

  const STEPS = [
    { icon: Camera, titleKey: "steps.snap.title" as const, textKey: "steps.snap.text" as const },
    { icon: PenLine, titleKey: "steps.note.title" as const, textKey: "steps.note.text" as const },
    { icon: Users, titleKey: "steps.track.title" as const, textKey: "steps.track.text" as const },
  ];

  /* A static replica of a feed entry card, so visitors see what a diary
     page looks like before signing up. */
  function SampleEntry() {
    return (
      <article
        className="w-full max-w-sm rotate-[-1deg] rounded-xl border border-border bg-surface px-4 pt-3.5 pb-3 shadow-sm"
        aria-label="Example diary entry"
      >
        <div className="flex items-center justify-between gap-3 pb-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 select-none items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
              A
            </span>
            <span className="truncate text-sm font-semibold">amélie&rsquo;s diary</span>
          </span>
          <span className="stamp px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            {STAMP_DATE.format(new Date())}
          </span>
        </div>

        <figure className="relative mx-auto mb-3 mt-2 w-[88%] rotate-1">
          <div className="relative bg-white p-2 pb-2.5 shadow-md dark:bg-[#efe8da]">
            <span className="tape-strip" aria-hidden />
            <div className="flex aspect-square w-full select-none items-center justify-center bg-accent-soft text-7xl">
              🐱
            </div>
            <figcaption className="pt-1.5 text-center text-sm font-medium leading-none text-[#3a3128]">
              Miso <span className="font-normal text-[#8a7d6b]">· tabby</span>
            </figcaption>
          </div>
        </figure>

        <p className="pb-2.5 text-[15px] leading-relaxed">
          Found her sunbathing outside the bakery again. Accepted exactly one chin
          scratch, then went back to supervising the street.{" "}
          <span className="text-accent">#loafmode</span>
        </p>

        <div className="flex items-center justify-between border-t border-dashed border-border pt-2 text-muted">
          <p className="flex min-w-0 items-center gap-1 text-xs">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">Alfama, Lisbon</span>
          </p>
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-accent">
            <PawPrint size={16} strokeWidth={1.75} fill="currentColor" />
            12
          </span>
        </div>
      </article>
    );
  }

  return (
    <main className="paper-grid flex-1 overflow-x-hidden px-6 pb-24 pt-16">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-12">
        <header className="flex flex-col items-center gap-3 text-center">
          <PawPrint size={36} className="text-accent" aria-hidden />
          <h1 className="text-4xl font-bold tracking-tight">Cat Diary</h1>
          <p className="text-lg text-muted">{t("tagline")}</p>
        </header>

        <div className="flex flex-col items-center gap-5 text-center">
          <p className="max-w-md text-foreground/75">{t("intro")}</p>
          <div className="flex gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md shadow-accent/30 transition-transform active:scale-95"
            >
              {t("startDiary")}
            </Link>
            <Link
              href="/sign-in"
              className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold transition-colors hover:border-accent/40"
            >
              {t("signIn")}
            </Link>
          </div>
          <p className="text-xs text-muted">{t("free")}</p>
        </div>

        <SampleEntry />

        <section className="flex w-full flex-col gap-6" aria-label={t("howItWorks")}>
          <h2 className="text-center text-sm font-semibold uppercase tracking-[0.08em] text-muted">
            {t("howItWorks")}
          </h2>
          <ol className="flex flex-col gap-5">
            {STEPS.map(({ icon: Icon, titleKey, textKey }) => (
              <li key={titleKey} className="flex gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon size={18} aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold">{t(titleKey)}</h3>
                  <p className="text-sm leading-relaxed text-foreground/75">{t(textKey)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-foreground/75">{t("nextCat")}</p>
          <Link
            href="/register"
            className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-md shadow-accent/30 transition-transform active:scale-95"
          >
            {t("startDiary")}
          </Link>
        </div>
      </div>
    </main>
  );
}

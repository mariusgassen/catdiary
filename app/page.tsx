import Link from "next/link";
import { redirect } from "next/navigation";
import { PawPrint } from "lucide-react";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/feed");
  }

  return (
    <main className="paper-grid flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="space-y-3">
        <PawPrint size={36} className="mx-auto text-accent" aria-hidden />
        <h1 className="font-display text-4xl font-semibold tracking-tight">Cat Diary</h1>
        <p className="font-display text-lg italic text-muted">A field journal for every cat you meet</p>
      </div>
      <p className="max-w-md text-foreground/75">
        Snap a photo, pin the location, jot a note — and keep a diary of every
        cat that&apos;s crossed your path. Follow other cat lovers and read
        their diaries too.
      </p>
      <div className="flex gap-3">
        <Link
          href="/register"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/30 transition-transform active:scale-95"
        >
          Start your diary
        </Link>
        <Link
          href="/sign-in"
          className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold transition-colors hover:border-accent/40"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}

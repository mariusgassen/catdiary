import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/feed");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold">🐱 Cat Diary</h1>
      <p className="max-w-md text-black/70 dark:text-white/70">
        Collect cats you&apos;ve met all around the world. Snap a photo, pin the
        location, and build a diary of every cat you&apos;ve crossed paths
        with — then follow other cat lovers to browse theirs too.
      </p>
      <div className="flex gap-3">
        <Link href="/register" className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black">
          Get started
        </Link>
        <Link href="/sign-in" className="rounded border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/20">
          Sign in
        </Link>
      </div>
    </main>
  );
}

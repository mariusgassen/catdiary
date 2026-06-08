"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function NavBar() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/feed" className="font-semibold">
          🐱 Cat Diary
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/feed">Feed</Link>
          <Link href="/cat-entries/new">Log a cat</Link>
          <Link href="/map">Map</Link>
          {session?.user && (
            <Link href={`/profile/${session.user.id}`}>Profile</Link>
          )}
          {session?.user ? (
            <button onClick={() => signOut({ callbackUrl: "/sign-in" })} className="text-left">
              Sign out
            </button>
          ) : (
            <Link href="/sign-in">Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  );
}

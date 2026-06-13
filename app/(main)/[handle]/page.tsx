import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { displayNameFor } from "@/lib/userDisplay";

type Props = { params: Promise<{ handle: string }> };

async function resolveHandle(rawHandle: string) {
  // Next.js does not decode special characters in app-router dynamic params,
  // so `/@username` arrives here as `%40username` (the `@` percent-encoded).
  // Decode before stripping the leading `@`, otherwise the lookup never
  // matches and every linked handle 404s. (vercel/next.js#48058)
  let decoded = rawHandle;
  try {
    decoded = decodeURIComponent(rawHandle);
  } catch {
    // Malformed escape sequence — fall back to the raw value.
  }
  const handle = decoded.replace(/^@/, "").toLowerCase();
  return db.user.findFirst({
    where: { username: { equals: handle, mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarKey: true,
      image: true,
      _count: { select: { catEntries: true } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const user = await resolveHandle(handle);
  if (!user) return { title: "Cat Diary" };

  const name = displayNameFor(user);
  const title = `${name}'s Diary — Cat Diary`;
  const description =
    user.bio ??
    `${name} has logged ${user._count.catEntries} ${user._count.catEntries === 1 ? "cat" : "cats"}.`;
  const avatarUrl = user.avatarKey ? `/api/photos/${user.avatarKey}` : (user.image ?? undefined);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(avatarUrl ? { images: [{ url: avatarUrl }] } : {}),
    },
  };
}

export default async function HandlePage({ params }: Props) {
  const { handle } = await params;
  const user = await resolveHandle(handle);
  if (!user) notFound();
  redirect(`/profile/${user.id}`);
}

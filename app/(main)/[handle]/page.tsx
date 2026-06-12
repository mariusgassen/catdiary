import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { displayNameFor } from "@/lib/userDisplay";

type Props = { params: Promise<{ handle: string }> };

async function resolveHandle(rawHandle: string) {
  const handle = rawHandle.replace(/^@/, "").toLowerCase();
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

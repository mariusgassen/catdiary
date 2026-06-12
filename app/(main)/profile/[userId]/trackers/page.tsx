import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listFollowers } from "@/lib/follows";
import { displayNameFor } from "@/lib/userDisplay";

export default async function TrackersPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const t = await getTranslations("follows");

  const profileUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, displayName: true, isPrivate: true },
  });
  if (!profileUser) notFound();

  const isOwnProfile = viewerId === profileUser.id;

  if (profileUser.isPrivate && !isOwnProfile) {
    if (!viewerId) notFound();
    const follow = await db.follow.findUnique({
      where: { followerId_followeeId: { followerId: viewerId, followeeId: profileUser.id } },
      select: { approved: true },
    });
    if (!follow?.approved) notFound();
  }

  const trackers = await listFollowers(profileUser.id);
  const name = displayNameFor(profileUser);

  return (
    <div className="paper-grid min-h-dvh flex flex-col gap-4 py-4">
      <header className="mx-3 flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 shadow-sm">
        <Link href={`/profile/${userId}`} className="text-lg text-muted transition-colors hover:text-foreground">
          ←
        </Link>
        <h1 className="text-lg font-bold tracking-tight">
          {t("trackersHeading", { name })}{" "}
          <span className="text-base font-normal text-muted">({trackers.length})</span>
        </h1>
      </header>

      {trackers.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted">
          {t("noTrackers")}
        </p>
      ) : (
        <ul className="mx-3 flex flex-col gap-2">
          {trackers.map(({ follower }) => {
            const followerName = displayNameFor(follower);
            return (
              <li key={follower.id}>
                <Link
                  href={`/profile/${follower.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/30"
                >
                  <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {followerName[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{followerName}</p>
                    {follower.username && (
                      <p className="text-xs text-muted">@{follower.username}</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

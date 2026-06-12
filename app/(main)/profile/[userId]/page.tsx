import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCatEntriesForViewer } from "@/lib/catEntries";
import { photoUrlsFor } from "@/lib/photo-urls";
import {
  listPendingFollowRequests,
  listPendingOutgoing,
  getFollowCounts,
  getFollowStatus,
} from "@/lib/follows";
import { CatEntryCard } from "@/components/CatEntryCard";
import { CatEntryGridCard } from "@/components/CatEntryGridCard";
import { ProfileViewToggle } from "@/components/ProfileViewToggle";
import { FollowButton } from "@/components/FollowButton";
import { FollowRequestRow } from "@/components/FollowRequestRow";
import { PendingOutgoingRow } from "@/components/PendingOutgoingRow";
import { displayNameFor } from "@/lib/userDisplay";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      displayName: true,
      bio: true,
      avatarKey: true,
      image: true,
      _count: { select: { catEntries: true } },
    },
  });
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
      ...(avatarUrl ? { images: [{ url: avatarUrl }] }  : {}),
    },
  };
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { userId } = await params;
  const { view: rawView } = await searchParams;
  const view: "list" | "grid" = rawView === "grid" ? "grid" : "list";
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const profileUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, displayName: true, bio: true, isPrivate: true, avatarKey: true, image: true },
  });
  if (!profileUser) {
    notFound();
  }

  const isOwnProfile = viewerId === profileUser.id;

  const [{ entries }, followStatus, followCounts, incomingRequests, outgoingRequests] =
    await Promise.all([
      listCatEntriesForViewer({ viewerId, ownerId: profileUser.id }),
      viewerId && !isOwnProfile
        ? getFollowStatus(viewerId, profileUser.id)
        : Promise.resolve("not-tracking" as const),
      getFollowCounts(profileUser.id),
      isOwnProfile ? listPendingFollowRequests(profileUser.id) : Promise.resolve([]),
      isOwnProfile && viewerId ? listPendingOutgoing(viewerId) : Promise.resolve([]),
    ]);

  const withPhotos = entries.map((entry) => ({
    ...entry,
    photoUrls: photoUrlsFor(entry.photos),
  }));

  const name = displayNameFor(profileUser);

  return (
    <div className="paper-grid min-h-dvh flex flex-col gap-5 py-4">
      {/* Diary cover */}
      <header className="mx-3 rounded-xl border border-border bg-surface px-5 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-1 min-w-0 items-center gap-3">
            {(() => {
              const src = profileUser.avatarKey
                ? `/api/photos/${profileUser.avatarKey}`
                : (profileUser.image ?? null);
              return src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={name} className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-border" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xl font-semibold text-accent ring-2 ring-border select-none">
                  {name[0]?.toUpperCase() ?? "?"}
                </div>
              );
            })()}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight break-words">{name}&rsquo;s Diary</h1>
            <p className="pt-0.5 text-sm text-muted">
              {withPhotos.length} {withPhotos.length === 1 ? "entry" : "entries"}
              {" · "}
              <Link
                href={`/profile/${profileUser.id}/trackers`}
                className="transition-colors hover:text-foreground"
              >
                {followCounts.trackers} {followCounts.trackers === 1 ? "tracker" : "trackers"}
              </Link>
              {" · "}
              <Link
                href={`/profile/${profileUser.id}/tracking`}
                className="transition-colors hover:text-foreground"
              >
                tracking {followCounts.tracking}
              </Link>
              {profileUser.isPrivate && " · private diary"}
            </p>
            {profileUser.bio && <p className="pt-2 text-sm text-foreground/80">{profileUser.bio}</p>}
          </div>
          </div>
          {!isOwnProfile && viewerId && (
            <FollowButton followeeId={profileUser.id} initialStatus={followStatus} />
          )}
          {isOwnProfile && (
            <Link
              href="/settings"
              className="shrink-0 rounded-xl border border-border p-2 text-muted transition-colors hover:text-foreground"
              aria-label="Settings"
            >
              <Settings size={18} />
            </Link>
          )}
        </div>
      </header>

      {/* Incoming track requests (own private profile) */}
      {incomingRequests.length > 0 && (
        <section className="mx-3 flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-sm shadow-sm">
          <h2 className="font-semibold">
            Track requests{" "}
            <span className="text-muted font-normal">({incomingRequests.length})</span>
          </h2>
          {incomingRequests.map((request) => (
            <FollowRequestRow
              key={request.followerId}
              followerId={request.followerId}
              displayName={displayNameFor(request.follower)}
            />
          ))}
        </section>
      )}

      {/* Outgoing pending requests (own profile) */}
      {outgoingRequests.length > 0 && (
        <section className="mx-3 flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-sm shadow-sm">
          <h2 className="font-semibold">
            Pending requests{" "}
            <span className="text-muted font-normal">({outgoingRequests.length})</span>
          </h2>
          {outgoingRequests.map((req) => (
            <PendingOutgoingRow
              key={req.followeeId}
              followeeId={req.followeeId}
              displayName={displayNameFor(req.followee)}
            />
          ))}
        </section>
      )}

      {withPhotos.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted">
          These pages are still blank.
        </p>
      ) : (
        <>
          <div className="flex justify-end px-3">
            <ProfileViewToggle view={view} />
          </div>
          {view === "grid" ? (
            <div className="grid grid-cols-3 gap-2 px-3">
              {withPhotos.map((entry) => (
                <CatEntryGridCard key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {withPhotos.map((entry) => (
                <CatEntryCard key={entry.id} entry={entry} viewerId={viewerId} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

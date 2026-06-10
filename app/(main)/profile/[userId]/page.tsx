import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listCatEntriesForViewer } from "@/lib/catEntries";
import { listPendingFollowRequests } from "@/lib/follows";
import { CatEntryCard } from "@/components/CatEntryCard";
import { FollowButton } from "@/components/FollowButton";
import { FollowRequestRow } from "@/components/FollowRequestRow";

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const profileUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true, bio: true, isPrivate: true },
  });
  if (!profileUser) {
    notFound();
  }

  const isOwnProfile = viewerId === profileUser.id;

  const [{ entries }, isFollowing, pendingRequests] = await Promise.all([
    listCatEntriesForViewer({ viewerId, ownerId: profileUser.id }),
    viewerId && !isOwnProfile
      ? db.follow
          .findUnique({ where: { followerId_followeeId: { followerId: viewerId, followeeId: profileUser.id } } })
          .then((f) => Boolean(f?.approved))
      : Promise.resolve(false),
    isOwnProfile && profileUser.isPrivate ? listPendingFollowRequests(profileUser.id) : Promise.resolve([]),
  ]);

  const withPhotos = entries.map((entry) => ({
    ...entry,
    photoUrl: `/api/photos/${entry.thumbKey ?? entry.photoKey}`,
  }));

  return (
    <div className="paper-grid min-h-dvh flex flex-col gap-5 py-4">
      {/* Diary cover */}
      <header className="mx-3 rounded-xl border border-border bg-surface px-5 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {profileUser.displayName}&rsquo;s Diary
            </h1>
            <p className="pt-0.5 font-display text-sm italic text-muted">
              {withPhotos.length} {withPhotos.length === 1 ? "entry" : "entries"}
              {profileUser.isPrivate && " · private diary"}
            </p>
            {profileUser.bio && <p className="pt-2 text-sm text-foreground/80">{profileUser.bio}</p>}
          </div>
          {!isOwnProfile && viewerId && (
            <FollowButton followeeId={profileUser.id} initiallyFollowing={isFollowing} />
          )}
        </div>
      </header>

      {pendingRequests.length > 0 && (
        <section className="mx-3 flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-sm shadow-sm">
          <h2 className="font-display font-semibold">Waiting to read along</h2>
          {pendingRequests.map((request) => (
            <FollowRequestRow
              key={request.followerId}
              followerId={request.followerId}
              displayName={request.follower.displayName}
            />
          ))}
        </section>
      )}

      {withPhotos.length === 0 ? (
        <p className="px-6 py-10 text-center font-display italic text-muted">
          These pages are still blank.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {withPhotos.map((entry) => (
            <CatEntryCard key={entry.id} entry={entry} viewerId={viewerId} />
          ))}
        </div>
      )}
    </div>
  );
}

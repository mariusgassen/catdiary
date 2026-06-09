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
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{profileUser.displayName}</h1>
          {profileUser.bio && <p className="text-sm text-black/70 dark:text-white/70">{profileUser.bio}</p>}
          {profileUser.isPrivate && <p className="text-xs text-black/50 dark:text-white/50">Private profile</p>}
        </div>
        {!isOwnProfile && viewerId && (
          <FollowButton followeeId={profileUser.id} initiallyFollowing={isFollowing} />
        )}
      </header>

      {pendingRequests.length > 0 && (
        <section className="flex flex-col gap-2 rounded border border-black/10 p-3 text-sm dark:border-white/10">
          <h2 className="font-medium">Follow requests</h2>
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
        <p className="text-black/60 dark:text-white/60">No cats logged here yet.</p>
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

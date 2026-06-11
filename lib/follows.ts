import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function followUser(followerId: string, followeeId: string) {
  if (followerId === followeeId) {
    throw new Error("CANNOT_FOLLOW_SELF");
  }

  const followee = await db.user.findUnique({
    where: { id: followeeId },
    select: { isPrivate: true },
  });
  if (!followee) {
    throw new Error("USER_NOT_FOUND");
  }

  const follow = await db.follow.upsert({
    where: { followerId_followeeId: { followerId, followeeId } },
    update: {},
    create: { followerId, followeeId, approved: !followee.isPrivate },
  });

  void createNotification({ userId: followeeId, actorId: followerId, type: "FOLLOW" });

  return follow;
}

export async function unfollowUser(followerId: string, followeeId: string) {
  await db.follow.deleteMany({ where: { followerId, followeeId } });
}

export async function listFollowing(userId: string) {
  return db.follow.findMany({
    where: { followerId: userId, approved: true },
    include: { followee: { select: { id: true, username: true, displayName: true, image: true, avatarKey: true } } },
  });
}

/** Pending follow requests awaiting approval on `userId`'s (private) profile. */
export async function listPendingFollowRequests(userId: string) {
  return db.follow.findMany({
    where: { followeeId: userId, approved: false },
    include: { follower: { select: { id: true, username: true, displayName: true, image: true, avatarKey: true } } },
  });
}

export async function approveFollowRequest(followeeId: string, followerId: string) {
  await db.follow.update({
    where: { followerId_followeeId: { followerId, followeeId } },
    data: { approved: true },
  });
}

/** Declines (removes) a pending follow request on `followeeId`'s private profile. */
export async function denyFollowRequest(followeeId: string, followerId: string) {
  await db.follow.deleteMany({ where: { followerId, followeeId, approved: false } });
}

export async function listFollowers(userId: string) {
  return db.follow.findMany({
    where: { followeeId: userId, approved: true },
    include: { follower: { select: { id: true, username: true, displayName: true, image: true, avatarKey: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Outgoing follow requests the user has sent that haven't been approved yet. */
export async function listPendingOutgoing(userId: string) {
  return db.follow.findMany({
    where: { followerId: userId, approved: false },
    include: { followee: { select: { id: true, username: true, displayName: true, image: true, avatarKey: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFollowCounts(userId: string) {
  const [trackers, tracking] = await Promise.all([
    db.follow.count({ where: { followeeId: userId, approved: true } }),
    db.follow.count({ where: { followerId: userId, approved: true } }),
  ]);
  return { trackers, tracking };
}

export type FollowStatus = "tracking" | "pending" | "not-tracking";

export async function getFollowStatus(viewerId: string, followeeId: string): Promise<FollowStatus> {
  const follow = await db.follow.findUnique({
    where: { followerId_followeeId: { followerId: viewerId, followeeId } },
    select: { approved: true },
  });
  if (!follow) return "not-tracking";
  return follow.approved ? "tracking" : "pending";
}

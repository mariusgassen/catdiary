import { db } from "@/lib/db";

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

  return db.follow.upsert({
    where: { followerId_followeeId: { followerId, followeeId } },
    update: {},
    create: { followerId, followeeId, approved: !followee.isPrivate },
  });
}

export async function unfollowUser(followerId: string, followeeId: string) {
  await db.follow.deleteMany({ where: { followerId, followeeId } });
}

export async function listFollowing(userId: string) {
  return db.follow.findMany({
    where: { followerId: userId, approved: true },
    include: { followee: { select: { id: true, displayName: true, image: true, avatarKey: true } } },
  });
}

/** Pending follow requests awaiting approval on `userId`'s (private) profile. */
export async function listPendingFollowRequests(userId: string) {
  return db.follow.findMany({
    where: { followeeId: userId, approved: false },
    include: { follower: { select: { id: true, displayName: true, image: true, avatarKey: true } } },
  });
}

export async function approveFollowRequest(followeeId: string, followerId: string) {
  await db.follow.update({
    where: { followerId_followeeId: { followerId, followeeId } },
    data: { approved: true },
  });
}

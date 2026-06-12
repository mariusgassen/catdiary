import { db } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma/client";
import { sendPushToUser } from "@/lib/webpush";
import { displayNameFor } from "@/lib/userDisplay";

export type { NotificationType };

const notificationInclude = {
  actor: {
    select: { id: true, username: true, displayName: true, avatarKey: true, image: true },
  },
  catEntry: {
    select: {
      id: true,
      name: true,
      photos: { where: { position: 0 }, select: { thumbKey: true }, take: 1 },
    },
  },
  comment: { select: { id: true, body: true } },
} as const;

export type NotificationWithDetails = Awaited<ReturnType<typeof listNotifications>>[number];

export type NotificationActor = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarKey: string | null;
  image: string | null;
};

export type GroupedNotification = {
  key: string;
  type: NotificationType;
  catEntryId: string | null;
  actors: NotificationActor[];
  actorCount: number;
  catEntry: { id: string; name: string | null; photos: { thumbKey: string | null }[] } | null;
  latestAt: Date;
  isRead: boolean;
  notificationIds: string[];
  comment: { id: string; body: string } | null;
};

/** Groups flat notifications so likes and follows are summarised ("X and N others…"). */
export function groupNotifications(notifications: NotificationWithDetails[]): GroupedNotification[] {
  // Types that collapse across actors for the same entry
  const GROUPABLE = new Set<NotificationType>(["LIKE", "FOLLOW"]);

  const buckets = new Map<string, GroupedNotification>();

  for (const n of notifications) {
    let bucketKey: string;
    if (GROUPABLE.has(n.type)) {
      // LIKE groups per entry; FOLLOW groups as a single bucket
      bucketKey = n.type === "LIKE" ? `LIKE:${n.catEntryId ?? ""}` : "FOLLOW";
    } else {
      bucketKey = `${n.type}:${n.id}`;
    }

    const existing = buckets.get(bucketKey);
    if (existing) {
      // Only collect up to 3 unique actors for display
      if (!existing.actors.some((a) => a.id === n.actor.id)) {
        if (existing.actors.length < 3) existing.actors.push(n.actor);
        existing.actorCount++;
      }
      existing.notificationIds.push(n.id);
      if (!n.read) existing.isRead = false;
      if (n.createdAt > existing.latestAt) existing.latestAt = n.createdAt;
    } else {
      buckets.set(bucketKey, {
        key: bucketKey,
        type: n.type,
        catEntryId: n.catEntryId,
        actors: [n.actor],
        actorCount: 1,
        catEntry: n.catEntry,
        latestAt: n.createdAt,
        isRead: n.read,
        notificationIds: [n.id],
        comment: n.comment,
      });
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) => b.latestAt.getTime() - a.latestAt.getTime(),
  );
}

export async function listGroupedNotifications(userId: string, limit = 100): Promise<GroupedNotification[]> {
  const raw = await listNotifications(userId, limit);
  return groupNotifications(raw);
}

type NotificationPayload = {
  userId: string;
  id: string;
  catEntryId: string | null;
  type: NotificationType;
  actor: { id: string; username: string | null; displayName: string | null; avatarKey: string | null; image: string | null };
  comment: { id: string; body: string } | null;
};

export async function createNotification(params: {
  userId: string;
  actorId: string;
  type: NotificationType;
  catEntryId?: string;
  commentId?: string;
}) {
  const { userId, actorId, type, catEntryId, commentId } = params;

  if (userId === actorId) return;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { notifyLikes: true, notifyComments: true, notifyFollows: true, notifyMentions: true },
  });
  if (!user) return;

  if (type === "LIKE" && !user.notifyLikes) return;
  if ((type === "COMMENT" || type === "REPLY") && !user.notifyComments) return;
  if (type === "FOLLOW" && !user.notifyFollows) return;
  if (type === "MENTION" && !user.notifyMentions) return;

  // Deduplicate LIKE and FOLLOW notifications
  if (type === "LIKE" && catEntryId) {
    await db.notification.deleteMany({ where: { userId, actorId, type: "LIKE", catEntryId } });
  }
  if (type === "FOLLOW") {
    await db.notification.deleteMany({ where: { userId, actorId, type: "FOLLOW" } });
  }

  const notification = await db.notification.create({
    data: { userId, actorId, type, catEntryId, commentId },
    include: notificationInclude,
  });

  // Fire push notification async — don't await so the caller isn't blocked
  void sendPushNotification(notification as NotificationPayload);

  return notification;
}

async function sendPushNotification(notification: NotificationPayload) {
  const actorName = displayNameFor(notification.actor);
  let body: string;
  switch (notification.type) {
    case "LIKE":
      body = `${actorName} pawed your cat entry`;
      break;
    case "COMMENT":
      body = `${actorName} left a note: ${notification.comment?.body?.slice(0, 80) ?? ""}`;
      break;
    case "REPLY":
      body = `${actorName} replied: ${notification.comment?.body?.slice(0, 80) ?? ""}`;
      break;
    case "FOLLOW":
      body = `${actorName} is now reading your diary`;
      break;
    case "MENTION":
      body = `${actorName} mentioned you`;
      break;
    default:
      return;
  }

  await sendPushToUser(notification.userId, {
    title: "Cat Diary",
    body,
    icon: "/icon-192.png",
    data: {
      notificationId: notification.id,
      catEntryId: notification.catEntryId,
    },
  });
}

export async function listNotifications(userId: string, limit = 30, cursor?: string) {
  return db.notification.findMany({
    where: { userId, ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}) },
    include: notificationInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount(userId: string) {
  return db.notification.count({ where: { userId, read: false } });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await db.notification.updateMany({
    where: { userId, ...(ids ? { id: { in: ids } } : {}) },
    data: { read: true },
  });
}

export async function deleteNotification(userId: string, notificationId: string) {
  await db.notification.deleteMany({ where: { id: notificationId, userId } });
}

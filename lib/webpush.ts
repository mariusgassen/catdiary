import webpush from "web-push";
import { db } from "@/lib/db";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_CONTACT = process.env.VAPID_CONTACT ?? "mailto:admin@example.com";

let configured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export { VAPID_PUBLIC_KEY };

export async function savePushSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function sendPushToUser(userId: string, payload: object) {
  if (!configured) return;

  const subs = await db.pushSubscription.findMany({ where: { userId } });

  await Promise.allSettled(
    subs.map(async (currentSub) => {
      try {
        await webpush.sendNotification(
          { endpoint: currentSub.endpoint, keys: { p256dh: currentSub.p256dh, auth: currentSub.auth } },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        // Remove expired or invalid subscriptions (410 Gone, 404 Not Found)
        if (err && typeof err === "object" && "statusCode" in err) {
          const status = (err as { statusCode: number }).statusCode;
          if (status === 410 || status === 404) {
            await db.pushSubscription.deleteMany({ where: { id: currentSub.id } });
          }
        }
      }
    }),
  );
}

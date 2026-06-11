import { requireUserId } from "@/lib/auth-helpers";
import { listNotifications, markNotificationsRead } from "@/lib/notifications";
import { NotificationsView } from "@/components/NotificationsView";
import { redirect } from "next/navigation";
import { UnauthorizedError } from "@/lib/auth-helpers";

export const metadata = { title: "Notifications — Cat Diary" };

export default async function NotificationsPage() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/sign-in");
    throw err;
  }

  const notifications = await listNotifications(userId, 30);

  // Mark all as read after fetching
  void markNotificationsRead(userId);

  return <NotificationsView initialNotifications={notifications} />;
}

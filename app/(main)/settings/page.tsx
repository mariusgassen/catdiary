import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserSettings } from "@/lib/users";
import { SettingsView } from "@/components/SettingsView";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/sign-in?callbackUrl=/settings");
  }

  const user = await getUserSettings(userId);
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="paper-grid min-h-dvh py-4">
      <SettingsView user={user} />
    </div>
  );
}

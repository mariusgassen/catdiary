import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CatForm } from "@/components/CatForm";

export default async function NewCatPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/cats/new");
  }
  return <CatForm ownerProfileHref={`/profile/${session.user.id}`} />;
}

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOwnedCat } from "@/lib/cats";
import { CatForm } from "@/components/CatForm";

export default async function EditCatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id;
  if (!viewerId) {
    redirect(`/sign-in?callbackUrl=/cats/${id}/edit`);
  }

  const cat = await getOwnedCat(id, viewerId);
  if (!cat) {
    notFound();
  }

  return <CatForm cat={cat} ownerProfileHref={`/profile/${viewerId}`} />;
}

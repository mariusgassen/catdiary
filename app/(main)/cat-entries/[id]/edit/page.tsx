import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOwnedCatEntry } from "@/lib/catEntries";
import { CatEntryEditForm } from "@/components/CatEntryEditForm";

export default async function EditCatEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id;
  if (!viewerId) {
    redirect(`/sign-in?callbackUrl=/cat-entries/${id}/edit`);
  }

  const entry = await getOwnedCatEntry(id, viewerId);
  if (!entry) {
    notFound();
  }

  return <CatEntryEditForm entry={entry} />;
}

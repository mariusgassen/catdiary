import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getOwnedCatEntry } from "@/lib/catEntries";
import { listCatsForProfile } from "@/lib/cats";
import { photoUrlsFor } from "@/lib/photo-urls";
import { CatEntryEditForm } from "@/components/CatEntryEditForm";

export default async function EditCatEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id;
  if (!viewerId) {
    redirect(`/sign-in?callbackUrl=/cat-entries/${id}/edit`);
  }

  const [entry, cats, t] = await Promise.all([
    getOwnedCatEntry(id, viewerId),
    listCatsForProfile(viewerId, viewerId),
    getTranslations("cats"),
  ]);
  if (!entry) {
    notFound();
  }

  const coverUrl = photoUrlsFor(entry.photos)[0] ?? null;

  return (
    <CatEntryEditForm
      entry={entry}
      coverUrl={coverUrl}
      cats={cats.map((c) => ({ id: c.id, name: c.displayName ?? t("untitled") }))}
    />
  );
}

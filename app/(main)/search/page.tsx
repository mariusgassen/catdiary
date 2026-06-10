import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { listCatEntriesForViewer } from "@/lib/catEntries";
import { SearchResults } from "@/components/SearchView";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  let results: Awaited<ReturnType<typeof listCatEntriesForViewer>> | null = null;
  if (q) {
    results = await listCatEntriesForViewer({ viewerId, query: q });
  }

  const withPhotos = results
    ? results.entries.map((entry) => ({
        ...entry,
        photoUrl: `/api/photos/${entry.thumbKey ?? entry.photoKey}`,
      }))
    : null;

  return (
    <Suspense>
      <SearchResults initialQuery={q ?? ""} initialEntries={withPhotos} viewerId={viewerId} />
    </Suspense>
  );
}

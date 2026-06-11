import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { listCatEntriesForViewer } from "@/lib/catEntries";
import { searchUsers } from "@/lib/users";
import { photoUrlsFor } from "@/lib/photo-urls";
import { SearchResults } from "@/components/SearchView";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  let initialResults = null;
  if (q) {
    const [{ entries }, users] = await Promise.all([
      listCatEntriesForViewer({ viewerId, query: q }),
      q.startsWith("#") ? Promise.resolve([]) : searchUsers(q),
    ]);
    initialResults = {
      entries: entries.map((entry) => ({ ...entry, photoUrls: photoUrlsFor(entry.photos) })),
      users,
    };
  }

  return (
    <Suspense>
      <SearchResults initialQuery={q ?? ""} initialResults={initialResults} />
    </Suspense>
  );
}

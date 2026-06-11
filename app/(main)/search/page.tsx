import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { listCatEntriesForViewer, listRandomCatEntries, getTrendingHashtags } from "@/lib/catEntries";
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
  const [randomEntries, searchData, trendingTags] = await Promise.all([
    q ? Promise.resolve([]) : listRandomCatEntries(viewerId),
    q
      ? Promise.all([
          listCatEntriesForViewer({ viewerId, query: q }),
          q.startsWith("#") ? Promise.resolve([]) : searchUsers(q),
        ])
      : Promise.resolve(null),
    q ? Promise.resolve([] as string[]) : getTrendingHashtags(viewerId),
  ]);

  if (searchData) {
    const [{ entries }, users] = searchData;
    initialResults = {
      entries: entries.map((entry) => ({ ...entry, photoUrls: photoUrlsFor(entry.photos) })),
      users,
    };
  }

  const randomForGrid = randomEntries.map((e) => ({
    id: e.id,
    name: e.name,
    breed: e.breed,
    createdAt: e.createdAt,
    photoUrls: photoUrlsFor(e.photos),
  }));

  return (
    <Suspense>
      <SearchResults
        initialQuery={q ?? ""}
        initialResults={initialResults}
        randomEntries={randomForGrid}
        trendingTags={trendingTags}
      />
    </Suspense>
  );
}

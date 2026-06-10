"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { CatEntryCard } from "@/components/CatEntryCard";

type Entry = {
  id: string;
  name: string | null;
  breed: string | null;
  notes: string | null;
  latitude: number;
  longitude: number;
  createdAt: string | Date;
  photoUrl?: string | null;
  owner: { id: string; displayName: string; avatarKey?: string | null; image?: string | null };
  _count?: { likes: number; comments: number };
};

const TRENDING_TAGS = ["#orange", "#kitten", "#stray", "#fluffy", "#tabby", "#blackcat", "#ginger"];

type Props = {
  initialQuery: string;
  initialEntries: Entry[] | null;
  viewerId: string | null;
};

export function SearchResults({ initialQuery, initialEntries, viewerId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [entries, setEntries] = useState<Entry[] | null>(initialEntries);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync query from URL (e.g. when navigating from a hashtag click)
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== query) {
      setQuery(q);
      if (q) doSearch(q);
      else setEntries(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function doSearch(q: string) {
    if (!q.trim()) {
      setEntries(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/cat-entries?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const withPhotos = data.entries.map((e: Entry & { thumbKey?: string; photoKey: string }) => ({
        ...e,
        photoUrl: `/api/photos/${e.thumbKey ?? e.photoKey}`,
      }));
      setEntries(withPhotos);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.replace(val.trim() ? `/search?q=${encodeURIComponent(val.trim())}` : "/search", {
        scroll: false,
      });
      doSearch(val.trim());
    }, 400);
  }

  function clearSearch() {
    setQuery("");
    setEntries(null);
    router.replace("/search", { scroll: false });
    inputRef.current?.focus();
  }

  return (
    <div>
      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5 rounded-full bg-surface border border-border px-4 py-2.5 focus-within:ring-1 focus-within:ring-accent transition-shadow">
          <Search size={16} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="Search cats, #tags, breeds…"
            autoFocus={!initialQuery}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          {loading && <Loader2 size={14} className="animate-spin text-muted shrink-0" />}
          {query && !loading && (
            <button onClick={clearSearch} className="p-0.5 -m-0.5 text-muted hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {entries !== null ? (
        <div>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <span className="text-4xl">🔍</span>
              <p className="font-semibold">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-sm text-muted">Try a different tag or breed name</p>
            </div>
          ) : (
            <>
              <p className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">
                {entries.length} result{entries.length !== 1 ? "s" : ""}
              </p>
              {entries.map((entry) => (
                <CatEntryCard key={entry.id} entry={entry} viewerId={viewerId} />
              ))}
            </>
          )}
        </div>
      ) : (
        /* Empty state — explore */
        <div className="px-4 py-5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Trending tags</p>
          <div className="flex flex-wrap gap-2">
            {TRENDING_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setQuery(tag);
                  router.replace(`/search?q=${encodeURIComponent(tag)}`, { scroll: false });
                  doSearch(tag);
                }}
                className="rounded-full bg-accent-soft text-accent text-sm font-medium px-3.5 py-1.5 hover:bg-accent hover:text-white transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

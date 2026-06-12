"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2, Cat, Users, Lock, ChevronRight, MapPin } from "lucide-react";
import { PolaroidGrid } from "@/components/PolaroidGrid";
import { photoUrlsFor, type EntryPhoto } from "@/lib/photo-urls";
import { displayNameFor } from "@/lib/userDisplay";

type Entry = {
  id: string;
  name: string | null;
  breed: string | null;
  notes: string | null;
  locationName?: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string | Date;
  photoUrls?: string[];
  owner: {
    id: string;
    displayName: string | null;
    username?: string | null;
    avatarKey?: string | null;
    image?: string | null;
  };
  _count?: { likes: number; comments: number };
  likes?: { userId: string }[];
};

export type UserResult = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarKey: string | null;
  image: string | null;
  isPrivate: boolean;
  _count: { catEntries: number };
};

type Results = { entries: Entry[]; users: UserResult[] };

const FALLBACK_TAGS = ["#orange", "#kitten", "#stray", "#fluffy", "#tabby", "#blackcat", "#ginger"];

type NearbyState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "results"; entries: RandomEntry[]; radiusKm: number }
  | { status: "error"; message: string };

function NearbySection() {
  const [state, setState] = useState<NearbyState>({ status: "idle" });

  async function requestNearby() {
    if (!navigator.geolocation) {
      setState({ status: "error", message: "Location not supported on this device" });
      return;
    }
    setState({ status: "locating" });
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      const radiusKm = 5;
      const res = await fetch(`/api/cat-entries/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setState({ status: "results", entries: data.entries, radiusKm });
    } catch (err) {
      const isDenied = err && typeof err === "object" && "code" in err && (err as GeolocationPositionError).code === 1;
      setState({ status: "error", message: isDenied ? "Location access denied" : "Couldn't find nearby cats" });
    }
  }

  if (state.status === "idle") {
    return (
      <div className="px-4 pt-3 pb-1">
        <button
          onClick={requestNearby}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-accent/50 bg-surface text-accent text-sm font-medium px-3.5 py-1.5 hover:bg-accent hover:border-accent hover:text-white transition-colors"
        >
          <MapPin size={14} aria-hidden />
          Cats near you
        </button>
      </div>
    );
  }

  if (state.status === "locating") {
    return (
      <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-sm text-muted">
        <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
        Finding cats nearby…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-sm">
        <span className="text-muted">{state.message}</span>
        <button onClick={requestNearby} className="text-accent underline shrink-0">
          Try again
        </button>
      </div>
    );
  }

  const { entries, radiusKm } = state;
  return (
    <div>
      <p className="px-4 pt-3 pb-0 text-xs font-semibold uppercase tracking-wide text-muted flex items-center gap-1.5">
        <MapPin size={11} aria-hidden />
        {entries.length === 0
          ? `No cats spotted within ${radiusKm} km`
          : `Cats near you · within ${radiusKm} km`}
      </p>
      {entries.length > 0 && <PolaroidGrid entries={entries} />}
    </div>
  );
}

/** Tag searches (#…) are about cats only — no point matching people on them. */
function isTagQuery(q: string) {
  return q.startsWith("#");
}

function UserRow({ user }: { user: UserResult }) {
  const name = displayNameFor(user);
  return (
    <Link
      href={`/profile/${user.id}`}
      className="mx-3 flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-sm transition-transform active:scale-[0.99]"
    >
      {(() => {
        const src = user.avatarKey ? `/api/photos/${user.avatarKey}` : (user.image ?? null);
        return src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent select-none">
            {name[0]?.toUpperCase() ?? "?"}
          </div>
        );
      })()}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}&rsquo;s diary</p>
        <p className="truncate text-xs text-muted">
          {user.username && <span>@{user.username} · </span>}
          {user.isPrivate ? (
            <span className="inline-flex items-center gap-1">
              <Lock size={10} aria-hidden /> Private diary
            </span>
          ) : (
            <span>
              {user._count.catEntries} page{user._count.catEntries !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

function GroupHeader({ icon: Icon, label }: { icon: typeof Cat; label: string }) {
  return (
    <p className="flex items-center gap-1.5 px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">
      <Icon size={13} aria-hidden />
      {label}
    </p>
  );
}

type RandomEntry = {
  id: string;
  name: string | null;
  breed: string | null;
  createdAt: string | Date;
  photoUrls?: string[];
};

export function SearchResults({
  initialQuery,
  initialResults,
  randomEntries = [],
  trendingTags = [],
}: {
  initialQuery: string;
  initialResults: Results | null;
  randomEntries?: RandomEntry[];
  trendingTags?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Results | null>(initialResults);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync query from URL (e.g. when navigating from a hashtag click)
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery(q);
      if (q) doSearch(q);
      else setResults(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function doSearch(q: string) {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const [entriesRes, usersRes] = await Promise.all([
        fetch(`/api/cat-entries?q=${encodeURIComponent(q)}`),
        isTagQuery(q) ? null : fetch(`/api/users?q=${encodeURIComponent(q)}`),
      ]);
      const entriesData = await entriesRes.json();
      const usersData: { users: UserResult[] } = usersRes ? await usersRes.json() : { users: [] };
      const withPhotos = entriesData.entries.map((e: Entry & { photos: EntryPhoto[] }) => ({
        ...e,
        photoUrls: photoUrlsFor(e.photos),
      }));
      setResults({ entries: withPhotos, users: usersData.users });
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
    setResults(null);
    router.replace("/search", { scroll: false });
    inputRef.current?.focus();
  }

  const totalResults = results ? results.entries.length + results.users.length : 0;

  return (
    <div className="paper-grid min-h-dvh">
      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-3 pb-3">
        <h1 className="text-xl font-bold tracking-tight pb-2.5">Discover</h1>
        <div className="flex items-center gap-2.5 rounded-xl bg-surface border border-border px-4 py-2.5 focus-within:ring-1 focus-within:ring-accent transition-shadow">
          <Search size={16} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="Search cats, #tags, breeds, people…"
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

      {/* Results, grouped by type: people first (compact rows), then cats */}
      {results !== null ? (
        <div className="pb-4">
          {totalResults === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <span className="text-4xl">🔍</span>
              <p className="font-semibold">Nothing in the journal for &ldquo;{query}&rdquo;</p>
              <p className="text-sm text-muted">Try a different tag, breed or name</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.users.length > 0 && (
                <section className="space-y-2.5">
                  <GroupHeader icon={Users} label={`People · ${results.users.length}`} />
                  {results.users.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </section>
              )}
              {results.entries.length > 0 && (
                <section>
                  <GroupHeader
                    icon={Cat}
                    label={`Cats · ${results.entries.length} sighting${results.entries.length !== 1 ? "s" : ""}`}
                  />
                  <PolaroidGrid entries={results.entries} />
                </section>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Empty state — explore */
        <div>
          <div className="px-4 pt-5 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Often spotted</p>
            <div className="flex flex-wrap gap-2">
              {(trendingTags.length > 0 ? trendingTags : FALLBACK_TAGS).map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setQuery(tag);
                    router.replace(`/search?q=${encodeURIComponent(tag)}`, { scroll: false });
                    doSearch(tag);
                  }}
                  className="rounded-lg border border-dashed border-accent/50 bg-surface text-accent text-sm font-medium px-3.5 py-1.5 hover:bg-accent hover:border-accent hover:text-white transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <NearbySection />
          {randomEntries.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-0 text-xs font-semibold uppercase tracking-wide text-muted">
                Cats around the world
              </p>
              <PolaroidGrid entries={randomEntries} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

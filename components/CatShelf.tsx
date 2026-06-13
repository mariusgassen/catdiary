import Link from "next/link";
import { Plus, Home } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { CatSummary } from "@/lib/cats";

type CatShelfProps = {
  cats: CatSummary[];
  isOwnProfile: boolean;
};

/**
 * Horizontal shelf of a diary's cat profiles, shown on the profile page. The
 * owner always sees a "New cat" tile; visitors see only the cats themselves.
 * Renders nothing for a visitor when there are no cats to show.
 */
export async function CatShelf({ cats, isOwnProfile }: CatShelfProps) {
  if (cats.length === 0 && !isOwnProfile) return null;
  const t = await getTranslations("cats");

  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-4 text-sm font-semibold text-foreground/80">{t("heading")}</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1">
        {isOwnProfile && (
          <Link
            href="/cats/new"
            className="flex w-16 shrink-0 flex-col items-center gap-1"
            aria-label={t("newCat")}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border text-muted transition-colors hover:text-accent">
              <Plus size={22} />
            </span>
            <span className="w-full truncate text-center text-[11px] text-muted">{t("newCat")}</span>
          </Link>
        )}
        {cats.map((cat) => {
          const cover = cat.coverThumbKey ?? cat.coverPhotoKey;
          const label = cat.displayName ?? t("untitled");
          return (
            <Link key={cat.id} href={`/cats/${cat.id}`} className="flex w-16 shrink-0 flex-col items-center gap-1">
              <span className="relative">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/photos/${cover}`}
                    alt={label}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <span className="flex h-16 w-16 select-none items-center justify-center rounded-full bg-accent-soft text-2xl ring-2 ring-border">
                    🐱
                  </span>
                )}
                {cat.isOwned && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white ring-2 ring-surface">
                    <Home size={11} aria-hidden />
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[11px] text-foreground/80">{label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

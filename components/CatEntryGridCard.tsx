import Link from "next/link";
import { PawPrint } from "lucide-react";
import { DevelopingPhoto } from "@/components/DevelopingPhoto";

type CatEntryGridCardProps = {
  entry: {
    id: string;
    name: string | null;
    photoUrls?: string[];
    _count?: { likes: number };
  };
};

export function CatEntryGridCard({ entry }: CatEntryGridCardProps) {
  const coverUrl = entry.photoUrls?.[0];
  const likeCount = entry._count?.likes ?? 0;

  return (
    <Link href={`/cat-entries/${entry.id}`} className="group block">
      <div className="relative bg-white p-1.5 pb-6 shadow-sm transition-shadow group-hover:shadow-md dark:bg-[#efe8da]">
        {coverUrl ? (
          <DevelopingPhoto
            src={coverUrl}
            alt={entry.name ?? "A cat"}
            loading="lazy"
            frameClassName="aspect-square w-full overflow-hidden"
            imgClassName="h-full w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full select-none items-center justify-center bg-accent-soft text-4xl">
            🐱
          </div>
        )}
        {likeCount > 0 && (
          <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded bg-black/40 px-1 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <PawPrint size={10} fill="currentColor" strokeWidth={0} />
            {likeCount}
          </span>
        )}
        <p className="absolute bottom-1 left-0 right-0 truncate px-1.5 text-center text-[11px] leading-tight text-[#3a3128]">
          {entry.name ?? "A cat"}
        </p>
      </div>
    </Link>
  );
}

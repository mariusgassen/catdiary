type CatEntryCardProps = {
  entry: {
    id: string;
    name: string | null;
    breed: string | null;
    notes: string | null;
    latitude: number;
    longitude: number;
    createdAt: string | Date;
    photoUrl?: string | null;
    owner: { id: string; displayName: string };
    _count?: { likes: number; comments: number };
  };
};

export function CatEntryCard({ entry }: CatEntryCardProps) {
  const date = new Date(entry.createdAt);

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-center justify-between text-sm text-black/60 dark:text-white/60">
        <span>{entry.owner.displayName}</span>
        <time dateTime={date.toISOString()}>{date.toLocaleDateString()}</time>
      </div>

      {entry.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- presigned MinIO URLs expire; next/image caching would fight that
        <img
          src={entry.photoUrl}
          alt={entry.name ?? "A cat"}
          className="aspect-square w-full rounded object-cover"
        />
      )}

      <div className="flex items-baseline gap-2">
        <h3 className="font-medium">{entry.name ?? "Unnamed cat"}</h3>
        {entry.breed && <span className="text-sm text-black/60 dark:text-white/60">{entry.breed}</span>}
      </div>

      {entry.notes && <p className="text-sm">{entry.notes}</p>}

      <p className="text-xs text-black/50 dark:text-white/50">
        {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
      </p>

      {entry._count && (
        <p className="text-xs text-black/50 dark:text-white/50">
          {entry._count.likes} likes · {entry._count.comments} comments
        </p>
      )}
    </article>
  );
}

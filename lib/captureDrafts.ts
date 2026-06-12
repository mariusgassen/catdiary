// Client-side persistent store for in-progress capture flow drafts. Unlike the
// old single-draft localStorage approach (text fields only), this keeps several
// named drafts — including the photo blobs and chosen location — in IndexedDB so
// a half-finished post survives leaving the capture dialogue and can be picked
// up again later. All functions degrade to no-ops when IndexedDB is unavailable
// (e.g. private browsing) rather than throwing.

const DB_NAME = "catdiary";
const STORE = "captureDrafts";
const VERSION = 1;

export type DraftPhoto = { name: string; type: string; blob: Blob };

export type DraftLocation = { name: string; lat: number; lng: number } | null;

export type CaptureDraft = {
  id: string;
  updatedAt: number;
  caption: string;
  catName: string;
  breed: string;
  frameStyle?: string; // chosen journal frame; absent on older drafts
  location: DraftLocation;
  geoDisabled: boolean;
  photos: DraftPhoto[];
};

export type CaptureDraftMeta = {
  id: string;
  updatedAt: number;
  caption: string;
  catName: string;
  breed: string;
  locationName: string | null;
  photoCount: number;
  coverBlob: Blob | null;
};

function available(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

export function newDraftId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function saveDraft(draft: CaptureDraft): Promise<void> {
  if (!available()) return;
  try {
    await run("readwrite", (store) => store.put(draft));
  } catch {
    // storage unavailable — ignore
  }
}

export async function getDraft(id: string): Promise<CaptureDraft | null> {
  if (!available()) return null;
  try {
    const draft = await run<CaptureDraft | undefined>("readonly", (store) => store.get(id));
    return draft ?? null;
  } catch {
    return null;
  }
}

export async function deleteDraft(id: string): Promise<void> {
  if (!available()) return;
  try {
    await run("readwrite", (store) => store.delete(id));
  } catch {
    // ignore
  }
}

export async function listDraftMetas(): Promise<CaptureDraftMeta[]> {
  if (!available()) return [];
  try {
    const all = await run<CaptureDraft[]>("readonly", (store) => store.getAll());
    return all
      .map((d) => ({
        id: d.id,
        updatedAt: d.updatedAt,
        caption: d.caption,
        catName: d.catName,
        breed: d.breed,
        locationName: d.location?.name ?? null,
        photoCount: d.photos.length,
        coverBlob: d.photos[0]?.blob ?? null,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

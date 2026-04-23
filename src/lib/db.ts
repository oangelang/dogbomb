import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "dogbomb";
const DB_VERSION = 1;
const STORE = "dogPhotos";

export interface DogPhoto {
  id: number;
  blob: Blob;           // original photo
  processedBlob?: Blob; // background-removed PNG (set after processing)
  name: string;
  addedAt: number;
}

function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    },
  });
}

export async function saveDogPhotos(files: File[]): Promise<number[]> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");
  const ids = await Promise.all(
    files.map((f) =>
      tx.store.add({ blob: f, name: f.name, addedAt: Date.now() })
    )
  );
  await tx.done;
  return ids as number[];
}

export async function updateDogPhotoProcessed(
  id: number,
  processedBlob: Blob
): Promise<void> {
  const db = await getDB();
  const existing = await db.get(STORE, id);
  if (existing) {
    await db.put(STORE, { ...existing, processedBlob });
  }
}

export async function getDogPhotos(): Promise<DogPhoto[]> {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function deleteDogPhoto(id: number): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

export async function clearDogPhotos(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE);
}

export async function hasDogPhotos(): Promise<boolean> {
  const db = await getDB();
  const count = await db.count(STORE);
  return count > 0;
}

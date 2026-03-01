import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.0.8/dist/dexie.mjs';

export const db = new Dexie('loveos');

db.version(1).stores({
  kv: '&key',
  messages: '&id, date, from, from_id, is_forwarded, has_media, media_type, file_name',
  quotes: '++id, messageId, createdAt, pinned, *tags',
  checkins: '++id, date',
  photos: '++id, createdAt, *tags, takenAt, albumId',
  albums: '++id, createdAt',
  milestones: '++id, date, *tags'
});

export async function getKV(key, fallback = null) {
  const row = await db.kv.get(key);
  return row?.value ?? fallback;
}

export async function setKV(key, value) {
  await db.kv.put({ key, value });
}

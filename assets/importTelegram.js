import { toPlainText, chunk } from './utils.js';

/**
 * @returns {{name: string|null, messages: Array<any>, pinnedIds: Set<number>}}
 */
function normalizeTelegramRoot(root) {
  const name = (root && typeof root === 'object' && 'name' in root) ? String(root.name ?? '') : null;
  const messages = (root && typeof root === 'object' && Array.isArray(root.messages)) ? root.messages : [];
  const pinnedIds = new Set();
  for (const m of messages) {
    if (m && m.type === 'service' && m.action === 'pin_message' && typeof m.message_id === 'number') {
      pinnedIds.add(m.message_id);
    }
  }
  return { name, messages, pinnedIds };
}

function isProbablyTelegram(root) {
  return root && typeof root === 'object' && Array.isArray(root.messages);
}

/**
 * @param {any[]} arr
 * @returns {{name: string|null, messages: any[], pinnedIds: Set<number>}}
 */
function normalizeSimpleArray(arr) {
  const pinnedIds = new Set();
  const messages = arr.filter(x => x && typeof x === 'object');
  return { name: null, messages, pinnedIds };
}

export async function parseChatFile(file) {
  const raw = await file.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    // Иногда люди кидают “почти JSON”. Здесь MVP: покажем ошибку наверху.
    throw new Error('Не удалось распарсить JSON. Лучше всего импортировать Telegram export в формате result.json');
  }

  if (isProbablyTelegram(json)) {
    const { name, messages, pinnedIds } = normalizeTelegramRoot(json);

    const participantsSet = new Set();
    for (const m of messages) {
      if (m && m.type === 'message' && typeof m.from === 'string') participantsSet.add(m.from);
    }
    const participants = Array.from(participantsSet);

    const normalized = [];
    for (const m of messages) {
      if (!m || (m.type !== 'message' && m.type !== 'service')) continue;

      // Пропускаем системные штуки, кроме пинов (пины нам нужны как “якоря”)
      if (m.type === 'service' && !(m.action === 'pin_message')) continue;

      const id = typeof m.id === 'number' ? m.id : undefined;
      if (typeof id !== 'number') continue;

      const from = m.from ?? m.actor ?? 'unknown';
      const from_id = m.from_id ?? m.actor_id ?? null;

      const text = toPlainText(m.text);
      const is_forwarded = Boolean(m.forwarded_from || m.forwarded_from_id);

      const has_media = Boolean(m.photo || m.file || m.media_type);
      const media_type = m.media_type ?? (m.photo ? 'photo' : m.file ? 'file' : null);
      const file_name = m.file_name ?? null;

      // Важно: есть “пустые” сообщения. Оставляем, если есть медиа или пин.
      const pinned = pinnedIds.has(id);
      const hasText = text && String(text).trim().length > 0;
      if (!hasText && !has_media && !pinned) continue;

      normalized.push({
        id,
        type: m.type,
        date: m.date ?? null,
        date_unixtime: m.date_unixtime ?? null,
        from,
        from_id,
        text,
        is_forwarded,
        has_media,
        media_type,
        file_name,
        pinned,
      });
    }

    return {
      format: 'telegram',
      chatName: name,
      participants,
      messages: normalized,
    };
  }

  if (Array.isArray(json)) {
    const { name, messages } = normalizeSimpleArray(json);
    // very small normalization
    const normalized = messages
      .filter((m) => m.type === 'message' || (m.from && m.text))
      .map((m, idx) => ({
        id: m.id ?? (idx + 1),
        type: 'message',
        date: m.date ?? null,
        from: m.from ?? 'unknown',
        from_id: m.from_id ?? null,
        text: String(m.text ?? ''),
        is_forwarded: false,
        has_media: false,
        media_type: null,
        file_name: null,
        pinned: false,
      }));

    const participants = Array.from(new Set(normalized.map(m => m.from))).filter(Boolean);
    return {
      format: 'simple',
      chatName: name,
      participants,
      messages: normalized,
    };
  }

  throw new Error('Неизвестный формат. Ожидаю Telegram export JSON с полем "messages".');
}

/**
 * Bulk-save messages into IndexedDB.
 * @param {import('./db.js').db} db
 * @param {any[]} messages
 */
export async function saveMessages(db, messages, { wipe = true, onProgress = null } = {}) {
  if (wipe) await db.messages.clear();

  // Dexie лучше пережёвывает чанки
  const CHUNK = 800;
  const chunks = chunk(messages, CHUNK);
  let done = 0;

  for (const c of chunks) {
    await db.messages.bulkPut(c);
    done += c.length;
    onProgress && onProgress({ done, total: messages.length });
  }
}

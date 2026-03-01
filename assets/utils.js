export function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso ?? '');
    return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
  } catch {
    return String(iso ?? '');
  }
}

export function uuid() {
  // RFC4122 v4-ish (good enough for local app)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function toPlainText(telegramText) {
  // Telegram export: "text" может быть string или массив объектов/строк
  if (telegramText == null) return '';
  if (typeof telegramText === 'string') return telegramText;
  if (Array.isArray(telegramText)) {
    return telegramText.map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && 'text' in part) return String(part.text ?? '');
      return '';
    }).join('');
  }
  return String(telegramText);
}

export function chunk(array, size) {
  const res = [];
  for (let i = 0; i < array.length; i += size) res.push(array.slice(i, i + size));
  return res;
}

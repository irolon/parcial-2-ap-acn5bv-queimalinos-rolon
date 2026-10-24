const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const PATH_ID = /^\/(?:shorts|embed)\/([^/?#]+)/;

/** Id de video de YouTube (watch, shorts, embed, youtu.be) o `null`. */
export function youTubeId(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('/')[0] || null;
  if (!YOUTUBE_HOSTS.has(parsed.hostname)) return null;
  if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || null;
  return PATH_ID.exec(parsed.pathname)?.[1] ?? null;
}

/** Miniatura de YouTube o `null` si la URL no es de YouTube. */
export function thumbnailUrl(url) {
  const id = youTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** `true` solo para http/https: evita enlaces `javascript:` en el `href`. */
export function isSafeVideoUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

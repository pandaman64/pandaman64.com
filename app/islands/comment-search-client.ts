/**
 * Comment search: Cloudflare `/api/comment-search*` vs Fly FastAPI (`/search`, `/videos/.../search`).
 * See `.cursor/rules/comment-search-changes.mdc` — CF uses channel filter (翠森); Fly does not.
 */

import type { Hit } from "./comment-search-types";
import type { CommentSearchSource } from "./comment-search-url";

export type CommentLine = { offset_sec: number; message: string };

const DEFAULT_FLY_ORIGIN = "https://comment-search.fly.dev";

export function getCommentSearchApiBase(): string {
  const raw = import.meta.env.VITE_COMMENT_SEARCH_API_BASE;
  const trimmed =
    typeof raw === "string" ? raw.trim().replace(/\/+$/, "") : "";
  return trimmed || DEFAULT_FLY_ORIGIN;
}

function defaultThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

function parseHitRow(row: Record<string, unknown>): Hit | null {
  const video_id = typeof row.video_id === "string" ? row.video_id : "";
  if (!video_id) return null;
  const titleRaw = row.title;
  const title =
    typeof titleRaw === "string" && titleRaw.length > 0 ? titleRaw : video_id;
  const vt = row.video_timestamp;
  let video_timestamp: number | null = null;
  if (typeof vt === "number" && Number.isFinite(vt)) video_timestamp = vt;
  else if (typeof vt === "string") {
    const n = Number.parseInt(vt, 10);
    if (Number.isFinite(n)) video_timestamp = n;
  }
  const tu = row.thumbnail_url;
  const thumbnail_url =
    typeof tu === "string" && tu.length > 0 ? tu : defaultThumbnailUrl(video_id);
  const cc = row.comment_count;
  const comment_count =
    typeof cc === "number" && Number.isFinite(cc) ? Math.floor(cc) : 0;
  return {
    video_id,
    title,
    video_timestamp,
    thumbnail_url,
    comment_count,
  };
}

/** Cloudflare `GET /api/comment-search` JSON → `Hit[]`. */
export function normalizeCfListToHits(data: unknown): Hit[] {
  if (!data || typeof data !== "object") return [];
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const out: Hit[] = [];
  for (const row of results) {
    if (!row || typeof row !== "object") continue;
    const h = parseHitRow(row as Record<string, unknown>);
    if (h) out.push(h);
  }
  return out;
}

/** Fly `GET /search` JSON (`videos`) → `Hit[]`. */
export function normalizeFlyListToHits(data: unknown): Hit[] {
  if (!data || typeof data !== "object") return [];
  const videos = (data as { videos?: unknown }).videos;
  if (!Array.isArray(videos)) return [];
  const out: Hit[] = [];
  for (const row of videos) {
    if (!row || typeof row !== "object") continue;
    const v = row as Record<string, unknown>;
    const video_id = typeof v.video_id === "string" ? v.video_id : "";
    if (!video_id) continue;
    const titleRaw = v.title;
    const title =
      typeof titleRaw === "string" && titleRaw.length > 0 ? titleRaw : video_id;
    const rel = v.release_timestamp;
    const ts = v.timestamp;
    let video_timestamp: number | null = null;
    if (typeof rel === "number" && Number.isFinite(rel)) video_timestamp = rel;
    else if (typeof ts === "number" && Number.isFinite(ts)) video_timestamp = ts;
    const thumbRaw = v.thumbnail;
    const thumbnail_url =
      typeof thumbRaw === "string" && thumbRaw.length > 0
        ? thumbRaw
        : defaultThumbnailUrl(video_id);
    const cc = v.comment_count;
    const comment_count =
      typeof cc === "number" && Number.isFinite(cc) ? Math.floor(cc) : 0;
    out.push({
      video_id,
      title,
      video_timestamp,
      thumbnail_url,
      comment_count,
    });
  }
  return out;
}

function parseCfVideoComments(data: unknown): CommentLine[] {
  if (!data || typeof data !== "object") return [];
  const comments = (data as { comments?: unknown }).comments;
  if (!Array.isArray(comments)) return [];
  const out: CommentLine[] = [];
  for (const c of comments) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    const message = typeof o.message === "string" ? o.message : "";
    const os = o.offset_sec;
    let offset_sec = 0;
    if (typeof os === "number" && Number.isFinite(os))
      offset_sec = Math.max(0, Math.floor(os));
    else if (typeof os === "string") {
      const n = Number.parseFloat(os);
      if (Number.isFinite(n)) offset_sec = Math.max(0, Math.floor(n));
    }
    out.push({ offset_sec, message });
  }
  return out;
}

function parseFlyVideoComments(data: unknown): CommentLine[] {
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  const out: CommentLine[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const message = typeof o.message === "string" ? o.message : "";
    const t = o.time_in_seconds;
    let offset_sec = 0;
    if (typeof t === "number" && Number.isFinite(t))
      offset_sec = Math.max(0, Math.floor(t));
    else if (typeof t === "string") {
      const n = Number.parseFloat(t);
      if (Number.isFinite(n)) offset_sec = Math.max(0, Math.floor(n));
    }
    out.push({ offset_sec, message });
  }
  return out;
}

async function fetchJsonOk(
  url: string,
  signal?: AbortSignal
): Promise<unknown> {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** Parallel fetch; first successful JSON wins; aborts the other request. */
async function raceListFetch(q: string): Promise<Hit[]> {
  const params = new URLSearchParams({ q });
  const cfUrl = `/api/comment-search?${params}`;
  const flyUrl = `${getCommentSearchApiBase()}/search?${params}`;
  const ac1 = new AbortController();
  const ac2 = new AbortController();
  try {
    const winner = await Promise.any([
      fetchJsonOk(cfUrl, ac1.signal).then((data) => {
        ac2.abort();
        return { kind: "cf" as const, data };
      }),
      fetchJsonOk(flyUrl, ac2.signal).then((data) => {
        ac1.abort();
        return { kind: "fly" as const, data };
      }),
    ]);
    ac1.abort();
    ac2.abort();
    return winner.kind === "cf"
      ? normalizeCfListToHits(winner.data)
      : normalizeFlyListToHits(winner.data);
  } catch (e) {
    ac1.abort();
    ac2.abort();
    throw e;
  }
}

async function raceVideoFetch(videoId: string, q: string): Promise<CommentLine[]> {
  const params = new URLSearchParams({ video_id: videoId, q });
  const cfUrl = `/api/comment-search/video?${params}`;
  const enc = encodeURIComponent(videoId);
  const flyParams = new URLSearchParams({ q });
  const flyUrl = `${getCommentSearchApiBase()}/videos/${enc}/search?${flyParams}`;
  const ac1 = new AbortController();
  const ac2 = new AbortController();
  try {
    const winner = await Promise.any([
      fetchJsonOk(cfUrl, ac1.signal).then((data) => {
        ac2.abort();
        return { kind: "cf" as const, data };
      }),
      fetchJsonOk(flyUrl, ac2.signal).then((data) => {
        ac1.abort();
        return { kind: "fly" as const, data };
      }),
    ]);
    ac1.abort();
    ac2.abort();
    return winner.kind === "cf"
      ? parseCfVideoComments(winner.data)
      : parseFlyVideoComments(winner.data);
  } catch (e) {
    ac1.abort();
    ac2.abort();
    throw e;
  }
}

export async function fetchCommentSearchList(
  q: string,
  src: CommentSearchSource
): Promise<Hit[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  if (src === "cf") {
    const params = new URLSearchParams({ q: trimmed });
    const data = await fetchJsonOk(`/api/comment-search?${params}`);
    return normalizeCfListToHits(data);
  }
  if (src === "fly") {
    const params = new URLSearchParams({ q: trimmed });
    const data = await fetchJsonOk(
      `${getCommentSearchApiBase()}/search?${params}`
    );
    return normalizeFlyListToHits(data);
  }
  return raceListFetch(trimmed);
}

export async function fetchCommentVideoDetail(
  videoId: string,
  q: string,
  src: CommentSearchSource
): Promise<CommentLine[]> {
  const qt = q.trim();
  if (!qt) return [];

  if (src === "cf") {
    const params = new URLSearchParams({ video_id: videoId, q: qt });
    const data = await fetchJsonOk(`/api/comment-search/video?${params}`);
    return parseCfVideoComments(data);
  }
  if (src === "fly") {
    const params = new URLSearchParams({ q: qt });
    const enc = encodeURIComponent(videoId);
    const data = await fetchJsonOk(
      `${getCommentSearchApiBase()}/videos/${enc}/search?${params}`
    );
    return parseFlyVideoComments(data);
  }
  return raceVideoFetch(videoId, qt);
}

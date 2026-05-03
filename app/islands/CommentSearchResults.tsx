import { useEffect, useRef, useState } from "hono/jsx";

type Hit = {
  video_id: string;
  title: string;
  video_timestamp: number | null;
  thumbnail_url: string;
  comment_count: number;
};

type CommentLine = {
  offset_sec: number;
  message: string;
};

type ListApiBody = { query: string; results: Hit[]; limit?: number };

type VideoApiBody = {
  query: string;
  video_id: string;
  video: {
    title: string;
    video_timestamp: number | null;
    thumbnail_url: string;
  } | null;
  comments: CommentLine[];
  limit: number;
};

type VideoDetailState =
  | { kind: "loading" }
  | { kind: "ok"; comments: CommentLine[] }
  | { kind: "err"; message: string };

function queryFromLocation(): string {
  if (typeof globalThis.window === "undefined") return "";
  return (
    new URLSearchParams(globalThis.window.location.search).get("q")?.trim() ??
    ""
  );
}

function formatVideoDate(unixSeconds: number | null): string {
  if (!unixSeconds) return "日付不明";
  const d = new Date(unixSeconds * 1000);
  if (Number.isNaN(d.getTime())) return "日付不明";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatOffset(offsetSec: number): string {
  const sec = Math.max(0, Math.floor(offsetSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function watchUrlWithT(videoId: string, offsetSec: number): string {
  const t = Math.max(0, Math.floor(offsetSec));
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${t}s`;
}

export default function CommentSearchResults() {
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsByVideo, setDetailsByVideo] = useState<
    Record<string, VideoDetailState>
  >({});
  const loadedDetailKeysRef = useRef<Set<string>>(new Set<string>());

  const effectiveQuery = queryFromLocation();

  useEffect(() => {
    const q = effectiveQuery.trim();
    loadedDetailKeysRef.current!.clear();
    setDetailsByVideo({});
    if (!q) {
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/comment-search?${new URLSearchParams({ q })}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ListApiBody>;
      })
      .then((data) => {
        if (!cancelled) setResults(data.results ?? []);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveQuery]);

  if (!effectiveQuery.trim()) {
    return null;
  }

  if (loading) {
    return (
      <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">検索中…</p>
    );
  }

  if (error) {
    return (
      <p className="mt-8 text-sm text-red-600 dark:text-red-400">
        検索に失敗しました（{error}）。本番の Pages（または{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">
          wrangler pages dev
        </code>{" "}
        ）で API が利用できます。
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
        一致するコメントは見つかりませんでした。
      </p>
    );
  }

  return (
    <ul className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-8 dark:border-zinc-700">
      {results.map((row) => (
        <li key={row.video_id}>
          <details
            className="group rounded-md border border-zinc-200 dark:border-zinc-700"
            onToggle={(e: Event) => {
              const el = e.currentTarget as HTMLDetailsElement;
              if (!el.open) return;
              const q = effectiveQuery.trim();
              const vid = row.video_id;
              const detailKey = `${vid}\t${q}`;
              if (loadedDetailKeysRef.current!.has(detailKey)) return;

              setDetailsByVideo((prev) => {
                const cur = prev[vid];
                if (cur?.kind === "ok" || cur?.kind === "loading") {
                  return prev;
                }
                return { ...prev, [vid]: { kind: "loading" } };
              });

              const params = new URLSearchParams({ video_id: vid, q });
              fetch(`/api/comment-search/video?${params}`)
                .then(async (r) => {
                  if (!r.ok) throw new Error(`HTTP ${r.status}`);
                  return r.json() as Promise<VideoApiBody>;
                })
                .then((data) => {
                  loadedDetailKeysRef.current!.add(detailKey);
                  setDetailsByVideo((prev) => ({
                    ...prev,
                    [vid]: { kind: "ok", comments: data.comments ?? [] },
                  }));
                })
                .catch((err: unknown) => {
                  const msg =
                    err instanceof Error ? err.message : String(err);
                  setDetailsByVideo((prev) => ({
                    ...prev,
                    [vid]: { kind: "err", message: msg },
                  }));
                });
            }}
          >
            <summary className="flex cursor-pointer list-none gap-4 p-2 text-sm transition marker:content-none hover:bg-zinc-100 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden">
              <img
                src={row.thumbnail_url}
                alt=""
                loading="lazy"
                className="h-20 w-36 flex-none rounded object-cover"
              />
              <span className="min-w-0">
                <span className="line-clamp-2 font-medium text-zinc-900 group-open:text-zinc-800 dark:text-zinc-100 dark:group-open:text-zinc-200">
                  {row.title}
                </span>
                <span className="mt-2 block text-xs text-zinc-500 dark:text-zinc-400">
                  {formatVideoDate(row.video_timestamp)} ・一致コメント{" "}
                  {row.comment_count} 件
                </span>
              </span>
            </summary>
            <div className="border-t border-zinc-200 px-2 pb-3 pt-2 text-sm dark:border-zinc-700">
              {(() => {
                const st = detailsByVideo[row.video_id];
                if (!st || st.kind === "loading") {
                  return (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      コメントを読み込み中…
                    </p>
                  );
                }
                if (st.kind === "err") {
                  return (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      読み込みに失敗しました（{st.message}）
                    </p>
                  );
                }
                if (st.comments.length === 0) {
                  return (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      一致する行がありません。
                    </p>
                  );
                }
                return (
                  <ul className="flex flex-col gap-1.5 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {st.comments.map((c, i) => (
                      <li key={`${c.offset_sec}-${i}`}>
                        <a
                          href={watchUrlWithT(row.video_id, c.offset_sec)}
                          className="text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {formatOffset(c.offset_sec)}
                        </a>
                        <span className="font-sans text-zinc-700 dark:text-zinc-300">
                          {" "}
                          {c.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

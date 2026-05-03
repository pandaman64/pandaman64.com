import { useEffect, useState } from "hono/jsx";

type Hit = {
  video_id: string;
  title: string;
  video_timestamp: number | null;
  thumbnail_url: string;
  comment_count: number;
};

type ApiBody = { query: string; results: Hit[]; limit?: number };

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

export default function CommentSearchResults() {
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 静的書き出しではサーバーにクエリが無いため、ブラウザの `location.search` のみ参照する */
  const effectiveQuery = queryFromLocation();

  useEffect(() => {
    const q = effectiveQuery.trim();
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
        return r.json() as Promise<ApiBody>;
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
          <a
            href={`https://www.youtube.com/watch?v=${encodeURIComponent(row.video_id)}`}
            className="group flex gap-4 rounded-md p-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={row.thumbnail_url}
              alt=""
              loading="lazy"
              className="h-20 w-36 flex-none rounded object-cover"
            />
            <span className="min-w-0">
              <span className="line-clamp-2 font-medium text-zinc-900 group-hover:text-zinc-600 dark:text-zinc-100 dark:group-hover:text-zinc-300">
                {row.title}
              </span>
              <span className="mt-2 block text-xs text-zinc-500 dark:text-zinc-400">
                {formatVideoDate(row.video_timestamp)} ・一致コメント {row.comment_count} 件
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

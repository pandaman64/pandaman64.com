import { useEffect, useState } from "hono/jsx";

import CommentSearchResultItem, {
  type Hit,
} from "./CommentSearchResultItem";

type ListApiBody = { query: string; results: Hit[]; limit?: number };

function queryFromLocation(): string {
  if (typeof globalThis.window === "undefined") return "";
  return (
    new URLSearchParams(globalThis.window.location.search).get("q")?.trim() ??
    ""
  );
}

export default function CommentSearchResults() {
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const qTrim = effectiveQuery.trim();

  return (
    <ul className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-8 dark:border-zinc-700">
      {results.map((row) => (
        <li key={`${row.video_id}\t${qTrim}`}>
          <CommentSearchResultItem hit={row} query={effectiveQuery} />
        </li>
      ))}
    </ul>
  );
}

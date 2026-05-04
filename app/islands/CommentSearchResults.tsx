import { useEffect, useState } from "hono/jsx";

import CommentSearchResultItem, {
  type Hit,
} from "./CommentSearchResultItem";
import { queryFromLocation } from "./comment-search-url";

type ListApiBody = { query: string; results: Hit[]; limit?: number };

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

  const sectionClass =
    "mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-700";

  if (loading) {
    return (
      <div className={sectionClass}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">検索中…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={sectionClass}>
        <p className="text-sm text-red-600 dark:text-red-400">
          検索に失敗しました（{error}）。
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={sectionClass}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          一致するコメントは見つかりませんでした。
        </p>
      </div>
    );
  }

  const qTrim = effectiveQuery.trim();

  return (
    <div className={sectionClass}>
      <ul className="flex flex-col gap-3">
        {results.map((row) => (
          <li key={`${row.video_id}\t${qTrim}`}>
            <CommentSearchResultItem hit={row} query={effectiveQuery} />
          </li>
        ))}
      </ul>
    </div>
  );
}

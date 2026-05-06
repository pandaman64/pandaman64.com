import { useRef, useState } from "hono/jsx";

import { fetchCommentVideoDetail } from "./comment-search-client";
import type { Hit } from "./comment-search-types";
import type { CommentSearchSource } from "./comment-search-url";

export type { Hit } from "./comment-search-types";

type CommentLine = {
  offset_sec: number;
  message: string;
};

type VideoDetailState =
  | { kind: "loading" }
  | { kind: "ok"; comments: CommentLine[] }
  | { kind: "err"; message: string };

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

const TIMESTAMP_LINK_LEAD_SEC = 10;

function watchUrlWithT(videoId: string, offsetSec: number): string {
  const t = Math.max(0, Math.floor(offsetSec) - TIMESTAMP_LINK_LEAD_SEC);
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${t}s`;
}

type Props = {
  hit: Hit;
  query: string;
  src: CommentSearchSource;
};

export default function CommentSearchResultItem({ hit, query, src }: Props) {
  const [detail, setDetail] = useState<VideoDetailState | null>(null);
  const fetchedKeyRef = useRef<string | null>(null);
  const inFlightKeyRef = useRef<string | null>(null);

  return (
    <details
      className="group rounded-md border border-zinc-200 dark:border-zinc-700"
      onToggle={(e: Event) => {
        const el = e.currentTarget as HTMLDetailsElement;
        if (!el.open) return;
        const q = query.trim();
        const vid = hit.video_id;
        const detailKey = `${vid}\t${q}\t${src}`;
        if (fetchedKeyRef.current === detailKey) return;
        if (inFlightKeyRef.current === detailKey) return;

        inFlightKeyRef.current = detailKey;
        setDetail({ kind: "loading" });

        fetchCommentVideoDetail(vid, q, src)
          .then((comments) => {
            fetchedKeyRef.current = detailKey;
            setDetail({ kind: "ok", comments });
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            setDetail({ kind: "err", message: msg });
          })
          .finally(() => {
            if (inFlightKeyRef.current === detailKey) {
              inFlightKeyRef.current = null;
            }
          });
      }}
    >
      <summary className="flex cursor-pointer list-none gap-4 p-2 text-sm transition marker:content-none hover:bg-zinc-100 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden">
        <img
          src={hit.thumbnail_url}
          alt=""
          loading="lazy"
          className="h-20 w-36 flex-none rounded object-cover"
        />
        <span className="min-w-0">
          <span className="line-clamp-2 font-medium text-zinc-900 group-open:text-zinc-800 dark:text-zinc-100 dark:group-open:text-zinc-200">
            {hit.title}
          </span>
          <span className="mt-2 block text-xs text-zinc-500 dark:text-zinc-400">
            {formatVideoDate(hit.video_timestamp)} ・一致コメント{" "}
            {hit.comment_count} 件
          </span>
        </span>
      </summary>
      <div className="border-t border-zinc-200 px-2 pb-3 pt-2 text-sm dark:border-zinc-700">
        {(() => {
          const st = detail;
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
                    href={watchUrlWithT(hit.video_id, c.offset_sec)}
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
  );
}

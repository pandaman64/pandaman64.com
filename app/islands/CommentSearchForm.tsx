import { queryFromLocation } from "./comment-search-url";

export default function CommentSearchForm() {
  const effectiveQuery = queryFromLocation();

  return (
    <form className="flex flex-col gap-4" method="get" action="" role="search" aria-label="コメント検索">
      <div className="flex flex-col gap-2">
        <input
          id="q"
          type="search"
          name="q"
          defaultValue={effectiveQuery}
          placeholder="コメントを検索"
          aria-label="キーワード"
          autoComplete="off"
          className="w-full border-b border-zinc-300 bg-transparent py-2 text-base outline-none placeholder:text-zinc-400 focus:border-zinc-600 dark:border-zinc-600 dark:focus:border-zinc-300"
        />
      </div>

      <button
        type="submit"
        className="mt-2 self-start border border-zinc-900 px-5 py-2 text-sm transition hover:bg-zinc-900 hover:text-white dark:border-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
      >
        検索
      </button>
    </form>
  );
}

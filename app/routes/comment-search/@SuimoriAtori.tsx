import { createRoute } from "honox/factory";
import CommentSearchResults from "../../islands/CommentSearchResults";

const CHANNEL = "https://www.youtube.com/@SuimoriAtori";

export default createRoute((c) => {
  const q = c.req.query("q")?.trim() ?? "";

  return c.render(
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-16">
        <header className="mb-10">
          <h1 className="text-lg font-medium tracking-tight">翠森アトリコメント検索</h1>
        </header>

        <form className="flex flex-col gap-4" method="get" action="">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-300" htmlFor="q">
              キーワード
            </label>
            <input
              id="q"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="コメントを検索"
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

        <CommentSearchResults />

        <footer className="mt-auto pt-16 text-sm">
          <a
            href={CHANNEL}
            className="text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube チャンネル
          </a>
        </footer>
      </div>
    </div>,
    { title: "翠森アトリコメント検索" }
  );
});

import { createRoute } from "honox/factory";
import CommentSearchForm from "../../islands/CommentSearchForm";
import CommentSearchResults from "../../islands/CommentSearchResults";

const CHANNEL = "https://www.youtube.com/@SuimoriAtori";

export default createRoute((c) => {
  return c.render(
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 pt-4 pb-8">
        <header className="mb-4">
          <h1 className="text-lg font-medium tracking-tight">翠森アトリコメント検索</h1>
        </header>

        <CommentSearchForm />

        <CommentSearchResults />

        <footer className="mt-auto pt-8 text-sm">
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

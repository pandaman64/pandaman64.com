/** API backend for comment search: Fly (default), Cloudflare Pages Functions, or race. */
export type CommentSearchSource = "fly" | "cf" | "race";

const SRC_VALUES: ReadonlySet<string> = new Set(["fly", "cf", "race"]);

/** Client: current page `?q=`. SSR / static build: always empty. */
export function queryFromLocation(): string {
  if (typeof globalThis.window === "undefined") return "";
  return (
    new URLSearchParams(globalThis.window.location.search).get("q")?.trim() ??
    ""
  );
}

/** Client: `?src=fly|cf|race` (default **fly**). SSR / static build: `fly`. */
export function dataSourceFromLocation(): CommentSearchSource {
  if (typeof globalThis.window === "undefined") return "fly";
  const raw =
    new URLSearchParams(globalThis.window.location.search).get("src")?.trim() ??
    "";
  const lower = raw.toLowerCase();
  if (SRC_VALUES.has(lower)) return lower as CommentSearchSource;
  return "fly";
}

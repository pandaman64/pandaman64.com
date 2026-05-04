/** Client: current page `?q=`. SSR / static build: always empty. */
export function queryFromLocation(): string {
  if (typeof globalThis.window === "undefined") return "";
  return (
    new URLSearchParams(globalThis.window.location.search).get("q")?.trim() ??
    ""
  );
}

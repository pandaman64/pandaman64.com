#!/usr/bin/env bash
# End-to-end checks for comment-search Pages Functions against remote D1.
# Always tears down the preview server and frees PREVIEW_PORT before exit.
#
# Usage (from repo root):
#   ./scripts/comment-search-remote-api-test.sh
# Env:
#   COMMENT_SEARCH_D1_NAME   D1 database name (default: comment-search)
#   COMMENT_SEARCH_TEST_Q    Non-empty search string that returns ≥1 hit (default: こんにちは)
#   PREVIEW_PORT             Local port (default: 8788)
#   SKIP_BUILD=1             Skip `npm run build` if dist/ is already current

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${PREVIEW_PORT:-8788}"
BASE="http://127.0.0.1:${PORT}"
DB="${COMMENT_SEARCH_D1_NAME:-comment-search}"
Q="${COMMENT_SEARCH_TEST_Q:-こんにちは}"
COMPAT_DATE="2026-05-03"

WORKDIR=""
PREVIEW_PID=""
LOG=""

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "error: required command not found: $1" >&2
    exit 1
  }
}

need_cmd curl
need_cmd jq
need_cmd npx

free_port() {
  set +e
  if command -v fuser >/dev/null 2>&1; then
    fuser -k -TERM "${PORT}/tcp" >/dev/null 2>&1
    sleep 0.4
    fuser -k -KILL "${PORT}/tcp" >/dev/null 2>&1
  else
    local p
    while read -r p; do
      [[ -n "${p}" ]] && kill -TERM "${p}" 2>/dev/null
    done < <(ss -tlnp 2>/dev/null | grep -E "127\\.0\\.0\\.1:${PORT}\\s|::1:${PORT}\\s" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)
    sleep 0.4
    while read -r p; do
      [[ -n "${p}" ]] && kill -KILL "${p}" 2>/dev/null
    done < <(ss -tlnp 2>/dev/null | grep -E "127\\.0\\.0\\.1:${PORT}\\s|::1:${PORT}\\s" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)
  fi
  set -e
}

stop_preview() {
  set +e
  if [[ -n "${PREVIEW_PID}" ]] && kill -0 "${PREVIEW_PID}" 2>/dev/null; then
    kill -TERM "${PREVIEW_PID}" 2>/dev/null
    wait "${PREVIEW_PID}" 2>/dev/null
  fi
  free_port
  set -e
}

cleanup() {
  stop_preview
  [[ -n "${WORKDIR}" && -d "${WORKDIR}" ]] && rm -rf "${WORKDIR}"
}

trap cleanup EXIT INT TERM HUP

echo "== Preflight: remote D1 ${DB} (chat_items + videos) =="
npx wrangler d1 execute --remote "${DB}" --json --command "PRAGMA table_list;" \
  | jq -e '.[0].results | map(.name) | (contains(["chat_items"]) and contains(["videos"]))' >/dev/null

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "== npm run build =="
  npm run build
fi
[[ -d dist ]] || {
  echo "error: dist/ missing; run npm run build or unset SKIP_BUILD" >&2
  exit 1
}

WORKDIR="$(mktemp -d)"
LOG="${WORKDIR}/wrangler-pages-dev.log"

echo "== Start wrangler pages dev (port ${PORT}) =="
free_port
npx wrangler pages dev ./dist --compatibility-date="${COMPAT_DATE}" --port "${PORT}" >"${LOG}" 2>&1 &
PREVIEW_PID=$!

for _ in $(seq 1 120); do
  if grep -q "Ready on http" "${LOG}" 2>/dev/null; then
    break
  fi
  if ! kill -0 "${PREVIEW_PID}" 2>/dev/null; then
    echo "error: wrangler exited before Ready" >&2
    cat "${LOG}" >&2
    exit 1
  fi
  sleep 0.5
done

if ! grep -q "Ready on http" "${LOG}" 2>/dev/null; then
  echo "error: timeout waiting for Ready on port ${PORT}" >&2
  exit 1
fi

echo "== Success condition: COMMENT_SEARCH_DB is remote D1 =="
grep -qE 'COMMENT_SEARCH_DB.*remote' "${LOG}" || {
  echo "error: binding gate failed (expected COMMENT_SEARCH_DB ... remote in log)" >&2
  grep -i binding "${LOG}" >&2 || true
  exit 1
}

echo "== GET /api/comment-search (non-empty q) =="
code="$(curl -sS -o "${WORKDIR}/list.json" -w '%{http_code}' -G "${BASE}/api/comment-search" --data-urlencode "q=${Q}")"
[[ "${code}" == "200" ]]
jq -e --arg q "${Q}" '.query == $q' "${WORKDIR}/list.json" >/dev/null
jq -e '.results | type == "array"' "${WORKDIR}/list.json" >/dev/null
jq -e 'all(.results[]?; has("video_id") and has("title") and has("thumbnail_url") and has("comment_count"))' "${WORKDIR}/list.json" >/dev/null

hits="$(jq '.results | length' "${WORKDIR}/list.json")"
if [[ "${hits}" -lt 1 ]]; then
  echo "error: list returned 0 hits for q=${Q}; set COMMENT_SEARCH_TEST_Q to a query with matches" >&2
  exit 1
fi
vid="$(jq -r '.results[0].video_id' "${WORKDIR}/list.json")"

echo "== GET /api/comment-search (empty q) =="
code="$(curl -sS -o "${WORKDIR}/list_empty.json" -w '%{http_code}' -G "${BASE}/api/comment-search" --data-urlencode "q=")"
[[ "${code}" == "200" ]]
jq -e '.query == "" and (.results | length == 0)' "${WORKDIR}/list_empty.json" >/dev/null

echo "== GET /api/comment-search/video (missing video_id) =="
code="$(curl -sS -o "${WORKDIR}/video_missing.json" -w '%{http_code}' -G "${BASE}/api/comment-search/video" --data-urlencode "q=test")"
[[ "${code}" == "400" ]]
jq -e '.error == "video_id is required"' "${WORKDIR}/video_missing.json" >/dev/null

echo "== GET /api/comment-search/video (unknown video_id) =="
code="$(curl -sS -o "${WORKDIR}/video_unknown.json" -w '%{http_code}' -G "${BASE}/api/comment-search/video" \
  --data-urlencode "video_id=__no_such_video_id__" --data-urlencode "q=foo")"
[[ "${code}" == "200" ]]
jq -e '.video == null and (.comments | length == 0)' "${WORKDIR}/video_unknown.json" >/dev/null

echo "== GET /api/comment-search/video (success: comments for first hit) =="
code="$(curl -sS -o "${WORKDIR}/video_ok.json" -w '%{http_code}' -G "${BASE}/api/comment-search/video" \
  --data-urlencode "video_id=${vid}" --data-urlencode "q=${Q}")"
[[ "${code}" == "200" ]] || {
  echo "error: video API expected HTTP 200, got ${code}" >&2
  head -c 4000 "${WORKDIR}/video_ok.json" >&2 || true
  exit 1
}
jq -e --arg v "${vid}" '.video_id == $v' "${WORKDIR}/video_ok.json" >/dev/null
jq -e '.comments | type == "array"' "${WORKDIR}/video_ok.json" >/dev/null
jq -e 'all(.comments[]?; has("offset_sec") and has("message"))' "${WORKDIR}/video_ok.json" >/dev/null

echo "== GET /comment-search/@SuimoriAtori (SSR + client island bootstrap) =="
code="$(curl -sS -o "${WORKDIR}/page.html" -w '%{http_code}' -G "${BASE}/comment-search/@SuimoriAtori" --data-urlencode "q=${Q}")"
[[ "${code}" == "200" ]]
grep -q 'src="/static/client-' "${WORKDIR}/page.html" || {
  echo "error: expected /static/client-*.js in HTML" >&2
  exit 1
}

echo "== All checks passed =="

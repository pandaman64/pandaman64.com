#!/usr/bin/env bash
# Run PRAGMA table_xinfo for every table in a Cloudflare D1 database.
# Usage:
#   ./scripts/d1-table-xinfo-all.sh [database-name]
# Env:
#   D1_LOCAL=1 — omit --remote (use local D1 / wrangler dev binding)

set -euo pipefail

DB_NAME="${1:-comment-search}"
if [[ "${D1_LOCAL:-0}" == "1" ]]; then
  wrangler_d1_flags=()
else
  wrangler_d1_flags=(--remote)
fi

list_json="$(npx wrangler d1 execute "${wrangler_d1_flags[@]}" "$DB_NAME" \
  --command 'PRAGMA table_list;' --json)"

while IFS= read -r table; do
  [[ -z "$table" ]] && continue
  printf '\n======== %s ========\n' "$table"
  npx wrangler d1 execute "${wrangler_d1_flags[@]}" "$DB_NAME" \
    --command "$(printf 'PRAGMA table_xinfo(%s);' "$(jq -rn --arg t "$table" '$t | @json')")" \
    --json | jq '.'
done < <(echo "$list_json" | jq -r '.[0].results[] | select(.type == "table") | .name')

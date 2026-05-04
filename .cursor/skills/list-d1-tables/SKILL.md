---
name: list-d1-tables
description: >-
  Lists D1 tables and column metadata (PRAGMA table_list + table_xinfo for each
  table) by running scripts/d1-table-xinfo-all.sh. Use when the user wants to
  list D1 tables, inspect schema, column types, or local vs remote D1; when
  they mention table_xinfo, PRAGMA table_list, or wrangler d1 execute in this
  project.
---

# List D1 tables

## What it does

The script lists every ordinary table with `PRAGMA table_list` (excluding the internal `_cf_KV` table, which is not queryable via the API), then runs `PRAGMA table_xinfo(<name>);` for each and prints JSON (via `jq`) so you can see columns, types, affinity, hidden flags, and similar metadata in one shot.

## How to run it

From the **repository root** (`pandaman64.com`):

```bash
./scripts/d1-table-xinfo-all.sh [database-name]
```

- **Database name** (optional): defaults to `comment-search` if omitted.
- **Remote vs local**:
  - **Remote** (default): uses `npx wrangler d1 execute --remote …`.
  - **Local**: set `D1_LOCAL=1` so `--remote` is omitted (local binding / `wrangler dev` style).

Examples:

```bash
# Remote D1, default DB name comment-search
./scripts/d1-table-xinfo-all.sh

# Remote D1, explicit database binding name
./scripts/d1-table-xinfo-all.sh my-database

# Local D1 (no --remote)
D1_LOCAL=1 ./scripts/d1-table-xinfo-all.sh comment-search
```

## Prerequisites

- `bash`, `jq`, and `npx` on `PATH`.
- Wrangler / Cloudflare auth configured as needed for `wrangler d1 execute` (remote requires appropriate credentials).

## Agent workflow

1. `cd` to the workspace root if not already there.
2. **Run the script outside the Cursor agent sandbox.** When using a terminal tool that supports it, request **full / non-sandbox** execution (e.g. `required_permissions: ["all"]` or the closest equivalent). Wrangler needs to write under `~/.config/.wrangler/logs/` and talk to the Cloudflare API; a restricted sandbox often fails with `EACCES` on the log file even when `network` is allowed.
3. Run the script with the database name the user cares about (or default).
4. Use `D1_LOCAL=1` when the user explicitly wants local D1 or is debugging without remote.
5. Paste or summarize relevant `table_xinfo` sections from the output; large runs may be truncated in chat—focus on tables the user asked about.

## Script reference

Implementation and inline comments: `scripts/d1-table-xinfo-all.sh`.

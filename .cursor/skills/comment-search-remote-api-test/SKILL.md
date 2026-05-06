---
name: comment-search-remote-api-test
description: >-
  Runs verifiable command-line checks for comment search against the real
  remote D1 database `comment-search` via `wrangler pages dev` (same stack as
  `npm run preview`). Lists explicit success conditions, uses
  `scripts/comment-search-remote-api-test.sh`, and requires tearing down the
  preview server and freeing the listen port at the end. Use when the user asks
  to test comment search APIs, remote D1 comment-search, wrangler pages dev
  preview for `/api/comment-search`, or to validate CommentSearchResults
  backends from the CLI.
---

# Comment Search 実DB API テスト（CLI 検証）

## 目的

[`app/islands/CommentSearchResults.tsx`](../../../app/islands/CommentSearchResults.tsx) は URL の `?src=fly|cf|race` でデータソースを切り替える（**未指定は fly**；Fly のオリジンは `VITE_COMMENT_SEARCH_API_BASE` または既定 `https://comment-search.fly.dev`）。**このスクリプトが検証するのは Cloudflare の `/api/comment-search*`（ブラウザで `src=cf` としたときと同じ経路）だけ**であり、**実 D1 `comment-search`（remote）** に向いた `wrangler pages dev` 上で動くことを **コマンドラインだけで確認**する。終了時は **preview プロセスの停止とポート解放**まで必ず行う。

## 成功条件（すべて満たすこと）

次の各項目は、下記「一括実行」スクリプトが **終了コード 0** で通ることと同等（スクリプト内で個別に検証している）。

| # | 条件 | CLI での検証内容（概要） |
| - | - | - |
| A | Wrangler が Cloudflare API に届き、対象 D1 が参照できる | `wrangler d1 execute --remote <DB> --json --command 'PRAGMA table_list;'` を `jq` で解析し、テーブル名に `chat_items` と `videos` が含まれる |
| B | 静的成果物 `dist/` が存在する | `test -d dist`（スクリプトは未ビルドなら `npm run build` を実行） |
| C | Preview が起動し、`COMMENT_SEARCH_DB` が **remote** D1 にバインドされている | `wrangler pages dev` のログに `COMMENT_SEARCH_DB` と `remote` が同時に現れる |
| D | `GET /api/comment-search?q=<Q>` が **200** で、`query`・`results`（配列）・各要素に `video_id` / `title` / `thumbnail_url` / `comment_count` がある | `curl` の `%{http_code}` と `jq -e` |
| E | 上記 D の応答で **ヒットが 1 件以上**（Video 成功系の前提） | `jq '.results \| length'` が `>= 1` |
| F | `GET /api/comment-search?q=` が **200** で `query == ""` かつ `results == []` | `curl` + `jq -e` |
| G | `GET /api/comment-search/video?q=test`（`video_id` なし）が **400** で `error == "video_id is required"` | `curl` + `jq -e` |
| H | `GET /api/comment-search/video?video_id=<存在しないID>&q=foo` が **200** で `video == null` かつ `comments == []` | `curl` + `jq -e` |
| I | `GET /api/comment-search/video?video_id=<Dの先頭の video_id>&q=<Q>` が **200** で `video_id` が一致し、`comments` が配列で各要素に `offset_sec` と `message` がある | `curl` + `jq -e` |
| J | `GET /comment-search/@SuimoriAtori?q=<Q>` が **200** で HTML 内に `src="/static/client-…"` がある（SSR + クライアント起動の最低限） | `curl` + `grep` |

## 一括実行（推奨）

リポジトリルートで実行。**エージェントはサンドボックス外**（例: `required_permissions: ["all"]`）で叩くこと。Wrangler が `~/.config/.wrangler/logs/` へ書き込み、かつ Cloudflare API に到達する必要がある。

```bash
./scripts/comment-search-remote-api-test.sh
```

環境変数（任意）:

| 変数 | 既定 | 意味 |
| - | - | - |
| `COMMENT_SEARCH_D1_NAME` | `comment-search` | `wrangler d1 execute` / Pages の D1 名 |
| `COMMENT_SEARCH_TEST_Q` | `こんにちは` | ヒットが出る検索語（E を満たすこと） |
| `PREVIEW_PORT` | `8788` | ローカル listen ポート（他プロセスと被らないよう変更可） |
| `SKIP_BUILD` | 未設定 | `1` にすると `npm run build` をスキップ（`dist/` が既にあるとき） |

`package.json` 経由:

```bash
npm run test:comment-search:remote
```

## クリーンアップ（必須）

- **スクリプト利用時**: `scripts/comment-search-remote-api-test.sh` は `EXIT` / `INT` / `TERM` / `HUP` で `trap` しており、終了時に **preview 子プロセスの停止**と **`PREVIEW_PORT` の `fuser` または `ss` ベースの解放**、一時ディレクトリ削除まで行う。手動で preview を残さないこと。
- **手動で `npm run preview` した場合**: 終了時に `workerd` がポートに残ることがある。同じポートを使う前に例: `fuser -k ${PORT}/tcp` または `ss` で PID を特定して `kill` する（スクリプトと同様の方針）。

## 手動ステップ（スクリプトを使わない場合の最小セット）

1. `npx wrangler whoami`（認証確認）
2. `npx wrangler d1 execute --remote comment-search --json --command 'PRAGMA table_list;'` → 上表 A
3. `npm run build` → 上表 B
4. `npx wrangler pages dev ./dist --compatibility-date=2026-05-03 --port 8788` をバックグラウンドで起動し、ログで上表 C を確認
5. 上表 D〜J を `curl` / `jq` で順に確認（`Q` と `video_id` は D の応答から取得）
6. **必ず** preview を停止し、8788（または使用したポート）を解放

## エージェント向け注意

- コマンドは **リポジトリルート**（`pandaman64.com`）から実行する。
- **I が 500 になる場合**: [`functions/api/comment-search/video.ts`](../../../functions/api/comment-search/video.ts) の `chat_items.payload`（JSONB BLOB）に対する `json_extract` / `CAST` を疑う（実DBでの `typeof(payload)` と `json_extract` 直読みで切り分け可能）。
- スキーマ補助: [`scripts/d1-table-xinfo-all.sh`](../../../scripts/d1-table-xinfo-all.sh)（内部 `_cf_KV` はスキップ済み）。

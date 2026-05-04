/** 翠森アトリ（@SuimoriAtori）チャンネル — chat_items.message・videos の title/timestamp/thumbnails 生成列を利用した部分一致検索（大文字小文字区別なし） */
const CHANNEL_ID = "UCIQsiulMw70eRex4cXRAx2A";

type Row = {
  video_id: string;
  title: string;
  video_timestamp: number | null;
  thumbnail_url: string;
  comment_count: number;
};

export async function onRequestGet(context: {
  request: Request;
  env: { COMMENT_SEARCH_DB: D1Database };
}): Promise<Response> {
  const url = new URL(context.request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(limitRaw ?? "30", 10) || 30)
  );

  if (!q) {
    return Response.json({ query: "", results: [] as Row[], limit });
  }

  const db = context.env.COMMENT_SEARCH_DB;
  const stmt = db
    .prepare(
      `SELECT
         ci.video_id,
         COALESCE(v.title, ci.video_id) AS title,
         COALESCE(
           CAST(v.timestamp AS INTEGER),
           CAST(MAX(ci.timestamp_usec / 1000000) AS INTEGER)
         ) AS video_timestamp,
         COALESCE(
           json_extract(v.thumbnails, '$[0].url'),
           'https://i.ytimg.com/vi/' || ci.video_id || '/hqdefault.jpg'
         ) AS thumbnail_url,
         COUNT(*) AS comment_count
       FROM chat_items ci
       INNER JOIN videos v
         ON v.video_id = ci.video_id AND v.channel_id = ?
       WHERE INSTR(LOWER(ci.message), LOWER(?)) > 0
       GROUP BY ci.video_id
       ORDER BY video_timestamp DESC, ci.video_id DESC
       LIMIT ?`
    )
    .bind(CHANNEL_ID, q, limit);

  const { results } = await stmt.all<Row>();
  return Response.json({
    query: q,
    results: results ?? [],
    limit,
  });
}

/** 翠森アトリ（@SuimoriAtori）チャンネル — case-sensitive substring（INSTR）；チャンネル限定 */
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

  if (!q) {
    return Response.json({ query: "", results: [] as Row[] });
  }

  const db = context.env.COMMENT_SEARCH_DB;
  const stmt = db
    .prepare(
      `SELECT
         ci.video_id,
         COALESCE(v.title, ci.video_id) AS title,
         COALESCE(
           CAST(vm.release_timestamp AS INTEGER),
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
       LEFT JOIN video_metadata vm
         ON vm.video_id = ci.video_id AND vm.channel_id = ?
       WHERE INSTR(ci.message, ?) > 0
       GROUP BY ci.video_id
       ORDER BY vm.release_timestamp DESC, ci.video_id DESC`
    )
    .bind(CHANNEL_ID, CHANNEL_ID, q);

  const { results } = await stmt.all<Row>();
  return Response.json({
    query: q,
    results: results ?? [],
  });
}

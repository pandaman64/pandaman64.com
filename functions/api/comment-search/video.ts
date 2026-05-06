/** 単一動画内の一致コメント行（翠森アトリ @SuimoriAtori チャンネル） */
const CHANNEL_ID = "UCIQsiulMw70eRex4cXRAx2A";

type VideoRow = {
  title: string;
  video_timestamp: number | null;
  video_start_unix_sec: number | null;
  thumbnail_url: string;
};

type CommentRow = {
  message: string;
  timestamp_usec: number | null;
  time_in_seconds: number | null;
};

export async function onRequestGet(context: {
  request: Request;
  env: { COMMENT_SEARCH_DB: D1Database };
}): Promise<Response> {
  const url = new URL(context.request.url);
  const videoId = url.searchParams.get("video_id")?.trim() ?? "";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.min(
    500,
    Math.max(1, Number.parseInt(limitRaw ?? "200", 10) || 200)
  );

  if (!videoId) {
    return Response.json({ error: "video_id is required" }, { status: 400 });
  }

  const db = context.env.COMMENT_SEARCH_DB;

  if (!q) {
    return Response.json({
      query: "",
      video_id: videoId,
      video: null as VideoRow | null,
      comments: [] as { offset_sec: number; message: string }[],
      limit,
    });
  }

  const videoStmt = db
    .prepare(
      `SELECT
         COALESCE(v.title, v.video_id) AS title,
         COALESCE(
           CAST(vm.release_timestamp AS INTEGER),
           CAST(vm.timestamp AS INTEGER),
           CAST(json_extract(v.flat_entry_jsonb, '$.timestamp') AS INTEGER)
         ) AS video_timestamp,
         COALESCE(
           CAST(vm.timestamp AS INTEGER),
           CAST(vm.release_timestamp AS INTEGER),
           CAST(json_extract(v.flat_entry_jsonb, '$.timestamp') AS INTEGER)
         ) AS video_start_unix_sec,
         COALESCE(
           json_extract(v.thumbnails, '$[0].url'),
           'https://i.ytimg.com/vi/' || v.video_id || '/hqdefault.jpg'
         ) AS thumbnail_url
       FROM videos v
       LEFT JOIN video_metadata vm
         ON vm.video_id = v.video_id AND vm.channel_id = v.channel_id
       WHERE v.video_id = ? AND v.channel_id = ?`
    )
    .bind(videoId, CHANNEL_ID);

  const videoRow = await videoStmt.first<VideoRow>();
  if (!videoRow) {
    return Response.json({
      query: q,
      video_id: videoId,
      video: null,
      comments: [] as { offset_sec: number; message: string }[],
      limit,
    });
  }

  const commentsStmt = db
    .prepare(
      `SELECT
         ci.message,
         ci.timestamp_usec,
         CAST(json_extract(ci.payload, '$.time_in_seconds') AS REAL) AS time_in_seconds
       FROM chat_items ci
       INNER JOIN videos v
         ON v.video_id = ci.video_id AND v.channel_id = ?
       WHERE ci.video_id = ?
         AND INSTR(LOWER(ci.message), LOWER(?)) > 0
       ORDER BY time_in_seconds ASC, ci.timestamp_usec ASC
       LIMIT ?`
    )
    .bind(CHANNEL_ID, videoId, q, limit);

  const { results: commentResults } = await commentsStmt.all<CommentRow>();
  const rows = commentResults ?? [];

  const comments = rows.map((r) => {
    const t = r.time_in_seconds;
    const offsetSec =
      t == null || !Number.isFinite(t) ? 0 : Math.max(0, Math.floor(t));
    return {
      offset_sec: offsetSec,
      message: r.message ?? "",
    };
  });

  return Response.json({
    query: q,
    video_id: videoId,
    video: videoRow,
    comments,
    limit,
  });
}

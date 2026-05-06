/** Shared shapes for Cloudflare vs Fly comment-search APIs (normalized to UI). */

export type Hit = {
  video_id: string;
  title: string;
  video_timestamp: number | null;
  thumbnail_url: string;
  comment_count: number;
};

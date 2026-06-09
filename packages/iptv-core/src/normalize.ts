import type { StreamFormat } from "./models";

export function normalizeChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fhd|uhd|hd|sd|4k|1080p|720p)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function detectStreamFormat(streamUrl: string): StreamFormat {
  const lowerUrl = streamUrl.toLowerCase();

  if (lowerUrl.includes(".m3u8")) {
    return "hls";
  }

  if (lowerUrl.includes(".ts") || lowerUrl.includes("mpegts")) {
    return "mpegts";
  }

  return "unknown";
}

export function stableId(parts: string[]): string {
  return parts
    .join(":")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

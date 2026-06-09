import { describe, expect, it } from "vitest";
import { parseM3u } from "./m3u";

const sample = `#EXTM3U
#EXTINF:-1 tvg-id="demo-news" tvg-name="Demo News" tvg-logo="https://example.com/news.png" group-title="News",Demo News HD
https://example.com/live/news.m3u8
#EXTINF:-1 tvg-id="demo-sports" tvg-name="Demo Sports" group-title="Sports",Demo Sports FHD
https://example.com/live/sports.m3u8
orphan-stream-url
`;

describe("parseM3u", () => {
  it("parses channels and metadata from EXTINF entries", () => {
    const result = parseM3u(sample, "source-1");

    expect(result.channels).toHaveLength(2);
    expect(result.malformedEntries).toBe(1);
    expect(result.channels[0]).toMatchObject({
      name: "Demo News HD",
      normalizedName: "demo news",
      group: "News",
      logoUrl: "https://example.com/news.png",
      streamFormat: "hls",
      tvgId: "demo-news",
      tvgName: "Demo News",
    });
  });
});

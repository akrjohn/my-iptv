import { describe, expect, it } from "vitest";
import { parseM3u } from "./m3u";
import { createSourceHealthReport } from "./sourceDoctor";

const sample = `#EXTM3U
#EXTINF:-1 tvg-logo="https://example.com/news.png" group-title="News",Demo News HD
https://example.com/live/news.m3u8
#EXTINF:-1 group-title="News",Demo News 4K
https://example.com/live/news-backup.m3u8
#EXTINF:-1 group-title="Adult",Adult Sample
https://example.com/live/adult.m3u8
`;

describe("createSourceHealthReport", () => {
  it("summarizes source health using metadata-only checks", () => {
    const parsed = parseM3u(sample, "source-1");
    const report = createSourceHealthReport(
      "source-1",
      parsed.channels,
      parsed.malformedEntries,
    );

    expect(report.totalChannels).toBe(3);
    expect(report.missingLogos).toBe(2);
    expect(report.duplicateGroups).toBe(1);
    expect(report.likelyRestrictedChannels).toBe(1);
    expect(report.recommendations.map((item) => item.type)).toContain("merge_duplicates");
    expect(report.recommendations.map((item) => item.type)).toContain("hide_restricted");
    expect(report.hiddenCount).toBe(0);
    expect(report.visibleChannels).toBe(3);
    expect(report.missingStreamUrls).toBe(0);
  });

  it("accounts for hidden channels in visible count", () => {
    const parsed = parseM3u(sample, "source-1");
    const hidden = parsed.channels.map((ch) => ({
      ...ch,
      isHidden: ch.group === "Adult",
    }));
    const report = createSourceHealthReport("source-1", hidden, 0);
    expect(report.hiddenCount).toBe(1);
    expect(report.visibleChannels).toBe(2);
    expect(report.likelyRestrictedChannels).toBe(0);
  });
});

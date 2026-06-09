import { describe, expect, it } from "vitest";
import { syncM3uPlaylist, type PlaylistFetcher } from "./sourceSync";

const playlist = `#EXTM3U
#EXTINF:-1 tvg-id="demo-news" tvg-name="Demo News" group-title="News",Demo News
https://example.com/live/news.m3u8
`;

function response(text: string, status = 200): ReturnType<PlaylistFetcher> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
  });
}

describe("syncM3uPlaylist", () => {
  it("fetches, parses, and returns a synced M3U source", async () => {
    const result = await syncM3uPlaylist({
      sourceId: "source-1",
      name: "Home",
      playlistUrl: "https://example.com/playlist.m3u",
      now: new Date("2026-06-08T12:00:00.000Z"),
      fetcher: () => response(playlist),
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.source).toMatchObject({
      id: "source-1",
      name: "Home",
      playlistUrl: "https://example.com/playlist.m3u",
      syncStatus: "success",
      lastSyncedAt: "2026-06-08T12:00:00.000Z",
    });
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0]?.streamFormat).toBe("hls");
  });

  it("classifies empty playlists as empty source failures", async () => {
    const result = await syncM3uPlaylist({
      sourceId: "source-1",
      name: "Empty",
      playlistUrl: "https://example.com/playlist.m3u",
      fetcher: () => response(""),
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("empty_source");
    expect(result.source.syncStatus).toBe("failed");
  });

  it("classifies browser fetch TypeErrors as CORS-blocked failures", async () => {
    const result = await syncM3uPlaylist({
      sourceId: "source-1",
      name: "Blocked",
      playlistUrl: "https://example.com/playlist.m3u",
      fetcher: () => Promise.reject(new TypeError("Failed to fetch")),
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("cors_blocked");
  });

  it("classifies rejected provider access as authentication failure", async () => {
    const result = await syncM3uPlaylist({
      sourceId: "source-1",
      name: "Private",
      playlistUrl: "https://example.com/playlist.m3u",
      fetcher: () => response("Forbidden", 403),
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("authentication_failed");
  });
});

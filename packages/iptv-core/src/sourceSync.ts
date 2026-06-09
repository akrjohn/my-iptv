import type { Channel, M3uSource, SourceSyncError } from "./models";
import { parseM3u } from "./m3u";

export type PlaylistFetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

export type PlaylistFetcher = (url: string) => Promise<PlaylistFetchResponse>;

export type SyncM3uPlaylistInput = {
  sourceId: string;
  name: string;
  playlistUrl: string;
  now?: Date;
  fetcher?: PlaylistFetcher;
};

export type SyncM3uPlaylistResult =
  | {
      ok: true;
      source: M3uSource;
      channels: Channel[];
      malformedEntries: number;
    }
  | {
      ok: false;
      source: M3uSource;
      channels: [];
      malformedEntries: 0;
      error: SourceSyncError;
    };

export async function syncM3uPlaylist({
  sourceId,
  name,
  playlistUrl,
  now = new Date(),
  fetcher = fetch,
}: SyncM3uPlaylistInput): Promise<SyncM3uPlaylistResult> {
  const source = createSyncingSource(sourceId, name, playlistUrl, now);

  try {
    const response = await fetcher(playlistUrl);

    if (!response.ok) {
      return fail(source, classifyHttpStatus(response.status, now));
    }

    const playlistText = await response.text();
    const parsed = parseM3u(playlistText, sourceId);

    if (parsed.channels.length === 0) {
      return fail(source, {
        code: playlistText.trim() ? "parse_failed" : "empty_source",
        message: playlistText.trim()
          ? "The playlist was fetched, but no valid channels could be parsed."
          : "The playlist did not contain any channel entries.",
        recoverable: true,
      });
    }

    return {
      ok: true,
      source: {
        ...source,
        syncStatus: "success",
        lastSyncedAt: now.toISOString(),
      },
      channels: parsed.channels,
      malformedEntries: parsed.malformedEntries,
    };
  } catch (error) {
    return fail(source, classifyFetchError(error, now));
  }
}

function createSyncingSource(
  sourceId: string,
  name: string,
  playlistUrl: string,
  now: Date,
): M3uSource {
  return {
    id: sourceId,
    type: "m3u",
    name,
    playlistUrl,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    syncStatus: "syncing",
  };
}

function fail(
  source: M3uSource,
  error: SourceSyncError,
): Extract<SyncM3uPlaylistResult, { ok: false }> {
  return {
    ok: false,
    source: {
      ...source,
      updatedAt: new Date().toISOString(),
      syncStatus: "failed",
      syncError: error,
    },
    channels: [],
    malformedEntries: 0,
    error,
  };
}

function classifyHttpStatus(status: number, now: Date): SourceSyncError {
  if (status === 401 || status === 403) {
    return {
      code: "authentication_failed",
      message: "The playlist server rejected the request. Check credentials or provider access.",
      recoverable: true,
    };
  }

  if (status === 429) {
    return {
      code: "rate_limited",
      message: "The playlist server is rate limiting requests. Try syncing again later.",
      recoverable: true,
    };
  }

  return {
    code: "network_unreachable",
    message: `The playlist server returned HTTP ${status} during sync at ${now.toISOString()}.`,
    recoverable: true,
  };
}

function classifyFetchError(error: unknown, now: Date): SourceSyncError {
  if (error instanceof TypeError) {
    return {
      code: "cors_blocked",
      message:
        "The browser could not read the playlist response. The provider may block browser requests with CORS.",
      recoverable: true,
    };
  }

  if (error instanceof Error && error.message.toLowerCase().includes("network")) {
    return {
      code: "network_unreachable",
      message: `The playlist could not be reached during sync at ${now.toISOString()}.`,
      recoverable: true,
    };
  }

  return {
    code: "unknown",
    message: "The playlist could not be synced because of an unexpected error.",
    recoverable: true,
  };
}

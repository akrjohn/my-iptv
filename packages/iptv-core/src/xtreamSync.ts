import type { Channel, SourceSyncError, XtreamSource } from "./models";
import { detectStreamFormat, normalizeChannelName, stableId } from "./normalize";
import { fetchXtreamApi, type XtreamLiveCategory } from "./xtream";

export type SyncXtreamInput = {
  sourceId: string;
  name: string;
  serverUrl: string;
  username: string;
  password: string;
  now?: Date;
  fetcher?: (url: string) => Promise<Response>;
};

export type SyncXtreamResult =
  | {
      ok: true;
      source: XtreamSource;
      channels: Channel[];
      categories: XtreamLiveCategory[];
    }
  | {
      ok: false;
      source: XtreamSource;
      channels: [];
      categories: [];
      error: SourceSyncError;
    };

export async function syncXtream({
  sourceId,
  name,
  serverUrl,
  username,
  password,
  now = new Date(),
  fetcher,
}: SyncXtreamInput): Promise<SyncXtreamResult> {
  const source: XtreamSource = {
    id: sourceId,
    type: "xtream",
    name,
    serverUrl,
    usernameRef: username,
    passwordRef: password,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    syncStatus: "syncing",
  };

  const apiResult = await fetchXtreamApi(serverUrl, username, password, fetcher);

  if (!apiResult.ok) {
    return {
      ok: false,
      source: {
        ...source,
        updatedAt: now.toISOString(),
        syncStatus: "failed",
        syncError: {
          code: apiResult.code === "auth"
            ? "authentication_failed"
            : apiResult.code === "network"
              ? "network_unreachable"
              : "unknown",
          message: apiResult.error,
          recoverable: true,
        },
      },
      channels: [],
      categories: [],
      error: {
        code: apiResult.code === "auth"
          ? "authentication_failed"
          : apiResult.code === "network"
            ? "network_unreachable"
            : "unknown",
        message: apiResult.error,
        recoverable: true,
      },
    };
  }

  const { data } = apiResult;
  const liveCategories = data.live_categories ?? data.categories ?? [];
  const categories = liveCategories;
  const categoryMap = new Map<number | string, string>();
  for (const cat of liveCategories) {
    categoryMap.set(cat.category_id, cat.category_name);
  }

  const rawStreams = data.live_streams ?? [];
  const channels: Channel[] = rawStreams.map((stream) => {
    const groupName = categoryMap.get(stream.category_id) ?? "Ungrouped";
    const streamUrl = `${serverUrl.replace(/\/+$/, "")}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${stream.stream_id}.m3u8`;

    return {
      id: stableId([sourceId, String(stream.stream_id)]),
      sourceId,
      externalId: String(stream.stream_id),
      name: stream.name,
      normalizedName: normalizeChannelName(stream.name),
      group: groupName,
      groups: [groupName],
      logoUrl: stream.stream_icon,
      streamUrl,
      streamFormat: detectStreamFormat(streamUrl),
      tvgId: stream.epg_channel_id,
      tvgName: stream.name,
      isHidden: false,
      isFavorite: false,
      parentalLocked: false,
      validationStatus: "untested" as const,
    };
  });

  return {
    ok: true,
    source: {
      ...source,
      syncStatus: "success" as const,
      lastSyncedAt: now.toISOString(),
    },
    channels,
    categories,
  };
}

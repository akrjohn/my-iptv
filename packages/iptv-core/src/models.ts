export type SourceType = "m3u" | "xtream";

export type SourceSyncErrorCode =
  | "network_unreachable"
  | "cors_blocked"
  | "authentication_failed"
  | "unsupported_format"
  | "parse_failed"
  | "empty_source"
  | "rate_limited"
  | "unknown";

export type SourceSyncError = {
  code: SourceSyncErrorCode;
  message: string;
  recoverable: boolean;
};

export type Source = {
  id: string;
  type: SourceType;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  syncStatus: "idle" | "syncing" | "success" | "failed";
  syncError?: SourceSyncError;
};

export type M3uSource = Source & {
  type: "m3u";
  playlistUrl?: string;
  epgUrl?: string;
};

export type XtreamSource = Source & {
  type: "xtream";
  serverUrl: string;
  usernameRef: string;
  passwordRef: string;
};

export type StreamFormat = "hls" | "mpegts" | "unknown";

export type Channel = {
  id: string;
  sourceId: string;
  externalId?: string;
  name: string;
  normalizedName: string;
  group?: string;
  groups: string[];
  logoUrl?: string;
  streamUrl: string;
  streamFormat: StreamFormat;
  tvgId?: string;
  tvgName?: string;
  isHidden: boolean;
  isFavorite: boolean;
  parentalLocked: boolean;
  lastValidatedAt?: string;
  validationStatus?: "untested" | "playable" | "failed";
};

export type Program = {
  id: string;
  channelId: string;
  sourceId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  category?: string;
};

export type ChannelOverride = {
  channelId: string;
  displayName?: string;
  group?: string;
  logoUrl?: string;
  hidden?: boolean;
  parentalLocked?: boolean;
  epgChannelId?: string;
  preferredVariantId?: string;
};

export type PlatformCapabilities = {
  playback: {
    hls: boolean;
    mpegTs: boolean;
    dash: boolean;
    subtitles: boolean;
    audioTrackSelection: boolean;
    pictureInPicture: boolean;
  };
  storage: {
    indexedDb: boolean;
    secureCredentials: boolean;
    backgroundSync: boolean;
  };
  input: {
    remote: boolean;
    keyboard: boolean;
    touch: boolean;
    mediaKeys: boolean;
  };
};

import type { Channel } from "./models";
import { detectStreamFormat, normalizeChannelName, stableId } from "./normalize";

type M3uEntry = {
  name: string;
  attributes: Record<string, string>;
  streamUrl: string;
};

export type ParseM3uResult = {
  channels: Channel[];
  malformedEntries: number;
};

const attributePattern = /([A-Za-z0-9_-]+)="([^"]*)"/g;

export function parseM3u(content: string, sourceId: string): ParseM3uResult {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: M3uEntry[] = [];
  let pendingInfo: string | null = null;
  let malformedEntries = 0;

  for (const line of lines) {
    if (line.startsWith("#EXTINF")) {
      pendingInfo = line;
      continue;
    }

    if (line.startsWith("#")) {
      continue;
    }

    if (!pendingInfo) {
      malformedEntries += 1;
      continue;
    }

    const entry = parseExtInf(pendingInfo, line);

    if (entry.name && entry.streamUrl) {
      entries.push(entry);
    } else {
      malformedEntries += 1;
    }

    pendingInfo = null;
  }

  return {
    channels: entries.map((entry, index) => toChannel(entry, sourceId, index)),
    malformedEntries,
  };
}

function parseExtInf(infoLine: string, streamUrl: string): M3uEntry {
  const attributes: Record<string, string> = {};
  const attributeMatches = infoLine.matchAll(attributePattern);

  for (const match of attributeMatches) {
    attributes[match[1] ?? ""] = match[2] ?? "";
  }

  const commaIndex = infoLine.lastIndexOf(",");
  const name = commaIndex >= 0 ? infoLine.slice(commaIndex + 1).trim() : "";

  return {
    name,
    attributes,
    streamUrl,
  };
}

function toChannel(entry: M3uEntry, sourceId: string, index: number): Channel {
  const tvgId = entry.attributes["tvg-id"];
  const tvgName = entry.attributes["tvg-name"];
  const rawGroup = entry.attributes["group-title"];
  const logoUrl = entry.attributes["tvg-logo"];
  const normalizedName = normalizeChannelName(entry.name);

  return {
    id: stableId([sourceId, tvgId || tvgName || entry.name, String(index)]),
    sourceId,
    externalId: tvgId,
    name: entry.name,
    normalizedName,
    group: rawGroup,
    groups: rawGroup ? rawGroup.split(";").map((g) => g.trim()).filter(Boolean) : [],
    logoUrl,
    streamUrl: entry.streamUrl,
    streamFormat: detectStreamFormat(entry.streamUrl),
    tvgId,
    tvgName,
    isHidden: false,
    isFavorite: false,
    parentalLocked: false,
    validationStatus: "untested",
  };
}

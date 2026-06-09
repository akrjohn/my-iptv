import type { Channel, ChannelOverride } from "./models";
import type { XmltvData } from "./xmltv";

export type SourceRecommendationType =
  | "hide_failed_streams"
  | "merge_duplicates"
  | "match_epg"
  | "hide_restricted"
  | "normalize_names";

export type SourceRecommendation = {
  id: string;
  type: SourceRecommendationType;
  title: string;
  description: string;
  impact: number;
  channelIds?: string[];
};

export type SourceHealthReport = {
  sourceId: string;
  generatedAt: string;
  totalChannels: number;
  visibleChannels: number;
  hiddenCount: number;
  missingLogos: number;
  missingStreamUrls: number;
  duplicateGroups: number;
  malformedEntries: number;
  likelyRestrictedChannels: number;
  epgMatchedCount: number;
  epgUnmatchedCount: number;
  recommendations: SourceRecommendation[];
};

const restrictedTerms = ["adult", "xxx", "18+", "porn", "sex"];

export function createSourceHealthReport(
  sourceId: string,
  channels: Channel[],
  malformedEntries = 0,
  epgData?: XmltvData,
  channelOverrides?: ChannelOverride[],
): SourceHealthReport {
  const hiddenIds = new Set(
    channelOverrides?.filter((o) => o.hidden).map((o) => o.channelId) ?? [],
  );

  const visibleChannels = channels.filter((ch) => !ch.isHidden && !hiddenIds.has(ch.id));
  const missingLogos = visibleChannels.filter((channel) => !channel.logoUrl).length;
  const missingStreamUrls = visibleChannels.filter((channel) => !channel.streamUrl).length;
  const duplicateGroups = countDuplicateNameGroups(visibleChannels);
  const hiddenCount = channels.length - visibleChannels.length;
  const likelyRestrictedChannels = visibleChannels.filter(isLikelyRestricted).length;

  const epgMatchedCount = epgData
    ? visibleChannels.filter((ch) =>
        epgData.programmes.some(
          (p) =>
            p.channel.toLowerCase() === (ch.tvgId ?? ch.tvgName ?? ch.name).toLowerCase(),
        ),
      ).length
    : 0;

  const epgUnmatchedCount = epgData
    ? visibleChannels.length - epgMatchedCount
    : visibleChannels.length;

  const recommendations: SourceRecommendation[] = [];

  const failedChannelIds = visibleChannels
    .filter((ch) => ch.validationStatus === "failed" || !ch.streamUrl)
    .map((ch) => ch.id);

  if (failedChannelIds.length > 0) {
    recommendations.push({
      id: "hide-failed",
      type: "hide_failed_streams",
      title: "Hide unreachable streams",
      description: `${failedChannelIds.length} channel${failedChannelIds.length > 1 ? "s" : ""} failed playback or have no stream URL.`,
      impact: failedChannelIds.length,
      channelIds: failedChannelIds,
    });
  }

  if (duplicateGroups > 0) {
    const dupIds = findDuplicateChannelIds(visibleChannels);
    recommendations.push({
      id: "merge-duplicates",
      type: "merge_duplicates",
      title: "Review duplicate channels",
      description: `${duplicateGroups} group${duplicateGroups > 1 ? "s have" : " has"} channels with the same name.`,
      impact: duplicateGroups,
      channelIds: dupIds,
    });
  }

  if (missingLogos > 0) {
    recommendations.push({
      id: "normalize-names",
      type: "normalize_names",
      title: "Clean channel metadata",
      description: `${missingLogos} channel${missingLogos > 1 ? "s are" : " is"} missing logos or have incomplete metadata.`,
      impact: missingLogos,
    });
  }

  if (likelyRestrictedChannels > 0) {
    const restrictedIds = visibleChannels.filter(isLikelyRestricted).map((ch) => ch.id);
    recommendations.push({
      id: "hide-restricted",
      type: "hide_restricted",
      title: "Hide restricted channels",
      description: `${likelyRestrictedChannels} channel${likelyRestrictedChannels > 1 ? "s" : ""} may belong in a locked or hidden category.`,
      impact: likelyRestrictedChannels,
      channelIds: restrictedIds,
    });
  }

  return {
    sourceId,
    generatedAt: new Date().toISOString(),
    totalChannels: channels.length,
    visibleChannels: visibleChannels.length,
    hiddenCount,
    missingLogos,
    missingStreamUrls,
    duplicateGroups,
    malformedEntries,
    likelyRestrictedChannels,
    epgMatchedCount,
    epgUnmatchedCount,
    recommendations,
  };
}

function countDuplicateNameGroups(channels: Channel[]): number {
  const counts = new Map<string, number>();

  for (const channel of channels) {
    counts.set(channel.normalizedName, (counts.get(channel.normalizedName) ?? 0) + 1);
  }

  return Array.from(counts.values()).filter((count) => count > 1).length;
}

function findDuplicateChannelIds(channels: Channel[]): string[] {
  const seen = new Map<string, string[]>();
  for (const ch of channels) {
    const list = seen.get(ch.normalizedName) ?? [];
    list.push(ch.id);
    seen.set(ch.normalizedName, list);
  }
  return Array.from(seen.values())
    .filter((ids) => ids.length > 1)
    .flat();
}

function isLikelyRestricted(channel: Channel): boolean {
  const text = `${channel.name} ${channel.group ?? ""}`.toLowerCase();
  return restrictedTerms.some((term) => text.includes(term));
}

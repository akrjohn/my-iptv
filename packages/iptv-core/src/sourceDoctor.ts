import type { Channel } from "./models";

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
};

export type SourceHealthReport = {
  sourceId: string;
  generatedAt: string;
  totalChannels: number;
  missingLogos: number;
  duplicateGroups: number;
  malformedEntries: number;
  likelyRestrictedChannels: number;
  recommendations: SourceRecommendation[];
};

const restrictedTerms = ["adult", "xxx", "18+", "porn"];

export function createSourceHealthReport(
  sourceId: string,
  channels: Channel[],
  malformedEntries = 0,
): SourceHealthReport {
  const missingLogos = channels.filter((channel) => !channel.logoUrl).length;
  const duplicateGroups = countDuplicateNameGroups(channels);
  const likelyRestrictedChannels = channels.filter(isLikelyRestricted).length;
  const recommendations: SourceRecommendation[] = [];

  if (duplicateGroups > 0) {
    recommendations.push({
      id: "merge-duplicates",
      type: "merge_duplicates",
      title: "Review duplicate channels",
      description: "Some channels appear to be repeated under similar names.",
      impact: duplicateGroups,
    });
  }

  if (missingLogos > 0) {
    recommendations.push({
      id: "normalize-names",
      type: "normalize_names",
      title: "Clean channel metadata",
      description: "Some channels are missing logos or have incomplete metadata.",
      impact: missingLogos,
    });
  }

  if (likelyRestrictedChannels > 0) {
    recommendations.push({
      id: "hide-restricted",
      type: "hide_restricted",
      title: "Review restricted channels",
      description: "Some channels may belong in a locked or hidden category.",
      impact: likelyRestrictedChannels,
    });
  }

  return {
    sourceId,
    generatedAt: new Date().toISOString(),
    totalChannels: channels.length,
    missingLogos,
    duplicateGroups,
    malformedEntries,
    likelyRestrictedChannels,
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

function isLikelyRestricted(channel: Channel): boolean {
  const text = `${channel.name} ${channel.group ?? ""}`.toLowerCase();
  return restrictedTerms.some((term) => text.includes(term));
}

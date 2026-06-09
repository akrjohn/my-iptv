import type { Channel } from "@my-iptv/iptv-core";

export function getFavoriteChannels(channels: Channel[]): Channel[] {
  return channels.filter((channel) => channel.isFavorite && !channel.isHidden);
}

export function getRecentChannels(channels: Channel[], recentChannelIds: string[]): Channel[] {
  const channelById = new Map(channels.map((channel) => [channel.id, channel]));

  return recentChannelIds
    .map((channelId) => channelById.get(channelId))
    .filter((channel): channel is Channel => channel !== undefined && !channel.isHidden);
}

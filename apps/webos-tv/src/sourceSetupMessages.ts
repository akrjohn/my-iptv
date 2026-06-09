export function formatM3uTestSuccessMessage(channelCount: number, malformedCount: number): string {
  return `Connection OK. ${channelCount} channels parsed; ${malformedCount} malformed entries found.`;
}

export function formatM3uSaveSuccessMessage(channelCount: number): string {
  return `Saved locally. ${channelCount} channels synced.`;
}

export function formatXtreamTestSuccessMessage(channelCount: number): string {
  return `Connection OK. ${channelCount} channels discovered from provider.`;
}

export function formatXtreamSaveSuccessMessage(channelCount: number): string {
  return `Saved locally. ${channelCount} channels synced from provider.`;
}

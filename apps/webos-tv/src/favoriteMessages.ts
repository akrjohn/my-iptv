export function formatFavoriteToggleMessage(channelName: string, isFavorite: boolean): string {
  return isFavorite ? `${channelName} added to favorites.` : `${channelName} removed from favorites.`;
}

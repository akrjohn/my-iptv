import { describe, expect, it } from "vitest";
import { formatFavoriteToggleMessage } from "./favoriteMessages";

describe("favorite messages", () => {
  it("formats add and remove feedback", () => {
    expect(formatFavoriteToggleMessage("Demo News HD", true)).toBe("Demo News HD added to favorites.");
    expect(formatFavoriteToggleMessage("Demo News HD", false)).toBe("Demo News HD removed from favorites.");
  });
});

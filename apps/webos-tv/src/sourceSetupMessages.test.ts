import { describe, expect, it } from "vitest";
import {
  formatM3uSaveSuccessMessage,
  formatM3uTestSuccessMessage,
  formatXtreamSaveSuccessMessage,
  formatXtreamTestSuccessMessage,
} from "./sourceSetupMessages";

describe("source setup messages", () => {
  it("distinguishes M3U test and save copy", () => {
    expect(formatM3uTestSuccessMessage(12, 3)).toBe(
      "Connection OK. 12 channels parsed; 3 malformed entries found.",
    );
    expect(formatM3uSaveSuccessMessage(12)).toBe("Saved locally. 12 channels synced.");
  });

  it("distinguishes Xtream test and save copy", () => {
    expect(formatXtreamTestSuccessMessage(44)).toBe(
      "Connection OK. 44 channels discovered from provider.",
    );
    expect(formatXtreamSaveSuccessMessage(44)).toBe(
      "Saved locally. 44 channels synced from provider.",
    );
  });
});

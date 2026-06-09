import { describe, expect, it } from "vitest";
import type { Channel } from "@my-iptv/iptv-core";
import { getFavoriteChannels, getRecentChannels } from "./channelShelf";

function createChannel(overrides: Partial<Channel>): Channel {
  return {
    id: "channel-1",
    sourceId: "source-1",
    name: "Demo Channel",
    normalizedName: "demo channel",
    groups: ["All"],
    streamUrl: "https://example.com/stream.m3u8",
    streamFormat: "hls",
    isHidden: false,
    isFavorite: false,
    parentalLocked: false,
    ...overrides,
  };
}

describe("channel shelf helpers", () => {
  it("returns visible favorites in source order", () => {
    const channels = [
      createChannel({ id: "a", name: "Alpha", normalizedName: "alpha", isFavorite: true }),
      createChannel({ id: "b", name: "Beta", normalizedName: "beta" }),
      createChannel({ id: "c", name: "Gamma", normalizedName: "gamma", isFavorite: true, isHidden: true }),
      createChannel({ id: "d", name: "Delta", normalizedName: "delta", isFavorite: true }),
    ];

    expect(getFavoriteChannels(channels).map((channel) => channel.id)).toEqual(["a", "d"]);
  });

  it("returns recent channels in saved order and skips missing or hidden channels", () => {
    const channels = [
      createChannel({ id: "a", name: "Alpha", normalizedName: "alpha" }),
      createChannel({ id: "b", name: "Beta", normalizedName: "beta", isHidden: true }),
      createChannel({ id: "c", name: "Gamma", normalizedName: "gamma" }),
    ];

    expect(getRecentChannels(channels, ["c", "b", "missing", "a"]).map((channel) => channel.id)).toEqual([
      "c",
      "a",
    ]);
  });
});

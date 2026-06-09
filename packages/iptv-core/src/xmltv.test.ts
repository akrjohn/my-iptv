import { describe, it, expect } from "vitest";
import { parseXmltv, getCurrentProgramme, getNextProgramme, matchProgrammes, parseXmltvDate } from "./xmltv";

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="example.com">
  <channel id="bbc.one">
    <display-name>BBC One</display-name>
    <icon src="http://example.com/bbc.png" />
  </channel>
  <channel id="bbc.two">
    <display-name>BBC Two</display-name>
  </channel>
  <programme channel="bbc.one" start="20240101060000 +0000" stop="20240101070000 +0000">
    <title>Morning News</title>
    <desc>Today's top stories.</desc>
    <category>News</category>
  </programme>
  <programme channel="bbc.one" start="20240101070000 +0000" stop="20240101080000 +0000">
    <title>Breakfast Show</title>
    <desc>Morning entertainment.</desc>
    <category>Entertainment</category>
  </programme>
  <programme channel="bbc.two" start="20240101060000 +0000" stop="20240101080000 +0000">
    <title>Documentary</title>
    <desc>Nature documentary.</desc>
  </programme>
</tv>`;

const now0600 = new Date("2024-01-01T06:30:00Z");
const now0700 = new Date("2024-01-01T07:00:00Z");
const now0800 = new Date("2024-01-01T08:00:00Z");

describe("parseXmltv", () => {
  it("parses channels", () => {
    const result = parseXmltv(sampleXml);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.channels).toHaveLength(2);
    expect(result.data.channels[0]).toEqual({
      id: "bbc.one",
      displayName: "BBC One",
      iconUrl: "http://example.com/bbc.png",
    });
    expect(result.data.channels[1]).toEqual({
      id: "bbc.two",
      displayName: "BBC Two",
      iconUrl: undefined,
    });
  });

  it("parses programmes", () => {
    const result = parseXmltv(sampleXml);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.programmes).toHaveLength(3);
    expect(result.data.programmes[0]).toEqual({
      channel: "bbc.one",
      title: "Morning News",
      description: "Today's top stories.",
      category: "News",
      start: "20240101060000 +0000",
      stop: "20240101070000 +0000",
    });
  });

  it("handles empty XML", () => {
    const result = parseXmltv("<tv></tv>");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.channels).toHaveLength(0);
    expect(result.data.programmes).toHaveLength(0);
  });

  it("handles malformed XML", () => {
    const result = parseXmltv("not xml");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.channels).toHaveLength(0);
    expect(result.data.programmes).toHaveLength(0);
  });
});

describe("parseXmltvDate", () => {
  it("parses full date with timezone", () => {
    const date = parseXmltvDate("20240101060000 +0000");
    expect(date).not.toBeNull();
    expect(date!.getTime()).toBe(new Date("2024-01-01T06:00:00Z").getTime());
  });

  it("parses date without timezone", () => {
    const date = parseXmltvDate("20240101060000");
    expect(date).not.toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(parseXmltvDate("")).toBeNull();
    expect(parseXmltvDate("abc")).toBeNull();
  });
});

describe("matchProgrammes", () => {
  it("matches programmes airing at given time", () => {
    const programmes = [
      { channel: "bbc.one", title: "Morning News", description: "", category: "", start: "20240101060000 +0000", stop: "20240101070000 +0000" },
      { channel: "bbc.one", title: "Breakfast Show", description: "", category: "", start: "20240101070000 +0000", stop: "20240101080000 +0000" },
    ];

    const matched = matchProgrammes(programmes, "bbc.one", undefined, undefined, now0600);
    expect(matched).toHaveLength(1);
    expect(matched[0].title).toBe("Morning News");
  });

  it("matches by channel name", () => {
    const programmes = [
      { channel: "BBC One", title: "Morning News", description: "", category: "", start: "20240101060000 +0000", stop: "20240101070000 +0000" },
    ];

    const matched = matchProgrammes(programmes, undefined, "BBC One", undefined, now0600);
    expect(matched).toHaveLength(1);
  });
});

describe("getCurrentProgramme", () => {
  it("returns the currently airing programme", () => {
    const programmes = [
      { channel: "bbc.one", title: "Morning News", description: "", category: "", start: "20240101060000 +0000", stop: "20240101070000 +0000" },
      { channel: "bbc.one", title: "Breakfast Show", description: "", category: "", start: "20240101070000 +0000", stop: "20240101080000 +0000" },
    ];

    const programme = getCurrentProgramme(programmes, "bbc.one", undefined, undefined, now0600);
    expect(programme).toBeDefined();
    expect(programme!.title).toBe("Morning News");
  });

  it("returns undefined when no match", () => {
    const programme = getCurrentProgramme([], "unknown");
    expect(programme).toBeUndefined();
  });
});

describe("getNextProgramme", () => {
  it("returns the next upcoming programme", () => {
    const programmes = [
      { channel: "bbc.one", title: "Morning News", description: "", category: "", start: "20240101060000 +0000", stop: "20240101070000 +0000" },
      { channel: "bbc.one", title: "Breakfast Show", description: "", category: "", start: "20240101070000 +0000", stop: "20240101080000 +0000" },
    ];

    const next = getNextProgramme(programmes, "bbc.one", undefined, undefined, now0600);
    expect(next).toBeDefined();
    expect(next!.title).toBe("Breakfast Show");
  });

  it("returns undefined at end of schedule", () => {
    const programmes = [
      { channel: "bbc.one", title: "Morning News", description: "", category: "", start: "20240101060000 +0000", stop: "20240101070000 +0000" },
    ];

    const next = getNextProgramme(programmes, "bbc.one", undefined, undefined, now0800);
    expect(next).toBeUndefined();
  });
});

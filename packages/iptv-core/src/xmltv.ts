export type XmltvChannel = {
  id: string;
  displayName: string;
  iconUrl?: string;
};

export type XmltvProgramme = {
  channel: string;
  title: string;
  description?: string;
  category?: string;
  start: string;
  stop: string;
};

export type XmltvData = {
  channels: XmltvChannel[];
  programmes: XmltvProgramme[];
};

export type XmltvParseResult =
  | { ok: true; data: XmltvData }
  | { ok: false; error: string };

export function parseXmltv(xml: string): XmltvParseResult {
  try {
    const channels: XmltvChannel[] = [];
    const programmes: XmltvProgramme[] = [];

    const channelRegex = /<channel\s+id="([^"]*)"[^>]*>([\s\S]*?)<\/channel>/gi;
    let channelMatch: RegExpExecArray | null;

    while ((channelMatch = channelRegex.exec(xml)) !== null) {
      const channelId = channelMatch[1];
      const content = channelMatch[2];
      const displayName = extractTag(content, "display-name") || channelId;
      const iconUrl = extractAttr(content, "icon", "src");
      channels.push({ id: channelId, displayName, iconUrl });
    }

    const programmeRegex = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/gi;
    let programmeMatch: RegExpExecArray | null;

    while ((programmeMatch = programmeRegex.exec(xml)) !== null) {
      const attrs = programmeMatch[1];
      const content = programmeMatch[2];
      const channel = extractAttrRaw(attrs, "channel");
      const start = extractAttrRaw(attrs, "start");
      const stop = extractAttrRaw(attrs, "stop");

      if (!channel || !start) {
        continue;
      }

      programmes.push({
        channel,
        title: extractTag(content, "title") || "Unknown",
        description: extractTag(content, "desc") || extractTag(content, "description"),
        category: extractTag(content, "category"),
        start,
        stop: stop || "",
      });
    }

    return { ok: true, data: { channels, programmes } };
  } catch {
    return { ok: false, error: "Failed to parse XMLTV data" };
  }
}

function extractTag(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = regex.exec(xml);
  return match ? decodeXml(match[1].trim()) : undefined;
}

function extractAttr(xml: string, tag: string, attr: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, "i");
  const match = regex.exec(xml);
  return match ? decodeXml(match[1]) : undefined;
}

function extractAttrRaw(attrs: string, name: string): string | undefined {
  const regex = new RegExp(`${name}="([^"]*)"`, "i");
  const match = regex.exec(attrs);
  return match ? match[1] : undefined;
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export function matchProgrammes(
  programmes: XmltvProgramme[],
  channelTvgId?: string,
  channelName?: string,
  channelTvgName?: string,
  now: Date = new Date(),
): XmltvProgramme[] {
  const channelIds = [channelTvgId, channelTvgName, channelName].filter(Boolean) as string[];

  if (channelIds.length === 0) {
    return [];
  }

  const matched = programmes.filter((p) => {
    const programmeStart = parseXmltvDate(p.start);
    const programmeStop = p.stop ? parseXmltvDate(p.stop) : null;
    if (!programmeStart) return false;

    const channelMatch = channelIds.some(
      (id) => p.channel.toLowerCase() === id.toLowerCase(),
    );

    if (!channelMatch) return false;

    if (programmeStop) {
      return programmeStart <= now && now < programmeStop;
    }

    const endOfDay = new Date(programmeStart);
    endOfDay.setHours(23, 59, 59, 999);
    return programmeStart <= now && now < endOfDay;
  });

  return matched.sort((a, b) => parseXmltvDate(a.start)!.getTime() - parseXmltvDate(b.start)!.getTime());
}

export function getCurrentProgramme(
  programmes: XmltvProgramme[],
  channelTvgId?: string,
  channelName?: string,
  channelTvgName?: string,
  now: Date = new Date(),
): XmltvProgramme | undefined {
  const matched = matchProgrammes(programmes, channelTvgId, channelName, channelTvgName, now);
  return matched[0];
}

export function getNextProgramme(
  programmes: XmltvProgramme[],
  channelTvgId?: string,
  channelName?: string,
  channelTvgName?: string,
  now: Date = new Date(),
): XmltvProgramme | undefined {
  const channelIds = [channelTvgId, channelTvgName, channelName].filter(Boolean) as string[];
  if (channelIds.length === 0) return undefined;
  const upcoming = programmes
    .filter((p) => {
      const start = parseXmltvDate(p.start);
      return start && start > now && channelIds.some((id) => p.channel.toLowerCase() === id.toLowerCase());
    })
    .sort((a, b) => parseXmltvDate(a.start)!.getTime() - parseXmltvDate(b.start)!.getTime());

  return upcoming[0];
}

export function parseXmltvDate(dateStr: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{2})(\d{2})$/.exec(dateStr);

  if (match) {
    const [, year, month, day, hour, min, sec, tzSign, tzMin] = match;
    const tzOffset = parseInt(tzSign) * 60 + parseInt(tzMin);
    const sign = tzSign.startsWith("-") ? -1 : 1;
    const date = new Date(
      Date.UTC(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(min) - sign * tzOffset,
        parseInt(sec),
      ),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const basicMatch = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(dateStr);
  if (basicMatch) {
    const [, year, month, day, hour, min, sec] = basicMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min), parseInt(sec));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

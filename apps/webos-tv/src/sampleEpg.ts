export function createSampleEpg(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const M = pad(now.getMonth() + 1);
  const d = pad(now.getDate());

  function fmt(h: number, m: number) {
    return `${y}${M}${d}${pad(h)}${pad(m)}00 +0000`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="MY IPTV Demo">
  <channel id="demo-news">
    <display-name>Demo News</display-name>
    <icon src="https://placehold.co/160x90/111827/e5e7eb?text=NEWS" />
  </channel>
  <channel id="demo-sports">
    <display-name>Demo Sports</display-name>
    <icon src="https://placehold.co/160x90/164e63/e5e7eb?text=SPORT" />
  </channel>
  <channel id="demo-docs">
    <display-name>Demo Docs</display-name>
    <icon src="https://placehold.co/160x90/1a1a2e/e5e7eb?text=DOCS" />
  </channel>
  <programme channel="demo-news" start="${fmt(now.getHours() - 1, 0)}" stop="${fmt(now.getHours(), 0)}">
    <title>Global Morning Report</title>
    <desc>A fast-moving briefing across world news, weather, and local headlines.</desc>
    <category>News</category>
  </programme>
  <programme channel="demo-news" start="${fmt(now.getHours(), 0)}" stop="${fmt(now.getHours() + 1, 0)}">
    <title>Market Open Briefing</title>
    <desc>Live market analysis, stock picks, and economic updates from the floor.</desc>
    <category>Business</category>
  </programme>
  <programme channel="demo-news" start="${fmt(now.getHours() + 1, 0)}" stop="${fmt(now.getHours() + 2, 0)}">
    <title>Midday Report</title>
    <desc>Key stories, interviews, and breaking news as the day unfolds.</desc>
    <category>News</category>
  </programme>
  <programme channel="demo-sports" start="${fmt(now.getHours() - 1, 0)}" stop="${fmt(now.getHours(), 0)}">
    <title>Matchday Live</title>
    <desc>Live coverage, tactical notes, and key moments from today's featured match.</desc>
    <category>Sports</category>
  </programme>
  <programme channel="demo-sports" start="${fmt(now.getHours(), 0)}" stop="${fmt(now.getHours() + 1, 30)}">
    <title>Post-Match Analysis</title>
    <desc>Expert punditry, replays, and post-match interviews.</desc>
    <category>Sports</category>
  </programme>
  <programme channel="demo-sports" start="${fmt(now.getHours() + 1, 30)}" stop="${fmt(now.getHours() + 3, 0)}">
    <title>Sports Tonight</title>
    <desc>Roundup of the day's scores, highlights, and transfer news.</desc>
    <category>Sports</category>
  </programme>
  <programme channel="demo-docs" start="${fmt(now.getHours() - 1, 30)}" stop="${fmt(now.getHours(), 15)}">
    <title>The Archive Hour</title>
    <desc>Documentary programming and curated long-form stories from the library.</desc>
    <category>Documentary</category>
  </programme>
  <programme channel="demo-docs" start="${fmt(now.getHours(), 15)}" stop="${fmt(now.getHours() + 2, 0)}">
    <title>Nature at Night</title>
    <desc>Explore the natural world after dark, from deep oceans to desert skies.</desc>
    <category>Documentary</category>
  </programme>
  <programme channel="demo-docs" start="${fmt(now.getHours() + 2, 0)}" stop="${fmt(now.getHours() + 3, 30)}">
    <title>Ancient Civilizations</title>
    <desc>Unearthing the mysteries of lost empires through archaeology.</desc>
    <category>Documentary</category>
  </programme>
</tv>`;
}

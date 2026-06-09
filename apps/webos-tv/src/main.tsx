import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Clock3,
  Database,
  FileText,
  Heart,
  Link,
  MonitorPlay,
  Play,
  PlusCircle,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  Star,
  Trash2,
  Tv,
  Wifi,
} from "lucide-react";
import {
  createSourceHealthReport,
  parseM3u,
  type Channel,
} from "@my-iptv/iptv-core";
import { samplePlaylist } from "./samplePlaylist";
import "./styles.css";

type View = "setup" | "live" | "doctor" | "settings" | "player";

const sourceId = "sample-source";
const parsed = parseM3u(samplePlaylist, sourceId);
const healthReport = createSourceHealthReport(
  sourceId,
  parsed.channels,
  parsed.malformedEntries,
);

const demoPrograms = [
  {
    title: "Global Morning Report",
    next: "Market Open Briefing",
    time: "08:00 - 09:00",
    progress: 34,
    description:
      "A fast-moving briefing across world news, weather, and local headlines.",
  },
  {
    title: "Matchday Live",
    next: "Post-Match Analysis",
    time: "09:00 - 11:00",
    progress: 68,
    description:
      "Live coverage, tactical notes, and key moments from today's featured match.",
  },
  {
    title: "The Archive Hour",
    next: "Nature at Night",
    time: "07:45 - 08:45",
    progress: 52,
    description:
      "Documentary programming and curated long-form stories from the library.",
  },
];

function App() {
  const [view, setView] = useState<View>("live");
  const [selectedGroup, setSelectedGroup] = useState("All Channels");
  const [selectedChannelId, setSelectedChannelId] = useState(parsed.channels[0]?.id ?? "");

  const groups = useMemo(
    () => ["All Channels", ...Array.from(new Set(parsed.channels.map((channel) => channel.group ?? "Ungrouped")))],
    [],
  );

  const visibleChannels = useMemo(() => {
    if (selectedGroup === "All Channels") {
      return parsed.channels;
    }

    return parsed.channels.filter((channel) => (channel.group ?? "Ungrouped") === selectedGroup);
  }, [selectedGroup]);

  const selectedChannel =
    parsed.channels.find((channel) => channel.id === selectedChannelId) ?? parsed.channels[0];

  function selectGroup(group: string) {
    setSelectedGroup(group);
    const firstInGroup =
      group === "All Channels"
        ? parsed.channels[0]
        : parsed.channels.find((channel) => (channel.group ?? "Ungrouped") === group);

    if (firstInGroup) {
      setSelectedChannelId(firstInGroup.id);
    }
  }

  return (
    <main className={view === "player" ? "app-frame is-player-mode" : "app-frame"}>
      {view !== "player" ? <NavigationRail activeView={view} onNavigate={setView} /> : null}

      {view === "setup" ? <SourceSetup /> : null}
      {view === "live" ? (
        <LiveTvBrowser
          channels={visibleChannels}
          groups={groups}
          selectedChannel={selectedChannel}
          selectedGroup={selectedGroup}
          onSelectChannel={(channel) => setSelectedChannelId(channel.id)}
          onSelectGroup={selectGroup}
          onWatch={() => setView("player")}
        />
      ) : null}
      {view === "doctor" ? <SourceDoctor /> : null}
      {view === "settings" ? <SettingsScreen onAddSource={() => setView("setup")} /> : null}
      {view === "player" && selectedChannel ? (
        <PlayerScreen channel={selectedChannel} onBack={() => setView("live")} />
      ) : null}
    </main>
  );
}

function NavigationRail({
  activeView,
  onNavigate,
}: {
  activeView: View;
  onNavigate: (view: View) => void;
}) {
  const items = [
    { id: "setup" as const, label: "Sources", icon: Database },
    { id: "live" as const, label: "Live TV", icon: Tv },
    { id: "doctor" as const, label: "Source Health", icon: Activity },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <aside className="side-rail" aria-label="Primary navigation">
      <div className="rail-logo" aria-label="MY IPTV">
        <MonitorPlay size={30} />
      </div>
      <button className="rail-action" aria-label="Search">
        <Search size={26} />
      </button>
      <nav className="rail-nav">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={activeView === item.id ? "rail-action is-active" : "rail-action"}
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={item.label}
            >
              <Icon size={28} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function AppHeader({ kicker }: { kicker: string }) {
  return (
    <header className="app-header">
      <div>
        <strong>MY IPTV</strong>
        <span>{kicker}</span>
      </div>
      <div className="status-icons" aria-label="System status">
        <Wifi size={24} />
        <Clock3 size={24} />
      </div>
    </header>
  );
}

function SourceSetup() {
  return (
    <section className="screen setup-screen">
      <AppHeader kicker="Source Configuration" />
      <div className="setup-intro">
        <h1>Add Source</h1>
        <p>
          Connect a user-provided playlist or provider account. MY IPTV does not provide
          channels, playlists, or media content.
        </p>
      </div>

      <div className="source-type-grid" aria-label="Source type">
        <button className="source-type-card is-focused">
          <Link size={34} />
          <strong>M3U URL</strong>
          <span>Simple link-based playlist import.</span>
        </button>
        <button className="source-type-card">
          <FileText size={34} />
          <strong>XMLTV EPG</strong>
          <span>Optional guide data for current and next programs.</span>
        </button>
        <button className="source-type-card">
          <Server size={34} />
          <strong>Xtream Codes</strong>
          <span>Future API sync for supported providers.</span>
        </button>
      </div>

      <form className="source-form">
        <div className="form-fields">
          <label>
            <span>Playlist Alias</span>
            <input placeholder="e.g. Home playlist" />
          </label>
          <label>
            <span>M3U URL</span>
            <input placeholder="https://provider.example/playlist.m3u" />
          </label>
          <p className="source-note">
            All source data is local in this prototype. Only use playlist URLs you are
            authorized to access.
          </p>
        </div>
        <div className="form-actions">
          <button className="secondary-button" type="button">
            <Wifi size={24} />
            Test Connection
          </button>
          <button className="primary-button" type="button">
            <RefreshCw size={28} />
            Sync Playlist
            <small>Demo fixture loaded</small>
          </button>
        </div>
      </form>
    </section>
  );
}

function LiveTvBrowser({
  channels,
  groups,
  selectedChannel,
  selectedGroup,
  onSelectChannel,
  onSelectGroup,
  onWatch,
}: {
  channels: Channel[];
  groups: string[];
  selectedChannel?: Channel;
  selectedGroup: string;
  onSelectChannel: (channel: Channel) => void;
  onSelectGroup: (group: string) => void;
  onWatch: () => void;
}) {
  const program = demoPrograms[Math.max(0, channels.findIndex((channel) => channel.id === selectedChannel?.id)) % demoPrograms.length];

  return (
    <section className="live-grid">
      <aside className="category-panel" aria-label="Categories">
        <h2>Categories</h2>
        {groups.map((group) => (
          <button
            className={selectedGroup === group ? "category-button is-active" : "category-button"}
            key={group}
            onClick={() => onSelectGroup(group)}
          >
            {group}
            {selectedGroup === group ? <span /> : null}
          </button>
        ))}
      </aside>

      <section className="channel-panel" aria-label="Live channels">
        <div className="panel-heading">
          <h1>Live Channels</h1>
          <span>{channels.length} Channels Available</span>
        </div>

        <div className="channel-stack">
          {channels.map((channel, index) => {
            const rowProgram = demoPrograms[index % demoPrograms.length];
            return (
              <button
                className={selectedChannel?.id === channel.id ? "stitch-channel-card is-focused" : "stitch-channel-card"}
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
              >
                <ChannelLogo channel={channel} />
                <div>
                  <strong>{channel.name}</strong>
                  <span>{rowProgram.title}</span>
                  <progress max="100" value={rowProgram.progress} />
                </div>
                <small>{rowProgram.time}</small>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="program-panel" aria-label="Program details">
        <div className="program-hero">
          <div className="program-hero-shade" />
          <div className="program-channel">
            {selectedChannel ? <ChannelLogo channel={selectedChannel} /> : null}
            <strong>{selectedChannel?.name ?? "No channel"}</strong>
          </div>
        </div>

        <div className="program-body">
          <div className="program-title-row">
            <h2>{program.title}</h2>
            <button className="icon-button" aria-label="Favorite">
              <Star size={28} />
            </button>
          </div>
          <p className="program-meta">{selectedChannel?.group ?? "Live"} · LIVE from user playlist</p>
          <p>{program.description}</p>

          <div className="next-up">
            <h3>Next Up</h3>
            <strong>{program.next}</strong>
            <span>{program.time}</span>
          </div>

          <button className="watch-button" onClick={onWatch}>
            <Play size={24} />
            Watch Now
          </button>
        </div>
      </aside>
    </section>
  );
}

function SourceDoctor() {
  return (
    <section className="screen doctor-screen">
      <AppHeader kicker="Source Doctor" />
      <div className="doctor-heading">
        <h1>Source Health</h1>
        <button className="primary-small">
          <RefreshCw size={24} />
          Refresh All
        </button>
      </div>

      <div className="metric-grid">
        <MetricCard label="Total Channels" value={String(healthReport.totalChannels)} tone="cyan" />
        <MetricCard label="Missing Logos" value={String(healthReport.missingLogos)} tone="neutral" />
        <MetricCard label="Duplicate Groups" value={String(healthReport.duplicateGroups)} tone="gold" />
      </div>

      <div className="doctor-panels">
        <section className="wide-panel">
          <h2>Metadata Coverage</h2>
          <div className="coverage-bar">
            <span style={{ width: `${Math.max(5, 100 - healthReport.missingLogos * 20)}%` }} />
          </div>
          <div className="coverage-stats">
            <div>
              <span>Malformed</span>
              <strong>{healthReport.malformedEntries}</strong>
            </div>
            <div>
              <span>Restricted Hints</span>
              <strong>{healthReport.likelyRestrictedChannels}</strong>
            </div>
            <div>
              <span>Recommendations</span>
              <strong>{healthReport.recommendations.length}</strong>
            </div>
          </div>
        </section>
        <section className="optimization-panel">
          <h2>Optimization</h2>
          <p><Database size={22} /> Catalog parsed locally</p>
          <p><Shield size={22} /> User data stays on device</p>
        </section>
      </div>

      <section className="recommendation-list">
        <div className="recommendation-heading">
          <div>
            <h2>Cleanup Recommendations</h2>
            <p>Actions are stored as reversible overrides, not destructive source edits.</p>
          </div>
          <button className="secondary-button">Review All</button>
        </div>
        {healthReport.recommendations.map((recommendation) => (
          <article className="recommendation-row" key={recommendation.id}>
            <Activity size={34} />
            <div>
              <strong>{recommendation.title}</strong>
              <span>{recommendation.description}</span>
            </div>
            <button className="secondary-button">Details</button>
          </article>
        ))}
      </section>
    </section>
  );
}

function SettingsScreen({ onAddSource }: { onAddSource: () => void }) {
  return (
    <section className="screen settings-screen">
      <AppHeader kicker="Settings" />
      <div className="settings-layout">
        <aside className="settings-menu">
          <h1>Settings</h1>
          <SettingsCard icon={<Database />} title="Manage Sources" text="Add or remove M3U playlists and EPG links." active />
          <SettingsCard icon={<RefreshCw />} title="Refresh Content" text="Force update channels and guide data." />
          <SettingsCard icon={<Shield />} title="Parental PIN" text="Restrict access to sensitive content." />
          <SettingsCard icon={<Trash2 />} title="Clear Data" text="Reset local sources, caches, and settings." danger />
        </aside>

        <section className="settings-detail">
          <h2>Manage Sources</h2>
          <div className="source-row">
            <div>
              <strong>Demo Local M3U</strong>
              <span>Active · {parsed.channels.length} Channels</span>
            </div>
            <button className="icon-button" aria-label="Delete source">
              <Trash2 size={24} />
            </button>
          </div>
          <button className="add-source-button" onClick={onAddSource}>
            <PlusCircle size={28} />
            Add New Playlist Source
          </button>
          <p className="disclaimer">
            MY IPTV is a media player and does not provide content. Users are responsible
            for supplying authorized streaming sources. All prototype data is local.
          </p>
        </section>
      </div>
    </section>
  );
}

function PlayerScreen({ channel, onBack }: { channel: Channel; onBack: () => void }) {
  return (
    <section className="player-screen">
      <video className="player-video" src={channel.streamUrl} autoPlay controls muted playsInline />
      <div className="player-gradient" />
      <header className="player-header">
        <button onClick={onBack}>MY IPTV</button>
        <span>LIVE</span>
      </header>
      <div className="channel-stepper" aria-label="Channel controls">
        <span>⌃</span>
        <strong>P+</strong>
        <span>⌄</span>
        <strong>P-</strong>
      </div>
      <footer className="player-overlay">
        <div>
          <span>CHANNEL</span>
          <h1>{channel.name}</h1>
        </div>
        <div>
          <h2>{demoPrograms[0].title}</h2>
          <p>Ends in 42 mins · {channel.streamFormat.toUpperCase()}</p>
        </div>
        <button className="icon-button" aria-label="Favorite">
          <Heart size={34} />
        </button>
        <progress max="100" value="68" />
      </footer>
    </section>
  );
}

function ChannelLogo({ channel }: { channel: Channel }) {
  if (channel.logoUrl) {
    return <img className="logo-tile" src={channel.logoUrl} alt="" />;
  }

  return <span className="logo-tile">{channel.name.slice(0, 2).toUpperCase()}</span>;
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "cyan" | "gold" | "neutral" }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SettingsCard({
  icon,
  title,
  text,
  active,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button className={active ? "settings-card is-active" : danger ? "settings-card is-danger" : "settings-card"}>
      {icon}
      <strong>{title}</strong>
      <span>{text}</span>
    </button>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

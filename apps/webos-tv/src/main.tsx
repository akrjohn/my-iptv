import { StrictMode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { FormEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowLeft,
  Clock3,
  Database,
  FastForward,
  FileText,
  Heart,
  Info,
  Link,
  MonitorPlay,
  Pause,
  Play,
  PlusCircle,
  RefreshCw,
  Rewind,
  Search,
  Server,
  Settings,
  Shield,
  Star,
  Trash2,
  Tv,
  Volume2,
  VolumeX,
  Wifi,
} from "lucide-react";
import {
  createSourceHealthReport,
  parseM3u,
  syncM3uPlaylist,
  type Channel,
  type M3uSource,
  type SourceSyncError,
} from "@my-iptv/iptv-core";
import { samplePlaylist } from "./samplePlaylist";
import { createCatalogStorage, type CatalogState } from "./catalogStorage";
import "./styles.css";

type View = "setup" | "live" | "doctor" | "settings" | "player";

const sourceId = "sample-source";
const parsed = parseM3u(samplePlaylist, sourceId);
const demoSource: M3uSource = {
  id: sourceId,
  type: "m3u",
  name: "Demo Local M3U",
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  lastSyncedAt: new Date(0).toISOString(),
  syncStatus: "success",
};

type SourceSetupStatus =
  | { state: "idle" }
  | { state: "testing" }
  | { state: "syncing" }
  | { state: "success"; message: string }
  | { state: "error"; error: SourceSyncError };

type SourceActionStatus =
  | { state: "idle" }
  | { state: "working"; message: string }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

type PlayerStatus = "idle" | "playing" | "buffering" | "failed" | "retrying";

const catalogStorage = createCatalogStorage();

const demoCatalog: CatalogState = {
  sources: [demoSource],
  selectedSourceId: demoSource.id,
  channelsBySource: { [demoSource.id]: parsed.channels },
  malformedEntriesBySource: { [demoSource.id]: parsed.malformedEntries },
  favoriteChannelIds: [],
  recentChannelIds: [],
};

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
  const [catalog, setCatalog] = useState<CatalogState>(demoCatalog);
  const [hasLoadedCatalog, setHasLoadedCatalog] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SourceSetupStatus>({ state: "idle" });
  const [sourceActionStatus, setSourceActionStatus] = useState<SourceActionStatus>({ state: "idle" });
  const [selectedGroup, setSelectedGroup] = useState("All Channels");
  const [categoryScrollTop, setCategoryScrollTop] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const channels = catalog.channelsBySource[catalog.selectedSourceId] ?? [];
  const currentSource =
    catalog.sources.find((source) => source.id === catalog.selectedSourceId) ?? catalog.sources[0];
  const [selectedChannelId, setSelectedChannelId] = useState(channels[0]?.id ?? "");
  const [previousChannelId, setPreviousChannelId] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadSavedCatalog() {
      try {
        const savedCatalog = await catalogStorage.load();

        if (isActive && savedCatalog) {
          setCatalog(restoreCatalog(savedCatalog));
        }
      } catch {
        if (isActive) {
          setSourceActionStatus({
            state: "error",
            message: "Catalog storage could not be loaded. Demo data is available.",
          });
        }
      } finally {
        if (isActive) {
          setHasLoadedCatalog(true);
        }
      }
    }

    void loadSavedCatalog();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedCatalog) {
      return;
    }

    void catalogStorage.save(catalog).catch(() => {
      setSourceActionStatus({
        state: "error",
        message: "Catalog storage could not be saved. Use Clear Local Data if this persists.",
      });
    });
  }, [catalog, hasLoadedCatalog]);

  useEffect(() => {
    if (!channels.some((channel) => channel.id === selectedChannelId)) {
      setSelectedChannelId(channels[0]?.id ?? "");
    }
  }, [channels, selectedChannelId]);

  const groups = useMemo(
    () => ["All Channels", ...Array.from(new Set(channels.map((channel) => channel.group ?? "Ungrouped")))],
    [channels],
  );

  const searchedChannels = useMemo(() => {
    const query = normalizeSearchQuery(searchQuery);

    if (!query) {
      return channels;
    }

    return channels.filter((channel) => channelMatchesSearch(channel, query));
  }, [channels, searchQuery]);

  const visibleChannels = useMemo(() => {
    if (searchQuery.trim()) {
      return searchedChannels;
    }

    if (selectedGroup === "All Channels") {
      return channels;
    }

    return channels.filter((channel) => (channel.group ?? "Ungrouped") === selectedGroup);
  }, [channels, searchedChannels, searchQuery, selectedGroup]);

  const selectedChannel =
    channels.find((channel) => channel.id === selectedChannelId) ?? channels[0];

  useEffect(() => {
    if (!visibleChannels.some((channel) => channel.id === selectedChannelId)) {
      setSelectedChannelId(visibleChannels[0]?.id ?? "");
    }
  }, [selectedChannelId, visibleChannels]);

  const healthReport = useMemo(
    () =>
      createSourceHealthReport(
        catalog.selectedSourceId,
        channels,
        catalog.malformedEntriesBySource[catalog.selectedSourceId] ?? 0,
      ),
    [catalog.malformedEntriesBySource, catalog.selectedSourceId, channels],
  );

  function selectGroup(group: string) {
    setSearchQuery("");
    setSelectedGroup(group);
    const firstInGroup =
      group === "All Channels"
        ? channels[0]
        : channels.find((channel) => (channel.group ?? "Ungrouped") === group);

    if (firstInGroup) {
      setSelectedChannelId(firstInGroup.id);
    }
  }

  function selectChannel(channel: Channel) {
    setSelectedChannelId((currentId) => {
      if (currentId && currentId !== channel.id) {
        setPreviousChannelId(currentId);
      }

      return channel.id;
    });
  }

  function openSearch() {
    setView("live");
    setIsSearchOpen(true);
  }

  function closeSearch() {
    setSearchQuery("");
    setIsSearchOpen(false);
  }

  async function syncPlaylist({ name, playlistUrl }: { name: string; playlistUrl: string }) {
    setSetupStatus({ state: "syncing" });
    const result = await syncM3uPlaylist({
      sourceId: createSourceId(name),
      name,
      playlistUrl,
    });

    if (!result.ok) {
      setSetupStatus({ state: "error", error: result.error });
      setCatalog((current) => ({
        ...current,
        sources: upsertSource(current.sources, result.source),
      }));
      return;
    }

    setCatalog((current) => ({
      sources: upsertSource(current.sources, result.source),
      selectedSourceId: result.source.id,
      channelsBySource: {
        ...current.channelsBySource,
        [result.source.id]: applyFavoriteFlags(result.channels, current.favoriteChannelIds),
      },
      malformedEntriesBySource: {
        ...current.malformedEntriesBySource,
        [result.source.id]: result.malformedEntries,
      },
      favoriteChannelIds: current.favoriteChannelIds,
      recentChannelIds: current.recentChannelIds.filter((id) =>
        result.channels.some((channel) => channel.id === id),
      ),
    }));
    setSelectedGroup("All Channels");
    setSelectedChannelId(result.channels[0]?.id ?? "");
    setSetupStatus({
      state: "success",
      message: `${result.channels.length} channels synced locally.`,
    });
    setView("live");
  }

  async function testPlaylistConnection({ name, playlistUrl }: { name: string; playlistUrl: string }) {
    setSetupStatus({ state: "testing" });
    const result = await syncM3uPlaylist({
      sourceId: createSourceId(`test-${name}`),
      name,
      playlistUrl,
    });

    if (!result.ok) {
      setSetupStatus({ state: "error", error: result.error });
      return;
    }

    setSetupStatus({
      state: "success",
      message: `Connection OK. ${result.channels.length} channels parsed; ${result.malformedEntries} malformed entries found.`,
    });
  }

  async function resyncSource(source: M3uSource) {
    if (!source.playlistUrl) {
      setSourceActionStatus({
        state: "error",
        message: "This source does not have a saved playlist URL to resync.",
      });
      return;
    }

    setSourceActionStatus({ state: "working", message: `Resyncing ${source.name}...` });
    const result = await syncM3uPlaylist({
      sourceId: source.id,
      name: source.name,
      playlistUrl: source.playlistUrl,
    });

    if (!result.ok) {
      setCatalog((current) => ({
        ...current,
        sources: upsertSource(current.sources, {
          ...source,
          updatedAt: result.source.updatedAt,
          syncStatus: "failed",
          syncError: result.error,
        }),
      }));
      setSourceActionStatus({ state: "error", message: result.error.message });
      return;
    }

    setCatalog((current) => {
      const nextChannels = applyFavoriteFlags(result.channels, current.favoriteChannelIds);
      const nextChannelIds = new Set(nextChannels.map((channel) => channel.id));
      const favoriteChannelIds = current.favoriteChannelIds.filter((id) => nextChannelIds.has(id));
      const recentChannelIds = current.recentChannelIds.filter((id) => nextChannelIds.has(id));

      return {
        ...current,
        sources: upsertSource(current.sources, {
          ...source,
          ...result.source,
          createdAt: source.createdAt,
        }),
        selectedSourceId: result.source.id,
        channelsBySource: {
          ...current.channelsBySource,
          [result.source.id]: applyFavoriteFlags(result.channels, favoriteChannelIds),
        },
        malformedEntriesBySource: {
          ...current.malformedEntriesBySource,
          [result.source.id]: result.malformedEntries,
        },
        favoriteChannelIds,
        recentChannelIds,
      };
    });
    setSelectedGroup("All Channels");
    setSelectedChannelId(result.channels[0]?.id ?? "");
    setSourceActionStatus({
      state: "success",
      message: `${source.name} resynced. ${result.channels.length} channels available.`,
    });
  }

  function deleteSource(source: M3uSource) {
    if (source.id === demoSource.id) {
      setSourceActionStatus({
        state: "error",
        message: "The demo source is kept as the fallback catalog.",
      });
      return;
    }

    setCatalog((current) => {
      const sources = current.sources.filter((item) => item.id !== source.id);
      const channelsBySource = { ...current.channelsBySource };
      const malformedEntriesBySource = { ...current.malformedEntriesBySource };
      const removedChannelIds = new Set(channelsBySource[source.id]?.map((channel) => channel.id) ?? []);
      delete channelsBySource[source.id];
      delete malformedEntriesBySource[source.id];
      const safeSources = sources.length > 0 ? sources : demoCatalog.sources;
      const selectedSourceId =
        current.selectedSourceId === source.id
          ? safeSources[0]?.id ?? demoCatalog.selectedSourceId
          : current.selectedSourceId;

      return {
        ...current,
        sources: safeSources,
        selectedSourceId,
        channelsBySource: sources.length > 0 ? channelsBySource : demoCatalog.channelsBySource,
        malformedEntriesBySource:
          sources.length > 0 ? malformedEntriesBySource : demoCatalog.malformedEntriesBySource,
        favoriteChannelIds: current.favoriteChannelIds.filter((id) => !removedChannelIds.has(id)),
        recentChannelIds: current.recentChannelIds.filter((id) => !removedChannelIds.has(id)),
      };
    });
    setSelectedGroup("All Channels");
    setPreviousChannelId("");
    setSourceActionStatus({ state: "success", message: `${source.name} was removed.` });
  }

  function clearLocalData() {
    void catalogStorage.reset().catch(() => {
      setSourceActionStatus({
        state: "error",
        message: "Catalog storage could not be fully reset.",
      });
    });
    setCatalog(demoCatalog);
    setSetupStatus({ state: "idle" });
    setSourceActionStatus({ state: "success", message: "Local source data was reset to the demo catalog." });
    setSelectedGroup("All Channels");
    setSelectedChannelId(demoCatalog.channelsBySource[demoSource.id]?.[0]?.id ?? "");
    setPreviousChannelId("");
    setView("live");
  }

  function toggleFavorite(channel: Channel) {
    setCatalog((current) => {
      const isFavorite = current.favoriteChannelIds.includes(channel.id);
      const favoriteChannelIds = isFavorite
        ? current.favoriteChannelIds.filter((id) => id !== channel.id)
        : [channel.id, ...current.favoriteChannelIds];

      return {
        ...current,
        favoriteChannelIds,
        channelsBySource: mapChannels(current.channelsBySource, (item) => ({
          ...item,
          isFavorite: favoriteChannelIds.includes(item.id),
        })),
      };
    });
  }

  function watchSelectedChannel() {
    if (!selectedChannel) {
      return;
    }

    addRecentChannel(selectedChannel.id);
    setView("player");
  }

  function changePlayerChannel(direction: 1 | -1) {
    if (!selectedChannel || channels.length === 0) {
      return;
    }

    const currentIndex = Math.max(0, channels.findIndex((channel) => channel.id === selectedChannel.id));
    const nextIndex = (currentIndex + direction + channels.length) % channels.length;
    const nextChannel = channels[nextIndex];

    if (!nextChannel) {
      return;
    }

    setPreviousChannelId(selectedChannel.id);
    setSelectedChannelId(nextChannel.id);
    addRecentChannel(nextChannel.id);
  }

  function jumpToLastChannel() {
    if (!previousChannelId || previousChannelId === selectedChannelId) {
      return;
    }

    const previousChannel = channels.find((channel) => channel.id === previousChannelId);

    if (!previousChannel) {
      return;
    }

    setPreviousChannelId(selectedChannelId);
    setSelectedChannelId(previousChannel.id);
    addRecentChannel(previousChannel.id);
  }

  function addRecentChannel(channelId: string) {
    setCatalog((current) => ({
      ...current,
      recentChannelIds: [channelId, ...current.recentChannelIds.filter((id) => id !== channelId)].slice(0, 20),
    }));
  }

  function updateChannelValidationStatus(
    channelId: string,
    validationStatus: Channel["validationStatus"],
  ) {
    setCatalog((current) => ({
      ...current,
      channelsBySource: mapChannels(current.channelsBySource, (channel) =>
        channel.id === channelId
          ? {
              ...channel,
              lastValidatedAt: new Date().toISOString(),
              validationStatus,
            }
          : channel,
      ),
    }));
  }

  return (
    <main className={view === "player" ? "app-frame is-player-mode" : "app-frame"}>
      {view !== "player" ? (
        <NavigationRail activeView={view} onNavigate={setView} onOpenSearch={openSearch} />
      ) : null}

      {view === "setup" ? (
        <SourceSetup
          status={setupStatus}
          onSync={syncPlaylist}
          onTestConnection={testPlaylistConnection}
        />
      ) : null}
      {view === "live" ? (
        <LiveTvBrowser
          channels={visibleChannels}
          groups={groups}
          selectedChannel={selectedChannel}
          selectedGroup={selectedGroup}
          categoryScrollTop={categoryScrollTop}
          isSearchOpen={isSearchOpen}
          searchQuery={searchQuery}
          onSelectChannel={selectChannel}
          onCategoryScroll={setCategoryScrollTop}
          onCloseSearch={closeSearch}
          onSelectGroup={selectGroup}
          onSearchQueryChange={setSearchQuery}
          onToggleFavorite={toggleFavorite}
          onWatch={watchSelectedChannel}
        />
      ) : null}
      {view === "doctor" ? <SourceDoctor report={healthReport} source={currentSource} onRefresh={currentSource?.playlistUrl ? () => resyncSource(currentSource) : undefined} /> : null}
      {view === "settings" ? (
        <SettingsScreen
          channelsBySource={catalog.channelsBySource}
          selectedSourceId={catalog.selectedSourceId}
          status={sourceActionStatus}
          sources={catalog.sources}
          onAddSource={() => setView("setup")}
          onClearLocalData={clearLocalData}
          onDeleteSource={deleteSource}
          onResyncSource={(source) => void resyncSource(source)}
        />
      ) : null}
      {view === "player" && selectedChannel ? (
        <PlayerScreen
          channel={selectedChannel}
          program={demoPrograms[Math.max(0, channels.findIndex((c) => c.id === selectedChannel.id)) % demoPrograms.length]}
          hasLastChannel={Boolean(previousChannelId)}
          onBack={() => setView("live")}
          onChannelDown={() => changePlayerChannel(-1)}
          onChannelUp={() => changePlayerChannel(1)}
          onLastChannel={jumpToLastChannel}
          onPlaybackValidated={updateChannelValidationStatus}
          onToggleFavorite={toggleFavorite}
        />
      ) : null}
    </main>
  );
}

function NavigationRail({
  activeView,
  onNavigate,
  onOpenSearch,
}: {
  activeView: View;
  onNavigate: (view: View) => void;
  onOpenSearch: () => void;
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
      <button className="rail-action" aria-label="Search" onClick={onOpenSearch} title="Search">
        <Search size={26} />
        <span>Search</span>
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

function SourceSetup({
  status,
  onSync,
  onTestConnection,
}: {
  status: SourceSetupStatus;
  onSync: (input: { name: string; playlistUrl: string }) => Promise<void>;
  onTestConnection: (input: { name: string; playlistUrl: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const isWorking = status.state === "syncing" || status.state === "testing";
  const canSync = Boolean(name.trim() && playlistUrl.trim() && !isWorking);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSync) {
      return;
    }

    await onSync({
      name: name.trim(),
      playlistUrl: playlistUrl.trim(),
    });
  }

  async function handleTestConnection() {
    if (!canSync) {
      return;
    }

    await onTestConnection({
      name: name.trim(),
      playlistUrl: playlistUrl.trim(),
    });
  }

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

      <form className="source-form" onSubmit={handleSubmit}>
        <div className="form-fields">
          <label>
            <span>Playlist Alias</span>
            <input
              autoComplete="off"
              placeholder="e.g. Home playlist"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            <span>M3U URL</span>
            <input
              autoComplete="off"
              inputMode="url"
              placeholder="https://provider.example/playlist.m3u"
              value={playlistUrl}
              onChange={(event) => setPlaylistUrl(event.target.value)}
            />
          </label>
          {status.state === "error" ? (
            <p className="sync-message is-error">
              <strong>{formatErrorCode(status.error.code)}</strong>
              <span>{status.error.message}</span>
            </p>
          ) : null}
          {status.state === "success" ? (
            <p className="sync-message is-success">
              <strong>{status.message.startsWith("Connection OK") ? "Connection OK" : "Sync complete"}</strong>
              <span>{status.message}</span>
            </p>
          ) : null}
          <p className="source-note">
            All source data is local in this prototype. Only use playlist URLs you are
            authorized to access.
          </p>
        </div>
        <div className="form-actions">
          <button className="secondary-button" type="button" disabled={!canSync} onClick={() => void handleTestConnection()}>
            <Wifi size={24} />
            {status.state === "testing" ? "Testing" : "Test Connection"}
          </button>
          <button className="primary-button" type="submit" disabled={!canSync}>
            <RefreshCw size={28} />
            {status.state === "syncing" ? "Syncing" : "Sync Playlist"}
            <small>{isWorking ? "Fetching playlist" : "Save locally"}</small>
          </button>
        </div>
          {isWorking ? (
            <div className="sync-progress-bar">
              <div className="sync-progress-bar-fill" />
            </div>
          ) : null}
        </form>
      </section>
    );
  }


function LiveTvBrowser({
  channels,
  groups,
  selectedChannel,
  selectedGroup,
  categoryScrollTop,
  isSearchOpen,
  searchQuery,
  onCategoryScroll,
  onCloseSearch,
  onSelectChannel,
  onSelectGroup,
  onSearchQueryChange,
  onToggleFavorite,
  onWatch,
}: {
  channels: Channel[];
  groups: string[];
  selectedChannel?: Channel;
  selectedGroup: string;
  categoryScrollTop: number;
  isSearchOpen: boolean;
  searchQuery: string;
  onCategoryScroll: (scrollTop: number) => void;
  onCloseSearch: () => void;
  onSelectChannel: (channel: Channel) => void;
  onSelectGroup: (group: string) => void;
  onSearchQueryChange: (query: string) => void;
  onToggleFavorite: (channel: Channel) => void;
  onWatch: () => void;
}) {
  const categoryPanelRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const channelStackRef = useRef<HTMLDivElement>(null);
  const program = demoPrograms[Math.max(0, channels.findIndex((channel) => channel.id === selectedChannel?.id)) % demoPrograms.length];
  const isSearching = Boolean(searchQuery.trim());

  const virtualizer = useVirtualizer({
    count: channels.length,
    getScrollElement: () => channelStackRef.current,
    estimateSize: () => 190,
    overscan: 5,
    getItemKey: (index) => channels[index].id,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  useLayoutEffect(() => {
    const panel = categoryPanelRef.current;

    if (panel) {
      panel.scrollTop = categoryScrollTop;
    }
  }, [categoryScrollTop]);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  function focusFirstResult() {
    if (channels.length === 0) return;

    virtualizer.scrollToIndex(0, { align: "start" });

    requestAnimationFrame(() => {
      const firstButton = channelStackRef.current?.querySelector<HTMLButtonElement>("[data-virtual-index=\"0\"]");
      firstButton?.focus();
    });
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCloseSearch();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusFirstResult();
      return;
    }

    if (event.key === "Enter" && channels[0]) {
      event.preventDefault();
      onSelectChannel(channels[0]);
      onWatch();
    }
  }

  return (
    <section className="live-grid">
      <aside
        className="category-panel"
        aria-label="Categories"
        ref={categoryPanelRef}
        onScroll={(event) => onCategoryScroll(event.currentTarget.scrollTop)}
      >
        <h2>Categories</h2>
        {groups.map((group) => (
          <button
            className={selectedGroup === group ? "category-button is-active" : "category-button"}
            key={group}
            onClick={() => {
              onCategoryScroll(categoryPanelRef.current?.scrollTop ?? 0);
              onSelectGroup(group);
            }}
          >
            {group}
            {selectedGroup === group ? <span /> : null}
          </button>
        ))}
      </aside>

      <section className="channel-panel" aria-label="Live channels">
        <div className="panel-heading">
          <div>
            <h1>{isSearching ? "Search Results" : "Live Channels"}</h1>
            {isSearchOpen ? (
              <div className="channel-search" role="search">
                <Search size={22} />
                <input
                  ref={searchInputRef}
                  aria-label="Search channels"
                  placeholder="Search channels, groups, or TVG names"
                  value={searchQuery}
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchQuery ? (
                  <button type="button" onClick={onCloseSearch}>
                    Clear
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <span>{channels.length} {isSearching ? "Matches" : "Channels Available"}</span>
        </div>

        <div className="channel-stack" ref={channelStackRef}>
          {channels.length === 0 && !isSearching ? (
            <div className="channel-skeleton-stack">
              {Array.from({ length: 5 }).map((_, i) => (
                <div className="skeleton-card" key={i}>
                  <div className="skeleton-shimmer skeleton-logo" />
                  <div>
                    <div className="skeleton-shimmer skeleton-text" />
                    <div className="skeleton-shimmer skeleton-text-short" />
                    <div className="skeleton-shimmer skeleton-progress" />
                  </div>
                  <div className="skeleton-shimmer skeleton-time" />
                </div>
              ))}
            </div>
          ) : null}
          {channels.length === 0 && isSearching ? (
            <div className="empty-channel-state">
              <strong>No channels found</strong>
              <span>Try a different channel name or category.</span>
            </div>
          ) : null}
          <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const channel = channels[virtualItem.index];
              const rowProgram = demoPrograms[virtualItem.index % demoPrograms.length];
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  className="virtual-channel-row"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <button
                    className={selectedChannel?.id === channel.id ? "stitch-channel-card is-focused" : "stitch-channel-card"}
                    data-virtual-index={virtualItem.index}
                    style={{ margin: 0 }}
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
                </div>
              );
            })}
          </div>
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
            <button
              className={selectedChannel?.isFavorite ? "icon-button is-favorite" : "icon-button"}
              aria-label="Favorite"
              onClick={() => selectedChannel && onToggleFavorite(selectedChannel)}
            >
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

function SourceDoctor({ report, source, onRefresh }: { report: ReturnType<typeof createSourceHealthReport>; source?: M3uSource; onRefresh?: () => Promise<void> }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    if (!onRefresh || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <section className="screen doctor-screen">
      <AppHeader kicker="Source Doctor" />
      <div className="doctor-heading">
        <h1>Source Health</h1>
        <button className="primary-small" disabled={isRefreshing || !onRefresh} onClick={() => void handleRefresh()}>
          <RefreshCw size={24} className={isRefreshing ? "spin" : undefined} />
          {isRefreshing ? "Refreshing" : "Refresh All"}
        </button>
      </div>

      <div className="metric-grid">
        <MetricCard label="Total Channels" value={String(report.totalChannels)} tone="cyan" />
        <MetricCard label="Missing Logos" value={String(report.missingLogos)} tone="neutral" />
        <MetricCard label="Duplicate Groups" value={String(report.duplicateGroups)} tone="gold" />
      </div>

      <div className="doctor-panels">
        <section className="wide-panel">
          <h2>Metadata Coverage</h2>
          <div className="coverage-bar">
            <span style={{ width: `${metadataCoverage(report)}%` }} />
          </div>
          <div className="coverage-stats">
            <div>
              <span>Malformed</span>
              <strong>{report.malformedEntries}</strong>
            </div>
            <div>
              <span>Restricted Hints</span>
              <strong>{report.likelyRestrictedChannels}</strong>
            </div>
            <div>
              <span>Recommendations</span>
              <strong>{report.recommendations.length}</strong>
            </div>
          </div>
        </section>
        <section className="optimization-panel">
          <h2>Optimization</h2>
          <p><Database size={22} /> {source?.name ?? "Catalog"} parsed locally</p>
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
        {report.recommendations.map((recommendation) => (
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

function SettingsScreen({
  channelsBySource,
  selectedSourceId,
  status,
  sources,
  onAddSource,
  onClearLocalData,
  onDeleteSource,
  onResyncSource,
}: {
  channelsBySource: Record<string, Channel[]>;
  selectedSourceId: string;
  status: SourceActionStatus;
  sources: M3uSource[];
  onAddSource: () => void;
  onClearLocalData: () => void;
  onDeleteSource: (source: M3uSource) => void;
  onResyncSource: (source: M3uSource) => void;
}) {
  const selectedSource = sources.find((source) => source.id === selectedSourceId);

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
          {status.state !== "idle" ? (
            <p className={`source-action-message is-${status.state}`}>
              {status.message}
            </p>
          ) : null}
          {sources.map((source) => (
            <div className="source-row" key={source.id}>
              <div>
                <strong>{source.name}</strong>
                <span>
                  {source.id === selectedSourceId ? "Active" : "Saved"} ·{" "}
                  {channelsBySource[source.id]?.length ?? 0} Channels · {formatSyncStatus(source)}
                </span>
              </div>
              <div className="source-row-actions">
                <button
                  className="icon-button"
                  aria-label={`Resync ${source.name}`}
                  disabled={!source.playlistUrl || status.state === "working"}
                  onClick={() => onResyncSource(source)}
                >
                  <RefreshCw size={24} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${source.name}`}
                  disabled={source.id === demoSource.id || status.state === "working"}
                  onClick={() => onDeleteSource(source)}
                >
                  <Trash2 size={24} />
                </button>
              </div>
            </div>
          ))}
          <div className="source-management-actions">
            <button
              className="secondary-button"
              disabled={!selectedSource?.playlistUrl || status.state === "working"}
              onClick={() => selectedSource && onResyncSource(selectedSource)}
            >
              <RefreshCw size={24} />
              Resync Active Source
            </button>
            <button className="secondary-button danger-button" onClick={onClearLocalData} disabled={status.state === "working"}>
              <Trash2 size={24} />
              Clear Local Data
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

function PlayerScreen({
  channel,
  program,
  hasLastChannel,
  onBack,
  onChannelDown,
  onChannelUp,
  onLastChannel,
  onPlaybackValidated,
  onToggleFavorite,
}: {
  channel: Channel;
  program: { title: string; next: string; time: string; progress: number; description: string };
  hasLastChannel: boolean;
  onBack: () => void;
  onChannelDown: () => void;
  onChannelUp: () => void;
  onLastChannel: () => void;
  onPlaybackValidated: (
    channelId: string,
    validationStatus: Channel["validationStatus"],
  ) => void;
  onToggleFavorite: (channel: Channel) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [canSeek, setCanSeek] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>("idle");
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);

  useEffect(() => {
    setPlayerStatus("idle");
    setCanSeek(false);
    setIsOverlayVisible(true);
    screenRef.current?.focus();
  }, [channel.id]);

  useEffect(() => {
    if (!isOverlayVisible || isPaused || playerStatus === "buffering" || playerStatus === "failed") {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setIsOverlayVisible(false);
    }, 5000);

    return () => window.clearTimeout(timerId);
  }, [isOverlayVisible, isPaused, playerStatus]);

  async function togglePlay() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      await video.play();
    } else {
      video.pause();
    }
  }

  function toggleMute() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  function updateSeekState() {
    const video = videoRef.current;

    if (!video) {
      setCanSeek(false);
      return;
    }

    setCanSeek(videoCanSeek(video));
  }

  function seekBy(seconds: number) {
    const video = videoRef.current;

    if (!video || !videoCanSeek(video)) {
      return;
    }

    const rangeCount = video.seekable.length;
    const minimum = rangeCount > 0 ? video.seekable.start(0) : 0;
    const maximum = rangeCount > 0
      ? video.seekable.end(rangeCount - 1)
      : Number.isFinite(video.duration)
        ? video.duration
        : video.currentTime;

    video.currentTime = clamp(video.currentTime + seconds, minimum, maximum);
  }

  async function retryPlayback() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    setPlayerStatus("retrying");
    video.load();

    try {
      await video.play();
    } catch {
      setPlayerStatus("failed");
      onPlaybackValidated(channel.id, "failed");
    }
  }

  function markPlaying() {
    setPlayerStatus("playing");
    onPlaybackValidated(channel.id, "playable");
  }

  function markBuffering() {
    if (playerStatus !== "retrying") {
      setPlayerStatus("buffering");
    }
  }

  function markFailed() {
    setPlayerStatus("failed");
    onPlaybackValidated(channel.id, "failed");
  }

  function handlePlayerKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key.toLowerCase() === "i") {
      event.preventDefault();
      setIsOverlayVisible((current) => !current);
      screenRef.current?.focus();
      return;
    }

    if (event.key === "Escape" || event.key === "Backspace") {
      event.preventDefault();
      onBack();
      return;
    }

    setIsOverlayVisible(true);

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekBy(-10);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      seekBy(10);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      onChannelUp();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      onChannelDown();
      return;
    }

    if (event.key.toLowerCase() === "l") {
      event.preventDefault();
      onLastChannel();
      return;
    }

    const target = event.target;

    if (target instanceof HTMLButtonElement) {
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      void togglePlay();
    }
  }

  return (
    <section
      className={isOverlayVisible ? "player-screen" : "player-screen is-overlay-hidden"}
      ref={screenRef}
      tabIndex={-1}
      onKeyDown={handlePlayerKeyDown}
      onMouseMove={() => setIsOverlayVisible(true)}
      onFocus={() => setIsOverlayVisible(true)}
    >
      <video
        className="player-video"
        ref={videoRef}
        src={channel.streamUrl}
        autoPlay
        muted={isMuted}
        playsInline
        onPause={() => setIsPaused(true)}
        onPlay={() => {
          setIsPaused(false);
          markPlaying();
        }}
        onPlaying={markPlaying}
        onCanPlay={markPlaying}
        onError={markFailed}
        onStalled={markBuffering}
        onWaiting={markBuffering}
        onLoadedMetadata={updateSeekState}
        onDurationChange={updateSeekState}
        onProgress={updateSeekState}
        onTimeUpdate={updateSeekState}
        onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
      />
      <div className="player-gradient" />
      {!isOverlayVisible && (playerStatus === "buffering" || playerStatus === "failed" || playerStatus === "retrying") ? (
        <p className={`player-mini-status is-${playerStatus}`}>{formatPlayerStatus(playerStatus)}</p>
      ) : null}
      <header className="player-header">
        <button className="player-back-button" onClick={onBack}>
          <ArrowLeft size={30} />
          Back to Live TV
        </button>
        <span>LIVE</span>
      </header>
      <div className="channel-stepper" aria-label="Channel controls">
        <button aria-label="Channel up" onClick={onChannelUp}>
          <span>⌃</span>
          <strong>P+</strong>
        </button>
        <button aria-label="Channel down" onClick={onChannelDown}>
          <span>⌄</span>
          <strong>P-</strong>
        </button>
      </div>
      <footer className="player-overlay">
        <div>
          <span>CHANNEL</span>
          <h1>{channel.name}</h1>
        </div>
        <div>
          <h2>{program.title}</h2>
          <p>
            {program.time} · {channel.streamFormat.toUpperCase()} ·{" "}
            {canSeek ? "Seek enabled" : "Live seeking unavailable"}
          </p>
          <p className={`player-status is-${playerStatus}`}>
            {formatPlayerStatus(playerStatus)}
          </p>
        </div>
        <div className="player-controls" aria-label="Playback controls">
          <button className="icon-button" aria-label={isOverlayVisible ? "Hide player info" : "Show player info"} onClick={() => setIsOverlayVisible((current) => !current)}>
            <Info size={34} />
          </button>
          <button
            className="last-channel-button"
            disabled={!hasLastChannel}
            onClick={onLastChannel}
          >
            Last
          </button>
          <button
            className="icon-button"
            aria-label="Back 10 seconds"
            disabled={!canSeek}
            onClick={() => seekBy(-10)}
          >
            <Rewind size={34} />
          </button>
          <button className="icon-button" aria-label={isPaused ? "Play" : "Pause"} onClick={() => void togglePlay()}>
            {isPaused ? <Play size={34} /> : <Pause size={34} />}
          </button>
          <button
            className="icon-button"
            aria-label="Forward 10 seconds"
            disabled={!canSeek}
            onClick={() => seekBy(10)}
          >
            <FastForward size={34} />
          </button>
          <button className="icon-button" aria-label={isMuted ? "Unmute" : "Mute"} onClick={toggleMute}>
            {isMuted ? <VolumeX size={34} /> : <Volume2 size={34} />}
          </button>
          <button
            className="retry-button"
            onClick={() => void retryPlayback()}
          >
            <RefreshCw size={24} />
            Retry
          </button>
        </div>
        <button
          className={channel.isFavorite ? "icon-button is-favorite" : "icon-button"}
          aria-label="Favorite"
          onClick={() => onToggleFavorite(channel)}
        >
          <Heart size={34} />
        </button>
        <progress max="100" value="68" />
      </footer>
    </section>
  );
}

function videoCanSeek(video: HTMLVideoElement): boolean {
  if (Number.isFinite(video.duration) && video.duration > 0) {
    return true;
  }

  for (let index = 0; index < video.seekable.length; index += 1) {
    if (video.seekable.end(index) - video.seekable.start(index) > 3) {
      return true;
    }
  }

  return false;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatPlayerStatus(playerStatus: PlayerStatus): string {
  if (playerStatus === "buffering") {
    return "Buffering...";
  }

  if (playerStatus === "failed") {
    return "Playback failed";
  }

  if (playerStatus === "retrying") {
    return "Retrying...";
  }

  if (playerStatus === "playing") {
    return "Playing";
  }

  return "Loading stream";
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

function restoreCatalog(catalog: CatalogState): CatalogState {
  const sources = catalog.sources.length > 0 ? catalog.sources : demoCatalog.sources;
  const selectedSourceId = catalog.selectedSourceId || sources[0]?.id;

  if (!selectedSourceId || !catalog.channelsBySource[selectedSourceId]) {
    return demoCatalog;
  }

  return {
    sources,
    selectedSourceId,
    channelsBySource: mapChannels(catalog.channelsBySource, (channel) => ({
      ...channel,
      isFavorite: catalog.favoriteChannelIds.includes(channel.id),
    })),
    malformedEntriesBySource: catalog.malformedEntriesBySource,
    favoriteChannelIds: catalog.favoriteChannelIds,
    recentChannelIds: catalog.recentChannelIds,
  };
}

function upsertSource(sources: M3uSource[], source: M3uSource): M3uSource[] {
  const existingIndex = sources.findIndex((item) => item.id === source.id);

  if (existingIndex === -1) {
    return [source, ...sources];
  }

  return sources.map((item) => (item.id === source.id ? { ...item, ...source } : item));
}

function applyFavoriteFlags(channels: Channel[], favoriteChannelIds: string[]): Channel[] {
  return channels.map((channel) => ({
    ...channel,
    isFavorite: favoriteChannelIds.includes(channel.id),
  }));
}

function mapChannels(
  channelsBySource: Record<string, Channel[]>,
  mapper: (channel: Channel) => Channel,
): Record<string, Channel[]> {
  return Object.fromEntries(
    Object.entries(channelsBySource).map(([id, channels]) => [id, channels.map(mapper)]),
  );
}

function createSourceId(name: string): string {
  const base = `${name}-playlist-${Date.now()}`;

  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function metadataCoverage(report: ReturnType<typeof createSourceHealthReport>): number {
  if (report.totalChannels === 0) {
    return 5;
  }

  const channelsWithLogos = report.totalChannels - report.missingLogos;
  return Math.max(5, Math.round((channelsWithLogos / report.totalChannels) * 100));
}

function formatErrorCode(code: SourceSyncError["code"]): string {
  return code
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSyncStatus(source: M3uSource): string {
  if (source.syncStatus === "failed") {
    return source.syncError ? formatErrorCode(source.syncError.code) : "Failed";
  }

  if (!source.lastSyncedAt) {
    return "Not synced";
  }

  return "Synced";
}

function normalizeSearchQuery(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function channelMatchesSearch(channel: Channel, query: string): boolean {
  const searchableText = [
    channel.name,
    channel.normalizedName,
    channel.group,
    channel.tvgName,
    channel.tvgId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

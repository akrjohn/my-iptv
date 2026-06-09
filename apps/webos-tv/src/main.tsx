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
  getCurrentProgramme,
  getNextProgramme,
  parseM3u,
  parseXmltv,
  parseXmltvDate,
  syncEpg,
  syncM3uPlaylist,
  syncXtream,
  type Channel,
  type ChannelOverride,
  type M3uSource,
  type SourceSyncError,
  type XtreamSource,
  type XmltvData,
  type SourceHealthReport,
  type SourceRecommendation,
} from "@my-iptv/iptv-core";
import {
  formatM3uSaveSuccessMessage,
  formatM3uTestSuccessMessage,
  formatXtreamSaveSuccessMessage,
  formatXtreamTestSuccessMessage,
} from "./sourceSetupMessages";
import { formatFavoriteToggleMessage } from "./favoriteMessages";
import { getFavoriteChannels, getRecentChannels } from "./channelShelf";
import { samplePlaylist } from "./samplePlaylist";
import { createSampleEpg } from "./sampleEpg";
import { createCatalogStorage, type CatalogState } from "./catalogStorage";
import "./styles.css";

type View = "setup" | "live" | "favorites" | "recents" | "doctor" | "settings" | "player";

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
type AppFeedback = { message: string; tone: "success" } | null;

const catalogStorage = createCatalogStorage();
const playerOverlayAutoHideMs = 3500;

const demoEpgResult = parseXmltv(createSampleEpg());
const demoEpg: XmltvData = demoEpgResult.ok ? demoEpgResult.data : { channels: [], programmes: [] };

const demoCatalog: CatalogState = {
  sources: [demoSource],
  selectedSourceId: demoSource.id,
  channelsBySource: { [demoSource.id]: parsed.channels },
  malformedEntriesBySource: { [demoSource.id]: parsed.malformedEntries },
  epgBySource: { [demoSource.id]: demoEpg },
  channelOverrides: {},
  favoriteChannelIds: [],
  recentChannelIds: [],
  hiddenChannelIds: [],
};

function App() {
  const [view, setView] = useState<View>("live");
  const [catalog, setCatalog] = useState<CatalogState>(demoCatalog);
  const [hasLoadedCatalog, setHasLoadedCatalog] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SourceSetupStatus>({ state: "idle" });
  const [sourceActionStatus, setSourceActionStatus] = useState<SourceActionStatus>({ state: "idle" });
  const [appFeedback, setAppFeedback] = useState<AppFeedback>(null);
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
    () => ["All Channels", ...Array.from(new Set(channels.flatMap((channel) => channelGroups(channel))))],
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
      return searchedChannels.filter((channel) => !channel.isHidden);
    }

    if (selectedGroup === "All Channels") {
      return channels.filter((channel) => !channel.isHidden);
    }

    return channels.filter(
      (channel) => !channel.isHidden && channelGroups(channel).includes(selectedGroup),
    );
  }, [channels, searchedChannels, searchQuery, selectedGroup]);

  const favoriteChannels = useMemo(() => getFavoriteChannels(channels), [channels]);
  const recentChannels = useMemo(
    () => getRecentChannels(channels, catalog.recentChannelIds),
    [catalog.recentChannelIds, channels],
  );

  useEffect(() => {
    if (!appFeedback) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setAppFeedback(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [appFeedback]);

  useEffect(() => {
    if (view !== "live" && isSearchOpen) {
      closeSearch();
    }
  }, [isSearchOpen, view]);

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isEditableTarget || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.key === "Escape" && isSearchOpen) {
        event.preventDefault();
        closeSearch();
        return;
      }

      if (view === "player") {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        openSearch();
        return;
      }

      const nextViewByKey: Record<string, View> = {
        "1": "setup",
        "2": "live",
        "3": "favorites",
        "4": "recents",
        "5": "doctor",
        "6": "settings",
      };

      const nextView = nextViewByKey[event.key];

      if (!nextView) {
        return;
      }

      event.preventDefault();
      setView(nextView);
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [closeSearch, isSearchOpen, openSearch, setView, view]);

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
        catalog.epgBySource[catalog.selectedSourceId],
        Object.values(catalog.channelOverrides),
      ),
    [catalog.channelOverrides, catalog.malformedEntriesBySource, catalog.selectedSourceId, catalog.epgBySource, channels],
  );

  function selectGroup(group: string) {
    setSearchQuery("");
    setSelectedGroup(group);
    const firstInGroup =
      group === "All Channels"
        ? channels[0]
        : channels.find((channel) => channelGroups(channel).includes(group));

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

  async function syncPlaylist({ name, playlistUrl, epgUrl }: { name: string; playlistUrl: string; epgUrl?: string }) {
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

    let epgData: XmltvData | undefined;

    if (epgUrl) {
      const epgResult = await syncEpg({
        sourceId: result.source.id,
        epgUrl,
      });

      if (epgResult.ok) {
        epgData = epgResult.data;
      }
    }

    setCatalog((current) => ({
      sources: upsertSource(current.sources, {
        ...result.source,
        epgUrl,
      }),
      selectedSourceId: result.source.id,
      channelsBySource: {
        ...current.channelsBySource,
        [result.source.id]: applyHiddenFlags(
          applyFavoriteFlags(result.channels, current.favoriteChannelIds),
          current.hiddenChannelIds,
        ),
      },
      malformedEntriesBySource: {
        ...current.malformedEntriesBySource,
        [result.source.id]: result.malformedEntries,
      },
      epgBySource: epgData
        ? { ...current.epgBySource, [result.source.id]: epgData }
        : current.epgBySource,
      channelOverrides: current.channelOverrides,
      favoriteChannelIds: current.favoriteChannelIds,
      recentChannelIds: current.recentChannelIds.filter((id) =>
        result.channels.some((channel) => channel.id === id),
      ),
      hiddenChannelIds: current.hiddenChannelIds,
    }));
    setSelectedGroup("All Channels");
    setSelectedChannelId(result.channels[0]?.id ?? "");
    setSetupStatus({
      state: "success",
      message: formatM3uSaveSuccessMessage(result.channels.length),
    });
    setView("live");
  }

  async function testPlaylistConnection({ name, playlistUrl, epgUrl }: { name: string; playlistUrl: string; epgUrl?: string }) {
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

    if (epgUrl) {
      await syncEpg({ sourceId: result.source.id, epgUrl });
    }

    setSetupStatus({
      state: "success",
      message: formatM3uTestSuccessMessage(result.channels.length, result.malformedEntries),
    });
  }

  async function syncXtreamSource({ name, serverUrl, username, password }: { name: string; serverUrl: string; username: string; password: string }) {
    setSetupStatus({ state: "syncing" });
    const result = await syncXtream({
      sourceId: createSourceId(name),
      name,
      serverUrl,
      username,
      password,
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
        [result.source.id]: applyHiddenFlags(
          applyFavoriteFlags(result.channels, current.favoriteChannelIds),
          current.hiddenChannelIds,
        ),
      },
      malformedEntriesBySource: {
        ...current.malformedEntriesBySource,
        [result.source.id]: 0,
      },
      epgBySource: current.epgBySource,
      channelOverrides: current.channelOverrides,
      favoriteChannelIds: current.favoriteChannelIds,
      recentChannelIds: current.recentChannelIds,
      hiddenChannelIds: current.hiddenChannelIds,
    }));
    setSelectedGroup("All Channels");
    setSelectedChannelId(result.channels[0]?.id ?? "");
    setSetupStatus({
      state: "success",
      message: formatXtreamSaveSuccessMessage(result.channels.length),
    });
    setView("live");
  }

  async function testXtreamConnection({ name, serverUrl, username, password }: { name: string; serverUrl: string; username: string; password: string }) {
    setSetupStatus({ state: "testing" });
    const result = await syncXtream({
      sourceId: createSourceId(`test-${name}`),
      name,
      serverUrl,
      username,
      password,
    });

    if (!result.ok) {
      setSetupStatus({ state: "error", error: result.error });
      return;
    }

    setSetupStatus({
      state: "success",
      message: formatXtreamTestSuccessMessage(result.channels.length),
    });
  }

  async function resyncSource(source: M3uSource | XtreamSource) {
    if (source.type === "m3u") {
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
        const hiddenChannelIds = current.hiddenChannelIds.filter((id) => nextChannelIds.has(id));

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
            [result.source.id]: applyHiddenFlags(
              applyFavoriteFlags(result.channels, favoriteChannelIds),
              hiddenChannelIds,
            ),
          },
          malformedEntriesBySource: {
            ...current.malformedEntriesBySource,
            [result.source.id]: result.malformedEntries,
          },
          favoriteChannelIds,
          recentChannelIds,
          hiddenChannelIds,
        };
      });
      setSelectedGroup("All Channels");
      setSelectedChannelId(result.channels[0]?.id ?? "");
      setSourceActionStatus({
        state: "success",
        message: `${source.name} resynced. ${result.channels.length} channels available.`,
      });
      return;
    }

    if (source.type === "xtream") {
      setSourceActionStatus({ state: "working", message: `Resyncing ${source.name}...` });
      const result = await syncXtream({
        sourceId: source.id,
        name: source.name,
        serverUrl: source.serverUrl,
        username: source.usernameRef,
        password: source.passwordRef,
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
        const hiddenChannelIds = current.hiddenChannelIds.filter((id) => nextChannelIds.has(id));

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
            [result.source.id]: applyHiddenFlags(
              applyFavoriteFlags(result.channels, favoriteChannelIds),
              hiddenChannelIds,
            ),
          },
          malformedEntriesBySource: {
            ...current.malformedEntriesBySource,
            [result.source.id]: 0,
          },
          favoriteChannelIds,
          recentChannelIds,
          hiddenChannelIds,
        };
      });
      setSelectedGroup("All Channels");
      setSelectedChannelId(result.channels[0]?.id ?? "");
      setSourceActionStatus({
        state: "success",
        message: `${source.name} resynced. ${result.channels.length} channels available.`,
      });
    }
  }

  function deleteSource(source: M3uSource | XtreamSource) {
    if (source.id === demoSource.id) {
      setSourceActionStatus({
        state: "error",
        message: "The demo source is kept as the fallback catalog.",
      });
      return;
    }

    if (!window.confirm(`Delete "${source.name}"? This will remove all channels and cannot be undone.`)) {
      return;
    }

    setCatalog((current) => {
      const sources = current.sources.filter((item) => item.id !== source.id);
      const channelsBySource = { ...current.channelsBySource };
      const malformedEntriesBySource = { ...current.malformedEntriesBySource };
      const epgBySource = { ...current.epgBySource };
      const removedChannelIds = new Set(channelsBySource[source.id]?.map((channel) => channel.id) ?? []);
      delete channelsBySource[source.id];
      delete malformedEntriesBySource[source.id];
      delete epgBySource[source.id];
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
        epgBySource: sources.length > 0 ? epgBySource : {},
        channelOverrides: Object.fromEntries(
          Object.entries(current.channelOverrides).filter(
            ([id]) => !removedChannelIds.has(id),
          ),
        ),
        favoriteChannelIds: current.favoriteChannelIds.filter((id) => !removedChannelIds.has(id)),
        recentChannelIds: current.recentChannelIds.filter((id) => !removedChannelIds.has(id)),
      };
    });
    setSelectedGroup("All Channels");
    setPreviousChannelId("");
    setSourceActionStatus({ state: "success", message: `${source.name} was removed.` });
  }

  function clearLocalData() {
    if (!window.confirm("Clear all local data? This will reset to the demo catalog and cannot be undone.")) {
      return;
    }

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
    const isFavorite = catalog.favoriteChannelIds.includes(channel.id);
    const favoriteChannelIds = isFavorite
      ? catalog.favoriteChannelIds.filter((id) => id !== channel.id)
      : [channel.id, ...catalog.favoriteChannelIds];

    setAppFeedback({
      message: formatFavoriteToggleMessage(channel.name, !isFavorite),
      tone: "success",
    });

    setCatalog((current) => {
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

  function toggleHidden(channel: Channel) {
    setCatalog((current) => {
      const isHidden = current.hiddenChannelIds.includes(channel.id);
      const hiddenChannelIds = isHidden
        ? current.hiddenChannelIds.filter((id) => id !== channel.id)
        : [...current.hiddenChannelIds, channel.id];

      return {
        ...current,
        hiddenChannelIds,
        channelsBySource: mapChannels(current.channelsBySource, (item) => ({
          ...item,
          isHidden: hiddenChannelIds.includes(item.id),
        })),
      };
    });
  }

  function setChannelOverride(override: ChannelOverride) {
    setCatalog((current) => ({
      ...current,
      channelOverrides: {
        ...current.channelOverrides,
        [override.channelId]: override,
      },
    }));
  }

  function removeChannelOverride(channelId: string) {
    setCatalog((current) => {
      const rest = { ...current.channelOverrides };
      delete rest[channelId];
      return { ...current, channelOverrides: rest };
    });
  }

  function watchSelectedChannel() {
    if (!selectedChannel) {
      return;
    }

    watchChannel(selectedChannel);
  }

  function watchChannel(channel: Channel) {
    setSelectedChannelId((currentId) => {
      if (currentId && currentId !== channel.id) {
        setPreviousChannelId(currentId);
      }

      return channel.id;
    });
    addRecentChannel(channel.id);
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
      {appFeedback ? (
        <div className={`app-feedback is-${appFeedback.tone}`} role="status" aria-live="polite">
          {appFeedback.message}
        </div>
      ) : null}
      {view !== "player" ? (
        <NavigationRail activeView={view} onNavigate={setView} onOpenSearch={openSearch} />
      ) : null}

      {view === "setup" ? (
        <SourceSetup
          status={setupStatus}
          onSyncM3u={syncPlaylist}
          onTestM3u={testPlaylistConnection}
          onSyncXtream={syncXtreamSource}
          onTestXtream={testXtreamConnection}
        />
      ) : null}
      {view === "live" ? (
        <LiveTvBrowser
          channels={visibleChannels}
          epgBySource={catalog.epgBySource}
          sourceId={catalog.selectedSourceId}
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
          onToggleHidden={toggleHidden}
          onWatch={watchSelectedChannel}
        />
      ) : null}
      {view === "favorites" ? (
        <ChannelShelfScreen
          channels={favoriteChannels}
          epgBySource={catalog.epgBySource}
          sourceId={catalog.selectedSourceId}
          title="Favorite Channels"
          kicker="Favorites"
          description="Channels you have starred for quick return on TV."
          emptyTitle="No favorites yet"
          emptyDescription="Star channels from Live TV or the player to build this shelf."
          selectedChannel={favoriteChannels.find((channel) => channel.id === selectedChannelId) ?? favoriteChannels[0]}
          onWatchChannel={watchChannel}
        />
      ) : null}
      {view === "recents" ? (
        <ChannelShelfScreen
          channels={recentChannels}
          epgBySource={catalog.epgBySource}
          sourceId={catalog.selectedSourceId}
          title="Recent Channels"
          kicker="Recents"
          description="The last channels you watched, kept in playback order."
          emptyTitle="No recent channels"
          emptyDescription="Open a channel from Live TV to start building this list."
          selectedChannel={recentChannels.find((channel) => channel.id === selectedChannelId) ?? recentChannels[0]}
          onWatchChannel={watchChannel}
        />
      ) : null}
      {view === "doctor" ? (
        <SourceDoctor
          report={healthReport}
          source={currentSource}
          channelOverrides={catalog.channelOverrides}
          onRefresh={currentSource ? () => resyncSource(currentSource) : undefined}
          onApplyOverride={setChannelOverride}
          onRemoveOverride={removeChannelOverride}
        />
      ) : null}
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
          program={getProgramForChannel(catalog.epgBySource, catalog.selectedSourceId, selectedChannel)}
          hasLastChannel={Boolean(previousChannelId)}
          onBack={() => setView("live")}
          onChannelDown={() => changePlayerChannel(-1)}
          onChannelUp={() => changePlayerChannel(1)}
          onLastChannel={jumpToLastChannel}
          onPlaybackValidated={updateChannelValidationStatus}
          onToggleFavorite={toggleFavorite}
          onToggleHidden={toggleHidden}
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
    { id: "favorites" as const, label: "Favorites", icon: Heart },
    { id: "recents" as const, label: "Recents", icon: Clock3 },
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
  onSyncM3u,
  onTestM3u,
  onSyncXtream,
  onTestXtream,
}: {
  status: SourceSetupStatus;
  onSyncM3u: (input: { name: string; playlistUrl: string; epgUrl?: string }) => Promise<void>;
  onTestM3u: (input: { name: string; playlistUrl: string; epgUrl?: string }) => Promise<void>;
  onSyncXtream: (input: { name: string; serverUrl: string; username: string; password: string }) => Promise<void>;
  onTestXtream: (input: { name: string; serverUrl: string; username: string; password: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [epgUrl, setEpgUrl] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [xtreamUsername, setXtreamUsername] = useState("");
  const [xtreamPassword, setXtreamPassword] = useState("");
  const [sourceType, setSourceType] = useState<"m3u" | "epg" | "xtream">("m3u");
  const playlistInputRef = useRef<HTMLInputElement>(null);
  const epgInputRef = useRef<HTMLInputElement>(null);
  const serverInputRef = useRef<HTMLInputElement>(null);
  const isWorking = status.state === "syncing" || status.state === "testing";

  const isM3u = sourceType === "m3u" || sourceType === "epg";
  const canSyncM3u = Boolean(name.trim() && playlistUrl.trim() && !isWorking);
  const canSyncXtream = Boolean(name.trim() && serverUrl.trim() && xtreamUsername.trim() && xtreamPassword.trim() && !isWorking);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isM3u) {
      if (!canSyncM3u) return;
      await onSyncM3u({
        name: name.trim(),
        playlistUrl: playlistUrl.trim(),
        epgUrl: epgUrl.trim() || undefined,
      });
    } else {
      if (!canSyncXtream) return;
      await onSyncXtream({
        name: name.trim(),
        serverUrl: serverUrl.trim(),
        username: xtreamUsername.trim(),
        password: xtreamPassword,
      });
    }
  }

  async function handleTestConnection() {
    if (isM3u) {
      if (!canSyncM3u) return;
      await onTestM3u({
        name: name.trim(),
        playlistUrl: playlistUrl.trim(),
        epgUrl: epgUrl.trim() || undefined,
      });
    } else {
      if (!canSyncXtream) return;
      await onTestXtream({
        name: name.trim(),
        serverUrl: serverUrl.trim(),
        username: xtreamUsername.trim(),
        password: xtreamPassword,
      });
    }
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
        <button
          className={isM3u ? "source-type-card is-focused" : "source-type-card"}
          onClick={() => {
            setSourceType("m3u");
            setTimeout(() => playlistInputRef.current?.focus(), 0);
          }}
        >
          <Link size={34} />
          <strong>M3U URL</strong>
          <span>Simple link-based playlist import.</span>
        </button>
        <button
          className={sourceType === "xtream" ? "source-type-card is-focused" : "source-type-card"}
          onClick={() => {
            setSourceType("xtream");
            setTimeout(() => serverInputRef.current?.focus(), 0);
          }}
        >
          <Server size={34} />
          <strong>Xtream Codes</strong>
          <span>API-based provider with built-in categories and EPG.</span>
        </button>
      </div>

      <form className="source-form" onSubmit={handleSubmit}>
        <div className="form-fields">
          <label>
            <span>Source Alias</span>
            <input
              autoComplete="off"
              placeholder="e.g. My Provider"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {isM3u ? (
            <>
              <label>
                <span>M3U URL</span>
                <input
                  autoComplete="off"
                  inputMode="url"
                  placeholder="https://provider.example/playlist.m3u"
                  ref={playlistInputRef}
                  value={playlistUrl}
                  onChange={(event) => setPlaylistUrl(event.target.value)}
                />
              </label>
              <label>
                <span>EPG URL (optional)</span>
                <input
                  autoComplete="off"
                  inputMode="url"
                  placeholder="https://provider.example/epg.xmltv"
                  ref={epgInputRef}
                  value={epgUrl}
                  onChange={(event) => setEpgUrl(event.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                <span>Server URL</span>
                <input
                  autoComplete="off"
                  inputMode="url"
                  placeholder="https://provider.example:8080"
                  ref={serverInputRef}
                  value={serverUrl}
                  onChange={(event) => setServerUrl(event.target.value)}
                />
              </label>
              <label>
                <span>Username</span>
                <input
                  autoComplete="off"
                  placeholder="Xtream username"
                  value={xtreamUsername}
                  onChange={(event) => setXtreamUsername(event.target.value)}
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  autoComplete="off"
                  type="password"
                  placeholder="Xtream password"
                  value={xtreamPassword}
                  onChange={(event) => setXtreamPassword(event.target.value)}
                />
              </label>
            </>
          )}
          {status.state === "error" ? (
            <p className="sync-message is-error">
              <strong>{status.state === "error" ? formatErrorCode(status.error.code) : "Error"}</strong>
              <span>{status.state === "error" ? status.error.message : ""}</span>
            </p>
          ) : null}
          {status.state === "success" ? (
            <p className="sync-message is-success">
              <strong>{status.state === "success" && status.message.startsWith("Connection OK") ? "Connection OK" : "Sync complete"}</strong>
              <span>{status.state === "success" ? status.message : ""}</span>
            </p>
          ) : null}
          <p className="source-note">
            All source data is local in this prototype. Only use credentials and URLs you are
            authorized to access.
          </p>
        </div>
        <div className="form-actions">
          <button className="secondary-button" type="button" disabled={isM3u ? !canSyncM3u : !canSyncXtream} onClick={() => void handleTestConnection()}>
            <Wifi size={24} />
            {status.state === "testing" ? "Testing" : "Test Connection"}
          </button>
          <button className="primary-button" type="submit" disabled={isM3u ? !canSyncM3u : !canSyncXtream}>
            <RefreshCw size={28} />
            {status.state === "syncing" ? "Syncing" : "Sync Source"}
            <small>{isWorking ? "Connecting" : "Save locally"}</small>
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
  epgBySource,
  sourceId,
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
  onToggleHidden,
  onWatch,
}: {
  channels: Channel[];
  epgBySource: Record<string, XmltvData>;
  sourceId: string;
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
  onToggleHidden: (channel: Channel) => void;
  onWatch: () => void;
}) {
  const categoryPanelRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const channelStackRef = useRef<HTMLDivElement>(null);
  const [categoryFocusIndex, setCategoryFocusIndex] = useState(
    Math.max(0, groups.indexOf(selectedGroup)),
  );
  const program = selectedChannel
    ? getProgramForChannel(epgBySource, sourceId, selectedChannel)
    : { title: "Live", next: "", time: "", progress: 0, description: "" };
  const isSearching = Boolean(searchQuery.trim());

  useEffect(() => {
    setCategoryFocusIndex(Math.max(0, groups.indexOf(selectedGroup)));
  }, [selectedGroup, groups]);

  function selectCategoryByIndex(index: number) {
    const clamped = Math.max(0, Math.min(index, groups.length - 1));
    setCategoryFocusIndex(clamped);
    const group = groups[clamped];

    if (group !== selectedGroup) {
      onSelectGroup(group);
    }

    const panel = categoryPanelRef.current;
    const button = panel?.querySelector<HTMLButtonElement>(".category-button");
    const buttonHeight = button?.offsetHeight ?? 48;
    const scrollTarget = clamped * (buttonHeight + 8) - 100;

    panel?.scrollTo({ top: Math.max(0, scrollTarget), behavior: "smooth" });
  }

  function handleCategoryKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectCategoryByIndex(categoryFocusIndex - 1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectCategoryByIndex(categoryFocusIndex + 1);
      return;
    }
  }

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
        onKeyDown={handleCategoryKeyDown}
        tabIndex={0}
      >
        <h2>Categories</h2>
        {groups.map((group, index) => (
          <button
            className={
              selectedGroup === group
                ? "category-button is-active"
                : categoryFocusIndex === index
                  ? "category-button is-keyboard-focused"
                  : "category-button"
            }
            key={group}
            tabIndex={-1}
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
              const rowProgram = getProgramForChannel(epgBySource, sourceId, channel);
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
            <div className="program-actions">
              <button
                className={selectedChannel?.isFavorite ? "icon-button is-favorite" : "icon-button"}
                aria-label="Favorite"
                onClick={() => selectedChannel && onToggleFavorite(selectedChannel)}
              >
                <Star size={28} />
              </button>
              {selectedChannel ? (
                <button
                  className="icon-button"
                  aria-label={selectedChannel.isHidden ? "Show channel" : "Hide channel"}
                  onClick={() => onToggleHidden(selectedChannel)}
                >
                  <Trash2 size={28} />
                </button>
              ) : null}
            </div>
          </div>
          <p className="program-meta">{channelGroups(selectedChannel).join(", ") || "Live"} · LIVE from user playlist</p>
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

function ChannelShelfScreen({
  channels,
  epgBySource,
  sourceId,
  title,
  kicker,
  description,
  emptyTitle,
  emptyDescription,
  selectedChannel,
  onWatchChannel,
}: {
  channels: Channel[];
  epgBySource: Record<string, XmltvData>;
  sourceId: string;
  title: string;
  kicker: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  selectedChannel?: Channel;
  onWatchChannel: (channel: Channel) => void;
}) {
  return (
    <section className="screen shelf-screen">
      <AppHeader kicker={kicker} />
      <div className="panel-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <span>{channels.length} Channels</span>
      </div>

      {channels.length === 0 ? (
        <div className="empty-channel-state">
          <strong>{emptyTitle}</strong>
          <span>{emptyDescription}</span>
        </div>
      ) : (
        <div className="channel-stack">
          {channels.map((channel, index) => {
            const rowProgram = getProgramForChannel(epgBySource, sourceId, channel);
            return (
              <button
                className={selectedChannel?.id === channel.id ? "stitch-channel-card is-focused" : "stitch-channel-card"}
                key={channel.id}
                onClick={() => onWatchChannel(channel)}
              >
                <ChannelLogo channel={channel} />
                <div>
                  <strong>{channel.name}</strong>
                  <span>{rowProgram.title}</span>
                  <progress max="100" value={rowProgram.progress} />
                </div>
                <small>
                  #{index + 1}
                  <br />
                  {rowProgram.time || channelGroups(channel).join(", ") || "Live"}
                </small>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SourceDoctor({
  report,
  source,
  channelOverrides,
  onRefresh,
  onApplyOverride,
  onRemoveOverride,
}: {
  report: SourceHealthReport;
  source?: M3uSource | XtreamSource;
  channelOverrides: Record<string, ChannelOverride>;
  onRefresh?: () => Promise<void>;
  onApplyOverride: (override: ChannelOverride) => void;
  onRemoveOverride: (channelId: string) => void;
}) {
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

  function handleApply(recommendation: SourceRecommendation) {
    if (recommendation.type === "hide_restricted" && recommendation.channelIds) {
      for (const channelId of recommendation.channelIds) {
        onApplyOverride({ channelId, hidden: true });
      }
      return;
    }

    if (recommendation.type === "hide_failed_streams" && recommendation.channelIds) {
      for (const channelId of recommendation.channelIds) {
        onApplyOverride({ channelId, hidden: true });
      }
      return;
    }
  }

  function handleUndo(recommendation: SourceRecommendation) {
    if (recommendation.channelIds) {
      for (const channelId of recommendation.channelIds) {
        const override = channelOverrides[channelId];
        if (override?.hidden) {
          onRemoveOverride(channelId);
        }
      }
    }
  }

  const isApplied = (recommendation: SourceRecommendation) =>
    recommendation.channelIds?.every((id: string) => channelOverrides[id]?.hidden) ?? false;

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
        <MetricCard label="Visible" value={String(report.visibleChannels)} tone="cyan" />
        <MetricCard label="Hidden" value={String(report.hiddenCount)} tone={report.hiddenCount > 0 ? "gold" : "neutral"} />
        <MetricCard label="Missing Logos" value={String(report.missingLogos)} tone={report.missingLogos > 0 ? "gold" : "neutral"} />
        <MetricCard label="No Stream URL" value={String(report.missingStreamUrls)} tone={report.missingStreamUrls > 0 ? "gold" : "neutral"} />
        <MetricCard label="Duplicate Groups" value={String(report.duplicateGroups)} tone={report.duplicateGroups > 0 ? "gold" : "neutral"} />
        <MetricCard label="EPG Matched" value={String(report.epgMatchedCount)} tone="neutral" />
        <MetricCard label="EPG Unmatched" value={String(report.epgUnmatchedCount)} tone={report.epgUnmatchedCount > 0 ? "gold" : "neutral"} />
        <MetricCard label="Restricted Hints" value={String(report.likelyRestrictedChannels)} tone={report.likelyRestrictedChannels > 0 ? "gold" : "neutral"} />
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
        </div>
        {report.recommendations.length === 0 ? (
          <p className="empty-recommendations">No cleanup actions needed.</p>
        ) : null}
        {report.recommendations.map((recommendation) => {
          const applied = isApplied(recommendation);
          return (
            <article className={`recommendation-row${applied ? " is-applied" : ""}`} key={recommendation.id}>
              <Activity size={34} />
              <div>
                <strong>{recommendation.title}</strong>
                <span>{recommendation.description}</span>
              </div>
              {recommendation.channelIds ? (
                applied ? (
                  <button className="secondary-button" onClick={() => handleUndo(recommendation)}>
                    Undo
                  </button>
                ) : (
                  <button className="primary-small" onClick={() => handleApply(recommendation)}>
                    Apply
                  </button>
                )
              ) : (
                <span className="recommendation-passive">Review manually</span>
              )}
            </article>
          );
        })}
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
  sources: (M3uSource | XtreamSource)[];
  onAddSource: () => void;
  onClearLocalData: () => void;
  onDeleteSource: (source: M3uSource | XtreamSource) => void;
  onResyncSource: (source: M3uSource | XtreamSource) => void;
}) {
  const selectedSource = sources.find((source) => source.id === selectedSourceId);

  return (
    <section className="screen settings-screen">
      <AppHeader kicker="Settings" />
      <div className="settings-layout">
        <aside className="settings-menu">
          <h1>Settings</h1>
          <SettingsCard icon={<Database />} title="Manage Sources" text="Add or remove M3U playlists, EPG links, or Xtream Codes accounts." active />
          <SettingsCard icon={<RefreshCw />} title="Refresh Content" text="Force update channels and guide data." onClick={() => selectedSource && onResyncSource(selectedSource)} />
          <SettingsCard icon={<Shield />} title="Parental PIN" text="Restrict access to sensitive content." />
          <SettingsCard icon={<Trash2 />} title="Clear Data" text="Reset local sources, caches, and settings." danger onClick={onClearLocalData} />
        </aside>

        <section className="settings-detail">
          <h2>Manage Sources</h2>
          {status.state !== "idle" ? (
            <p className={`source-action-message is-${status.state}`}>
              {status.message}
            </p>
          ) : null}
          {sources.map((source) => (
            <div className={`source-row${source.syncStatus === "failed" ? " is-failed" : ""}`} key={source.id}>
              <div>
                <strong>{source.name}</strong>
                <span>
                  {source.id === selectedSourceId ? "Active" : "Saved"} ·{" "}
                  {channelsBySource[source.id]?.length ?? 0} Channels · {formatSyncStatus(source)}
                </span>
                {source.syncError ? (
                  <span className="source-row-error">
                    {source.syncError.message}
                  </span>
                ) : null}
              </div>
              <div className="source-row-actions">
                <button
                  className="icon-button"
                  aria-label={`Resync ${source.name}`}
                  disabled={status.state === "working"}
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
              disabled={!selectedSource || status.state === "working"}
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
  onToggleHidden,
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
  onToggleHidden: (channel: Channel) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLElement>(null);
  const overlayHideTimerRef = useRef<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [canSeek, setCanSeek] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>("idle");
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);

  useEffect(() => {
    setPlayerStatus("idle");
    setCanSeek(false);
    revealOverlay();
    screenRef.current?.focus();
  }, [channel.id]);

  useEffect(() => {
    if (overlayHideTimerRef.current) {
      window.clearTimeout(overlayHideTimerRef.current);
      overlayHideTimerRef.current = null;
    }

    if (!isOverlayVisible || isPaused || playerStatus === "failed") {
      return undefined;
    }

    overlayHideTimerRef.current = window.setTimeout(() => {
      setIsOverlayVisible(false);
      overlayHideTimerRef.current = null;
    }, playerOverlayAutoHideMs);

    return () => {
      if (overlayHideTimerRef.current) {
        window.clearTimeout(overlayHideTimerRef.current);
        overlayHideTimerRef.current = null;
      }
    };
  }, [isOverlayVisible, isPaused, playerStatus]);

  useEffect(() => {
    return () => {
      if (overlayHideTimerRef.current) {
        window.clearTimeout(overlayHideTimerRef.current);
      }
    };
  }, []);

  function revealOverlay() {
    setIsOverlayVisible(true);
  }

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
      onMouseMove={revealOverlay}
      onFocus={revealOverlay}
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
      {playerStatus === "failed" ? (
        <div className="player-error-overlay">
          <div className="player-error-box">
            <p className="player-error-icon">!</p>
            <h2>Playback Failed</h2>
            <p>The stream could not be loaded. It may be offline or unreachable.</p>
            <div className="player-error-actions">
              <button className="retry-button" onClick={() => void retryPlayback()}>
                <RefreshCw size={24} />
                Retry Stream
              </button>
              <button className="secondary-button" onClick={onBack}>
                <ArrowLeft size={24} />
                Go Back
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {!isOverlayVisible && (playerStatus === "buffering" || playerStatus === "retrying") ? (
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
        <button
          className="icon-button"
          aria-label={channel.isHidden ? "Show channel" : "Hide channel"}
          onClick={() => onToggleHidden(channel)}
        >
          <Trash2 size={34} />
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
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={active ? "settings-card is-active" : danger ? "settings-card is-danger" : "settings-card"} onClick={onClick}>
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
      isHidden: catalog.hiddenChannelIds.includes(channel.id),
      groups: channel.groups ?? (channel.group ? channel.group.split(";").map((g) => g.trim()).filter(Boolean) : []),
    })),
    malformedEntriesBySource: catalog.malformedEntriesBySource,
    epgBySource: catalog.epgBySource ?? {},
    channelOverrides: catalog.channelOverrides ?? {},
    favoriteChannelIds: catalog.favoriteChannelIds,
    recentChannelIds: catalog.recentChannelIds,
    hiddenChannelIds: catalog.hiddenChannelIds,
  };
}

function upsertSource(
  sources: (M3uSource | XtreamSource)[],
  source: M3uSource | XtreamSource,
): (M3uSource | XtreamSource)[] {
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

function applyHiddenFlags(channels: Channel[], hiddenChannelIds: string[]): Channel[] {
  return channels.map((channel) => ({
    ...channel,
    isHidden: hiddenChannelIds.includes(channel.id),
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

function formatSyncStatus(source: M3uSource | XtreamSource): string {
  if (source.syncStatus === "failed") {
    return source.syncError ? formatErrorCode(source.syncError.code) : "Failed";
  }

  if (!source.lastSyncedAt) {
    return "Not synced";
  }

  return "Synced";
}

function getProgramForChannel(
  epgBySource: Record<string, XmltvData>,
  sourceId: string,
  channel: Channel,
): { title: string; next: string; time: string; progress: number; description: string } {
  const epg = epgBySource[sourceId];
  if (!epg) {
    return { title: "Live", next: "Program guide unavailable", time: "", progress: 0, description: "" };
  }

  const current = getCurrentProgramme(epg.programmes, channel.tvgId, channel.name, channel.tvgName);
  const next = getNextProgramme(epg.programmes, channel.tvgId, channel.name, channel.tvgName);

  if (!current) {
    return { title: "Live", next: next?.title ?? "Program guide unavailable", time: "", progress: 0, description: "" };
  }

  const start = parseXmltvDate(current.start);
  const stop = current.stop ? parseXmltvDate(current.stop) : null;
  const timeStr = start && stop
    ? `${formatTime(start)} - ${formatTime(stop)}`
    : "";
  const progress = start && stop
    ? Math.round(((Date.now() - start.getTime()) / (stop.getTime() - start.getTime())) * 100)
    : 0;

  return {
    title: current.title,
    next: next?.title ?? "No upcoming",
    time: timeStr,
    progress: Math.min(100, Math.max(0, progress)),
    description: current.description ?? "",
  };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function normalizeSearchQuery(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function channelMatchesSearch(channel: Channel, query: string): boolean {
  const searchableText = [
    channel.name,
    channel.normalizedName,
    ...channelGroups(channel),
    channel.tvgName,
    channel.tvgId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query);
}

function channelGroups(channel?: Channel): string[] {
  if (!channel) return [];
  if (channel.groups && channel.groups.length > 0) return channel.groups;
  return [channel.group ?? "Ungrouped"];
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

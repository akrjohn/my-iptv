import type { Channel, M3uSource } from "@my-iptv/iptv-core";

export type CatalogState = {
  sources: M3uSource[];
  selectedSourceId: string;
  channelsBySource: Record<string, Channel[]>;
  malformedEntriesBySource: Record<string, number>;
  favoriteChannelIds: string[];
  recentChannelIds: string[];
};

const databaseName = "my-iptv";
const databaseVersion = 1;
const catalogStore = "catalog";
const catalogKey = "active";
const legacyStorageKey = "my-iptv.catalog.v1";

export type CatalogStorage = {
  load: () => Promise<CatalogState | null>;
  save: (catalog: CatalogState) => Promise<void>;
  reset: () => Promise<void>;
};

export function createCatalogStorage(): CatalogStorage {
  if (!("indexedDB" in window)) {
    return createLocalStorageCatalogStorage();
  }

  return {
    async load() {
      const database = await openCatalogDatabase();
      const savedCatalog = await readCatalog(database);

      if (savedCatalog) {
        return savedCatalog;
      }

      const migratedCatalog = readLegacyCatalog();

      if (migratedCatalog) {
        await writeCatalog(database, migratedCatalog);
        window.localStorage.removeItem(legacyStorageKey);
      }

      return migratedCatalog;
    },
    async save(catalog) {
      const database = await openCatalogDatabase();
      await writeCatalog(database, catalog);
    },
    async reset() {
      const database = await openCatalogDatabase();
      await deleteCatalog(database);
      window.localStorage.removeItem(legacyStorageKey);
    },
  };
}

function createLocalStorageCatalogStorage(): CatalogStorage {
  return {
    async load() {
      return readLegacyCatalog();
    },
    async save(catalog) {
      window.localStorage.setItem(legacyStorageKey, JSON.stringify(catalog));
    },
    async reset() {
      window.localStorage.removeItem(legacyStorageKey);
    },
  };
}

function openCatalogDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(catalogStore)) {
        database.createObjectStore(catalogStore);
      }
    };

    request.onerror = () => reject(request.error ?? new Error("Unable to open catalog storage."));
    request.onsuccess = () => resolve(request.result);
  });
}

function readCatalog(database: IDBDatabase): Promise<CatalogState | null> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(catalogStore, "readonly");
    const store = transaction.objectStore(catalogStore);
    const request = store.get(catalogKey);

    request.onerror = () => reject(request.error ?? new Error("Unable to read catalog."));
    request.onsuccess = () => resolve(isCatalogState(request.result) ? request.result : null);
  });
}

function writeCatalog(database: IDBDatabase, catalog: CatalogState): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(catalogStore, "readwrite");
    const store = transaction.objectStore(catalogStore);
    const request = store.put(catalog, catalogKey);

    request.onerror = () => reject(request.error ?? new Error("Unable to save catalog."));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to save catalog."));
  });
}

function deleteCatalog(database: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(catalogStore, "readwrite");
    const store = transaction.objectStore(catalogStore);
    const request = store.delete(catalogKey);

    request.onerror = () => reject(request.error ?? new Error("Unable to reset catalog."));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to reset catalog."));
  });
}

function readLegacyCatalog(): CatalogState | null {
  const rawCatalog = window.localStorage.getItem(legacyStorageKey);

  if (!rawCatalog) {
    return null;
  }

  try {
    const catalog = JSON.parse(rawCatalog) as unknown;
    return isCatalogState(catalog) ? catalog : null;
  } catch {
    return null;
  }
}

function isCatalogState(value: unknown): value is CatalogState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const catalog = value as Partial<CatalogState>;

  return (
    Array.isArray(catalog.sources) &&
    typeof catalog.selectedSourceId === "string" &&
    Boolean(catalog.channelsBySource) &&
    typeof catalog.channelsBySource === "object" &&
    Boolean(catalog.malformedEntriesBySource) &&
    typeof catalog.malformedEntriesBySource === "object" &&
    Array.isArray(catalog.favoriteChannelIds) &&
    Array.isArray(catalog.recentChannelIds)
  );
}

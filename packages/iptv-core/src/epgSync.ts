import type { SourceSyncError } from "./models";
import { parseXmltv, type XmltvData } from "./xmltv";

export type EpgFetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

export type EpgFetcher = (url: string) => Promise<EpgFetchResponse>;

export type SyncEpgInput = {
  sourceId: string;
  epgUrl: string;
  fetcher?: EpgFetcher;
};

export type SyncEpgResult =
  | { ok: true; data: XmltvData }
  | { ok: false; error: SourceSyncError };

export async function syncEpg({
  sourceId: _sourceId,
  epgUrl,
  fetcher = fetch,
}: SyncEpgInput): Promise<SyncEpgResult> {
  try {
    const response = await fetcher(epgUrl);

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: "network_unreachable",
          message: `EPG server returned HTTP ${response.status}.`,
          recoverable: true,
        },
      };
    }

    const xmlText = await response.text();
    const parsed = parseXmltv(xmlText);

    if (!parsed.ok) {
      return {
        ok: false,
        error: {
          code: "parse_failed",
          message: "The EPG data could not be parsed.",
          recoverable: true,
        },
      };
    }

    return { ok: true, data: parsed.data };
  } catch (error) {
    if (error instanceof TypeError) {
      return {
        ok: false,
        error: {
          code: "cors_blocked",
          message: "The browser could not read the EPG response. The provider may block browser requests with CORS.",
          recoverable: true,
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "unknown",
        message: "The EPG data could not be fetched because of an unexpected error.",
        recoverable: true,
      },
    };
  }
}

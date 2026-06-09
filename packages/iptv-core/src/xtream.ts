export type XtreamAccountInfo = {
  username: string;
  password: string;
  message: string;
  auth: 1 | 0;
  status: "Active" | "Expired" | "Banned";
  exp_date: string;
  is_trial: "0" | "1";
  active_cons: string;
  created_at: string;
  max_connections: string;
  allowed_output_formats: string[];
};

export type XtreamLiveCategory = {
  category_id: string;
  category_name: string;
  parent_id: number;
};

export type XtreamLiveStream = {
  num: number;
  name: string;
  stream_type: "live";
  stream_id: number;
  stream_icon?: string;
  epg_channel_id?: string;
  added: string;
  category_id: string;
  custom_sid?: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
};

export type XtreamApiResponse = {
  user_info: XtreamAccountInfo;
  categories?: XtreamLiveCategory[];
  live_categories?: XtreamLiveCategory[];
  live_streams?: XtreamLiveStream[];
};

export type XtreamFetchResult =
  | { ok: true; data: XtreamApiResponse }
  | { ok: false; error: string; code: "auth" | "network" | "parse" | "unknown" };

export async function fetchXtreamApi(
  serverUrl: string,
  username: string,
  password: string,
  fetcher: (url: string) => Promise<Response> = fetch,
): Promise<XtreamFetchResult> {
  const baseUrl = serverUrl.replace(/\/+$/, "");
  const apiUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

  try {
    const response = await fetcher(apiUrl);

    if (!response.ok) {
      return {
        ok: false,
        error: `Server returned HTTP ${response.status}.`,
        code: "network",
      };
    }

    const text = await response.text();
    let data: unknown;

    try {
      data = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: "The server response was not valid JSON.",
        code: "parse",
      };
    }

    const apiResponse = data as XtreamApiResponse;

    if (!apiResponse.user_info) {
      return {
        ok: false,
        error: "Response missing user_info.",
        code: "parse",
      };
    }

    if (apiResponse.user_info.auth !== 1) {
      return {
        ok: false,
        error: apiResponse.user_info.message || "Authentication failed.",
        code: "auth",
      };
    }

    if (apiResponse.user_info.status !== "Active") {
      return {
        ok: false,
        error: `Account is ${apiResponse.user_info.status}.`,
        code: "auth",
      };
    }

    return { ok: true, data: apiResponse };
  } catch (error) {
    if (error instanceof TypeError) {
      return {
        ok: false,
        error: "Could not reach the server. Check the URL or your network connection.",
        code: "network",
      };
    }

    return {
      ok: false,
      error: "An unexpected error occurred.",
      code: "unknown",
    };
  }
}

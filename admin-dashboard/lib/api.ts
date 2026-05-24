import { API_BASE_URL } from "@/lib/config";
import {
  getAccessToken,
  refreshAccessToken,
  triggerSessionExpired,
} from "@/lib/auth/session-store";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export type ApiFetchOptions = RequestInit & {
  token?: string;
  /** Do not attach session access token automatically */
  skipAuth?: boolean;
  /** Internal: prevent infinite retry loop */
  _retried?: boolean;
};

function resolveUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL.replace(/\/$/, "")}${normalized}`;
}

function extractErrorMessage(data: unknown, status: number): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return `Request failed with status ${status}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token, headers, skipAuth, _retried, ...rest } = options;

  const authToken = token ?? (skipAuth ? undefined : getAccessToken() ?? undefined);

  const response = await fetch(resolveUrl(path), {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
  });

  const data = await parseResponse(response);

  if (response.status === 401 && !skipAuth && !_retried) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, {
        ...options,
        token: newToken,
        _retried: true,
      });
    }
    triggerSessionExpired();
    throw new ApiError(extractErrorMessage(data, 401), 401, data);
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, response.status), response.status, data);
  }

  return data as T;
}

// Small fetch helper for the admin areas added on top of the existing pages.
// Existing pages call https://api.artvista.app directly; new code goes through
// API_BASE so a local backend can be used with NEXT_PUBLIC_API_BASE_URL.

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.artvista.app").replace(/\/$/, "");

// Query parameter the older endpoints read the admin's ID token from.
const TOKEN_PARAM = "admin_portal_token";

// The one switch: "true" sends the admin token as `Authorization: Bearer` on the
// route families below instead of in the URL (URLs end up in access logs, browser
// history and Referer). Off by default: the API must be deployed with header
// support first. Turn it on with NEXT_PUBLIC_API_BEARER_AUTH=true at build time.
export const BEARER_AUTH_ENABLED = process.env.NEXT_PUBLIC_API_BEARER_AUTH === "true";

// Route families whose API side also reads the token from `Authorization: Bearer`.
// Add a prefix here only once the API route accepts the header; everything else
// keeps the query parameter whatever the switch says.
const BEARER_PREFIXES = [
  "/admin/connectors/",
  "/admin/indexing/",
  "/admin/app-config",
  "/admin/news",
  "/admin/museums/",
  "/admin/artworks/",
  "/admin/rights/",
];

export const usesBearer = (path: string, enabled: boolean = BEARER_AUTH_ENABLED): boolean =>
  enabled && BEARER_PREFIXES.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`));

export type ApiErrorKind =
  | "not_deployed" // endpoint missing on the backend (404 Not Found on the route)
  | "not_configured" // 501: feature needs server configuration
  | "forbidden" // 401/403
  | "conflict" // 409
  | "network" // fetch failed (offline, CORS, DNS)
  | "server"; // anything else

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; kind: ApiErrorKind; message: string; detail?: unknown };

// FastAPI prefixes messages raised inside a validator with this.
const stripValueError = (msg: string) => msg.replace(/^Value error,\s*/i, "");

function detailToMessage(detail: unknown): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((d) => (d && typeof d === "object" && "msg" in d ? stripValueError(String(d.msg)) : String(d))).join("; ");
  if (typeof detail === "object" && detail && "message" in detail) return String((detail as { message: unknown }).message);
  return JSON.stringify(detail);
}

/**
 * Validation errors (HTTP 422) by field name: the last element of each error's `loc`,
 * e.g. { image: "The image URL must be an https link on ..." }. Empty for other errors.
 */
export function fieldErrors(res: ApiResult<unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  if (res.ok || !Array.isArray(res.detail)) return out;
  for (const d of res.detail) {
    if (!d || typeof d !== "object" || !("msg" in d)) continue;
    const loc = (d as { loc?: unknown }).loc;
    const field = Array.isArray(loc) && loc.length > 0 ? String(loc[loc.length - 1]) : "";
    if (field && !(field in out)) out[field] = stripValueError(String((d as { msg: unknown }).msg));
  }
  return out;
}

export async function apiRequest<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined | null>,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const bearer = usesBearer(path) && params[TOKEN_PARAM] ? String(params[TOKEN_PARAM]) : null;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (bearer && k === TOKEN_PARAM) return;
    if (v !== undefined && v !== null) query.set(k, String(v));
  });

  let request: RequestInit | undefined = init;
  if (bearer) {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${bearer}`);
    request = { ...init, headers };
  }

  const qs = query.toString();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}${qs ? `?${qs}` : ""}`, request);
  } catch {
    return { ok: false, status: 0, kind: "network", message: "Could not reach the API." };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.ok) return { ok: true, status: response.status, data: body as T };

  const detail = body && typeof body === "object" && "detail" in body ? (body as { detail: unknown }).detail : body;
  const message = detailToMessage(detail) || `HTTP ${response.status}`;
  let kind: ApiErrorKind = "server";
  if (response.status === 404 && message === "Not Found") kind = "not_deployed";
  else if (response.status === 501) kind = "not_configured";
  else if (response.status === 401 || response.status === 403) kind = "forbidden";
  else if (response.status === 409) kind = "conflict";
  return { ok: false, status: response.status, kind, message, detail };
}

// The app's Home "Current news" items (Firestore collection `updates`, written through the API).
//
//   GET    /admin/news                 {items: [{id, title, body, image, timestamp}]}, newest first
//   POST   /admin/news                 {title, body, image?}            -> {item}
//   PATCH  /admin/news/{id}            {title?, body?, image?}          -> {item}   image null removes it
//   DELETE /admin/news/{id}                                             -> {deleted}
// Auth: admin_portal_token query param today; apiRequest sends Authorization: Bearer instead once NEXT_PUBLIC_API_BEARER_AUTH=true. Every write goes to admin_action_log (a delete keeps a copy of the text).
// Field mapping in Firestore (what the app reads):
//   title -> title, body -> text1, image -> image, timestamp -> timestamp (server time on create).
import { apiRequest, ApiResult } from "./api";

export type NewsItem = { id: string; title: string; body: string; image: string | null; timestamp: string | null };
export type NewsInput = { title: string; body: string; image: string };

export const TITLE_MAX = 120;
export const BODY_MAX = 5000;

type Raw = Record<string, unknown>;

function normalize(r: Raw): NewsItem {
  return {
    id: String(r.id),
    title: typeof r.title === "string" ? r.title : "",
    body: typeof r.body === "string" ? r.body : "",
    image: typeof r.image === "string" && r.image ? r.image : null,
    timestamp: typeof r.timestamp === "string" ? r.timestamp : null,
  };
}

export function validateNews(input: NewsInput): Partial<Record<keyof NewsInput, string>> {
  const e: Partial<Record<keyof NewsInput, string>> = {};
  if (!input.title.trim()) e.title = "A title is required.";
  else if (input.title.trim().length > TITLE_MAX) e.title = `At most ${TITLE_MAX} characters.`;
  if (!input.body.trim()) e.body = "The article text is required.";
  else if (input.body.trim().length > BODY_MAX) e.body = `At most ${BODY_MAX} characters.`;
  if (input.image.trim()) {
    try {
      if (new URL(input.image.trim()).protocol !== "https:") e.image = "The image must be an https URL.";
    } catch {
      e.image = "Not a valid URL.";
    }
  }
  return e;
}

const json = (method: "POST" | "PATCH" | "DELETE", body?: unknown): RequestInit => ({
  method,
  headers: body === undefined ? undefined : { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const asItem = (r: ApiResult<{ item?: Raw }>): ApiResult<NewsItem> => (r.ok ? { ...r, data: normalize(r.data?.item ?? {}) } : r);

export async function listNews(token: string): Promise<ApiResult<NewsItem[]>> {
  const res = await apiRequest<{ items?: Raw[] }>("/admin/news", { admin_portal_token: token, limit: 200 });
  return res.ok ? { ...res, data: (Array.isArray(res.data?.items) ? res.data.items : []).filter((i) => i && i.id).map(normalize) } : res;
}

export const createNews = async (token: string, input: NewsInput) =>
  asItem(
    await apiRequest<{ item?: Raw }>(
      "/admin/news",
      { admin_portal_token: token },
      json("POST", { title: input.title.trim(), body: input.body.trim(), image: input.image.trim() || null })
    )
  );

/** Sends only what changed; an emptied image field removes the image. */
export const updateNews = async (token: string, before: NewsItem, input: NewsInput) => {
  const patch: Record<string, string | null> = {};
  if (input.title.trim() !== before.title) patch.title = input.title.trim();
  if (input.body.trim() !== before.body) patch.body = input.body.trim();
  if ((input.image.trim() || null) !== before.image) patch.image = input.image.trim() || null;
  return asItem(await apiRequest<{ item?: Raw }>(`/admin/news/${encodeURIComponent(before.id)}`, { admin_portal_token: token }, json("PATCH", patch)));
};

export const deleteNews = (token: string, id: string) =>
  apiRequest<{ deleted?: string }>(`/admin/news/${encodeURIComponent(id)}`, { admin_portal_token: token }, json("DELETE"));

// Types and calls for the Rights admin area (copyright-restricted artworks).
// Backend routes: /admin/rights/*.
//
// Aligned with the routes as they landed on 2026-11-11:
//   GET    /admin/rights/summary                       {active_artworks, by_status_reason: [{status, reason, count, overrides}]}
//   GET    /admin/rights/artworks?status=&reason=&override=&q=&limit=&offset=   {total, items}
//   PUT    /admin/rights/artworks/{id}/override         {display: "full" | "restricted", note}   note >= 3 chars
//   DELETE /admin/rights/artworks/{id}/override         {note}                                     note >= 3 chars
// Auth: admin_portal_token query param today; apiRequest sends Authorization: Bearer instead once NEXT_PUBLIC_API_BEARER_AUTH=true. Both writes go to admin_action_log on the server.
// The rule: "full" when the artist died in or before (this year - 71), or the
// death year is unknown but the work is dated 1880 or earlier, or the artist was born 125+ years
// before the cutoff, or the artist submitted it through the Portal, or an admin override says so.
// Otherwise "restricted": recognition still works, nothing that reproduces the work is returned.
//
// The list does not return the artwork's source yet (source_of_information); the page reads it when
// it appears and falls back to the Portal-submission flag.
import { apiRequest, ApiResult } from "./api";

export type RightsStatus = "full" | "restricted";
export type RestrictionReason = "living_artist" | "died_after_cutoff" | "unknown_dates";
export type RightsFilter = RestrictionReason | "override" | "";

export type RightsOverride = {
  display: RightsStatus;
  note: string | null;
  set_by: string | null;
  set_at: string | null;
};

export type RightsItem = {
  artwork_id: number;
  title: string;
  artist_id: number | null;
  artist_name: string | null;
  creation_date: string | null;
  born_year: number | null;
  died_year: number | null;
  status: RightsStatus | null;
  /** living_artist | died_after_cutoff | unknown_dates | override | (full reasons) */
  reason: string | null;
  override: RightsOverride | null;
  portal_submitted: boolean;
  source: string | null;
  museum_id: number | null;
};

export type RightsCounts = Record<RestrictionReason, number> & {
  /** Artworks with any admin override (either direction). */
  override: number;
  restricted_total: number;
  active_artworks: number;
};

export type RightsRule = {
  term_years: number;
  /** Artists who died in this year or earlier are out of copyright. */
  last_free_death_year: number;
};

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;
const mapOk = <T, U>(r: ApiResult<T>, f: (t: T) => U): ApiResult<U> => (r.ok ? { ...r, data: f(r.data) } : r);
const str = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));
const intOrNull = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? Math.trunc(n) : null;
};

/** The server HTML-escapes notes before storing them; React escapes again on render, so decode first. */
export function decodeNote(v: string | null): string | null {
  if (!v) return v;
  return v
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function sourceLabel(raw: string | null, portalSubmitted: boolean): string | null {
  if (raw) {
    if (raw.trim() === "User") return "Portal upload";
    if (/wikiart/i.test(raw)) return "WikiArt";
    return raw;
  }
  return portalSubmitted ? "Portal (submitted by the artist)" : null;
}

function normalizeItem(r: Raw): RightsItem {
  const display = str(r.rights_override) as RightsStatus | null;
  const portal = Boolean(r.rights_portal_submitted);
  return {
    artwork_id: Number(r.artwork_id),
    title: str(r.title) ?? `Artwork #${r.artwork_id}`,
    artist_id: intOrNull(r.artist_id),
    artist_name: str(r.artist_name),
    creation_date: str(r.creation_date),
    born_year: intOrNull(r.artist_born_year ?? r.born_year),
    died_year: intOrNull(r.artist_died_year ?? r.died_year),
    status: str(r.rights_status) as RightsStatus | null,
    reason: str(r.rights_reason),
    override: display
      ? { display, note: decodeNote(str(r.rights_override_note)), set_by: str(r.rights_override_by), set_at: str(r.rights_override_at) }
      : null,
    portal_submitted: portal,
    source: sourceLabel(str(r.source_of_information ?? r.source), portal),
    museum_id: intOrNull(r.museum_id),
  };
}

const BASE = "/admin/rights";
const jsonInit = (method: "PUT" | "DELETE", body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export const listRestricted = async (
  token: string,
  filter: RightsFilter,
  q: string,
  limit = 50,
  offset = 0
): Promise<ApiResult<{ items: RightsItem[]; total: number }>> =>
  mapOk(
    await apiRequest<{ items?: Raw[]; total?: number }>(`${BASE}/artworks`, {
      admin_portal_token: token,
      // "Override" lists every overridden work (also the ones an override made visible); the rest list restricted works.
      status: filter === "override" ? "any" : "restricted",
      reason: filter && filter !== "override" ? filter : undefined,
      override: filter === "override" ? "set" : undefined,
      q: q.trim() || undefined,
      limit,
      offset,
    }),
    (d) => {
      const items = (Array.isArray(d?.items) ? d.items : []).filter((i) => i && i.artwork_id !== undefined).map(normalizeItem);
      return { items, total: d?.total === undefined || d?.total === null ? offset + items.length : Number(d.total) || 0 };
    }
  );

export const getRightsSummary = async (token: string): Promise<ApiResult<RightsCounts>> =>
  mapOk(await apiRequest<{ active_artworks?: number; by_status_reason?: Raw[] }>(`${BASE}/summary`, { admin_portal_token: token }), (d) => {
    const rows = Array.isArray(d?.by_status_reason) ? d.by_status_reason : [];
    const count = (pred: (r: Raw) => boolean) => rows.filter(pred).reduce((acc, r) => acc + (Number(r.count) || 0), 0);
    return {
      living_artist: count((r) => r.status === "restricted" && r.reason === "living_artist"),
      died_after_cutoff: count((r) => r.status === "restricted" && r.reason === "died_after_cutoff"),
      unknown_dates: count((r) => r.status === "restricted" && r.reason === "unknown_dates"),
      override: rows.reduce((acc, r) => acc + (Number(r.overrides) || 0), 0),
      restricted_total: count((r) => r.status === "restricted"),
      active_artworks: Number(d?.active_artworks) || 0,
    };
  });

type WriteResult = { rights_status: RightsStatus | null; rights_reason: string | null; rights_override: RightsStatus | null };

const writeResult = (d: Raw | null): WriteResult => ({
  rights_status: str(d?.rights_status) as RightsStatus | null,
  rights_reason: str(d?.rights_reason),
  rights_override: str(d?.rights_override) as RightsStatus | null,
});

/** "Licensed: display allowed" is display = "full". */
export const setOverride = async (token: string, artworkId: number, note: string, display: RightsStatus = "full"): Promise<ApiResult<WriteResult>> =>
  mapOk(await apiRequest<Raw>(`${BASE}/artworks/${artworkId}/override`, { admin_portal_token: token }, jsonInit("PUT", { display, note: note.trim() })), writeResult);

export const clearOverride = async (token: string, artworkId: number, note: string): Promise<ApiResult<WriteResult>> =>
  mapOk(await apiRequest<Raw>(`${BASE}/artworks/${artworkId}/override`, { admin_portal_token: token }, jsonInit("DELETE", { note: note.trim() })), writeResult);

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export const COPYRIGHT_TERM_YEARS = 70;
/** policy.EARLY_WORK_MAX_YEAR and MAX_LIFESPAN_YEARS */
export const EARLY_WORK_MAX_YEAR = 1880;
export const MAX_LIFESPAN_YEARS = 125;

/** Same as policy.cutoff_year(): died in (this year - 71) or earlier is free. */
export function currentRule(now = new Date()): RightsRule {
  return { term_years: COPYRIGHT_TERM_YEARS, last_free_death_year: now.getFullYear() - COPYRIGHT_TERM_YEARS - 1 };
}

const REASON_LABEL: Record<string, string> = {
  living_artist: "Living artist",
  died_after_cutoff: "Died after the cutoff",
  unknown_dates: "Unknown dates",
  override: "Admin override",
  died_before_cutoff: "Died before the cutoff",
  early_work: "Early work",
  born_long_before_cutoff: "Born long before the cutoff",
  portal_submission: "Submitted by the artist",
};

export const reasonLabel = (r: string | null) => (r ? REASON_LABEL[r] ?? r.replace(/_/g, " ") : "Not computed yet");

export function reasonDetail(item: RightsItem, rule: RightsRule): string {
  switch (item.reason) {
    case "living_artist":
      return "The artist is alive (no death year, born within a lifetime).";
    case "died_after_cutoff":
      return item.died_year ? `Died ${item.died_year}; free from 1 January ${item.died_year + rule.term_years + 1}.` : `Died after ${rule.last_free_death_year}.`;
    case "unknown_dates":
      return "No death year and nothing that proves the work is old enough, so we play safe.";
    case "override":
      return item.override?.display === "full" ? "An admin allowed display (licence)." : "An admin hid it.";
    default:
      return "";
  }
}

export function lifeDates(item: Pick<RightsItem, "born_year" | "died_year" | "reason">): string {
  if (item.died_year) return `${item.born_year ?? "?"} to ${item.died_year}`;
  if (item.reason === "living_artist") return item.born_year ? `born ${item.born_year}` : "living";
  return item.born_year ? `born ${item.born_year}, death unknown` : "dates unknown";
}

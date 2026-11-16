// Types and calls for the Museums admin area (Europe import review, museum picker, merge).
// Backend routes: /admin/museums/*.
//
// Aligned with the routes as they landed on 2026-11-11:
//   GET  /admin/museums/staging/summary            per-country counts
//   GET  /admin/museums/staging/items              filtered staged items
//   POST /admin/museums/staging/batch_approve      {countries, expected_count}; 409 when the set moved
//   POST /admin/museums/staging/{qid}/approve      {note?}
//   POST /admin/museums/staging/{qid}/reject       {note?}
//   POST /admin/museums/staging/{qid}/link         {museum_id, note?}: the item IS that existing row
//   POST /admin/museums/staging/{qid}/duplicate    {museum_id, note?}: twin / wing / building, never published
//   POST /admin/museums/staging/promote            {countries, limit, dry_run}: approved -> live museum table
//   POST /admin/museums/merge                      {source_museum_id, target_museum_id, note?}
// Auth: admin_portal_token query param today; apiRequest sends Authorization: Bearer instead once NEXT_PUBLIC_API_BEARER_AUTH=true; bodies are JSON (pydantic, extra fields forbidden).
//
// STILL ASSUMED (no admin route for these yet; the pages show "not deployed" until they exist):
//   GET  /admin/museums/live/search?q=&limit=      live museums by English, native or legacy name
//   GET  /admin/museums/live/{museum_id}           one live museum row
//   GET  /admin/artworks/{artwork_id}/museum?is_pending=
//   POST /admin/artworks/{artwork_id}/museum?is_pending=  {link_status: linked|private|unknown, museum_id?}
// The merge preview reuses GET /admin/rights/artworks?museum_id=, which lists
// live artworks by museum; pending submissions are repointed too but are not listed there.
import { apiRequest, ApiResult } from "./api";

export type MuseumKind = "museum" | "art_gallery" | "commercial_gallery";
export type DisplayMode = "full" | "location_only";
export type StagingStatus = "pending" | "needs_review" | "approved" | "rejected" | "duplicate_of";

export type CountrySummary = {
  country_iso: string;
  country_name: string;
  total: number;
  counts: {
    /** Not decided yet: status pending (routine) plus needs_review (flagged). */
    undecided: number;
    needs_review: number;
    approved: number;
    rejected: number;
    /** Marked as a twin / wing / building of another museum; never published. */
    duplicate_of: number;
    /** Duplicate candidates (similar existing row nearby, Wikidata twin, QID on a retired row), any status. */
    duplicates: number;
    /** Live in the museum table. */
    promoted: number;
    /** Approved but not (or not freshly) published yet. */
    awaiting_promotion: number;
    /** Already in our table under the same Wikidata ID. */
    matched_existing: number;
  };
  kinds: Record<MuseumKind, number>;
  images: { with_image: number };
  /** What "Approve all except flagged" would approve right now, and what it leaves alone. */
  batch: { approvable: number; flagged: number };
};

export type ExistingMatch = {
  museum_id: number;
  method: "qid" | "name_geo" | string;
  score: number | null;
  distance_m: number | null;
  name: string | null;
  city: string | null;
  wikidata_qid: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type MuseumCandidate = {
  qid: string;
  country_iso: string;
  status: StagingStatus;
  kind: MuseumKind;
  display_mode: DisplayMode;
  name_en: string | null;
  name_native: string | null;
  native_lang: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  is_closed: boolean;
  popularity: number;
  wikidata_paintings: number;
  types: string[];
  image_url: string | null;
  /** "public_domain" | "cc0" (only those are kept) */
  image_license: string | null;
  image_license_raw: string | null;
  image_credit: string | null;
  image_source_url: string | null;
  flags: string[];
  twin_qids: string[];
  match: ExistingMatch | null;
  is_duplicate_candidate: boolean;
  duplicate_of_museum_id: number | null;
  duplicate_of_qid: string | null;
  promoted_museum_id: number | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  retrieved_at: string | null;
};

export type CandidateFilters = {
  status: "undecided" | "approved" | "rejected" | "duplicate_of" | "all";
  kind: MuseumKind | "";
  has_image: "yes" | "no" | "";
  flag: "" | "flagged" | "duplicates" | "closed" | "no_coords";
  q: string;
};

/** A live museum_information row, as the picker and the /museum page show it. */
export type MuseumOption = {
  museum_id: number;
  name: string;
  name_native: string | null;
  city: string | null;
  country: string | null;
  country_iso: string | null;
  kind: MuseumKind | null;
  display_mode: DisplayMode | null;
  artwork_count: number | null;
  wikidata_qid: string | null;
};

export type MuseumDetail = MuseumOption & {
  latitude: number | null;
  longitude: number | null;
  website_link: string | null;
  wikipedia_link: string | null;
  is_closed: boolean;
  image_license: string | null;
  image_credit: string | null;
  image_source_url: string | null;
  source: string | null;
  merged_into_museum_id: number | null;
};

/** How an artwork is linked to a museum. */
export type MuseumLinkStatus = "linked" | "private" | "unknown" | "needs_review";

export type ArtworkMuseumLink = {
  artwork_id: number;
  museum_id: number | null;
  museum_link_status: MuseumLinkStatus | null;
  /** Free-text location from the source (e.g. "Uffizi, Florence"), a hint only. */
  location_text: string | null;
  museum: MuseumOption | null;
};

export type MuseumArtworks = { total: number; items: { artwork_id: number; title: string; artist_name: string | null }[] };

// ---------------------------------------------------------------------------
// Normalisation: a missing or renamed field degrades to 0 / null / [] instead of crashing.
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;
const mapOk = <T, U>(r: ApiResult<T>, f: (t: T) => U): ApiResult<U> => (r.ok ? { ...r, data: f(r.data) } : r);
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const str = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined).map(String) : []);
const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Flags that mark a duplicate candidate (scope.DUPLICATE_FLAGS). */
const DUPLICATE_FLAGS = new Set(["twin_candidate", "near_existing", "qid_conflict"]);

export function normalizeCountry(c: Raw): CountrySummary {
  const iso = String(c.country_iso ?? "").toUpperCase();
  const routine = num(c.pending);
  const needsReview = num(c.needs_review);
  const undecided = routine + needsReview;
  const approvable = c.batch_approvable === undefined ? routine : num(c.batch_approvable);
  return {
    country_iso: iso,
    country_name: countryName(iso, str(c.country_name)),
    total: num(c.total),
    counts: {
      undecided,
      needs_review: needsReview,
      approved: num(c.approved),
      rejected: num(c.rejected),
      duplicate_of: num(c.duplicate_of),
      duplicates: num(c.duplicate_candidates),
      promoted: num(c.promoted),
      awaiting_promotion: num(c.awaiting_promotion),
      matched_existing: num(c.matched_existing),
    },
    kinds: { museum: num(c.kind_museum), art_gallery: num(c.kind_art_gallery), commercial_gallery: num(c.kind_commercial_gallery) },
    images: { with_image: num(c.with_image) },
    batch: { approvable, flagged: Math.max(0, undecided - approvable) },
  };
}

export function normalizeCandidate(r: Raw): MuseumCandidate {
  const overrides = (r.overrides && typeof r.overrides === "object" ? r.overrides : {}) as Raw;
  const kind = (str(overrides.kind) ?? str(r.kind) ?? "museum") as MuseumKind;
  const flags = strList(r.flags);
  const matchId = numOrNull(r.match_museum_id);
  const method = str(r.match_method);
  return {
    qid: String(r.qid ?? ""),
    country_iso: String(r.country_iso ?? ""),
    status: (str(r.status) ?? "pending") as StagingStatus,
    kind,
    display_mode: (kind === "commercial_gallery" ? "location_only" : str(overrides.display_mode) ?? str(r.display_mode) ?? "full") as DisplayMode,
    name_en: str(overrides.name_en) ?? str(r.name_en),
    name_native: str(overrides.name_native) ?? str(r.name_native),
    native_lang: str(r.native_lang),
    city: str(r.city),
    latitude: numOrNull(r.latitude ?? r.lat),
    longitude: numOrNull(r.longitude ?? r.lon),
    website: str(r.website),
    is_closed: Boolean(r.is_closed),
    popularity: num(r.popularity),
    wikidata_paintings: num(r.wikidata_paintings),
    types: strList(r.types),
    image_url: str(r.image_remote_url ?? r.image_url),
    image_license: str(r.image_license),
    image_license_raw: str(r.image_license_raw),
    image_credit: str(r.image_credit),
    image_source_url: str(r.image_source_url),
    flags,
    twin_qids: strList(r.twin_qids),
    match:
      matchId === null
        ? null
        : {
            museum_id: matchId,
            method: method ?? "",
            score: numOrNull(r.match_score),
            distance_m: numOrNull(r.match_distance_m),
            name: str(r.match_museum_name),
            city: str(r.match_museum_city),
            wikidata_qid: str(r.match_museum_qid),
            latitude: numOrNull(r.match_museum_latitude),
            longitude: numOrNull(r.match_museum_longitude),
          },
    is_duplicate_candidate: method === "name_geo" || flags.some((f) => DUPLICATE_FLAGS.has(f)),
    duplicate_of_museum_id: numOrNull(r.duplicate_of_museum_id),
    duplicate_of_qid: str(r.duplicate_of_qid),
    promoted_museum_id: numOrNull(r.promoted_museum_id),
    review_note: str(r.review_note),
    reviewed_by: str(r.reviewed_by),
    reviewed_at: str(r.reviewed_at),
    retrieved_at: str(r.retrieved_at),
  };
}

function normalizeOption(r: Raw): MuseumOption {
  const id = num(r.museum_id ?? r.id);
  return {
    museum_id: id,
    name: str(r.name_en) ?? str(r.name) ?? str(r.museum_name) ?? str(r.name_native) ?? `Museum #${id}`,
    name_native: str(r.name_native),
    city: str(r.city),
    country: str(r.country),
    country_iso: str(r.country_iso),
    kind: (str(r.kind) as MuseumKind | null) ?? null,
    display_mode: (str(r.display_mode) as DisplayMode | null) ?? null,
    artwork_count: numOrNull(r.artwork_count),
    wikidata_qid: str(r.wikidata_qid),
  };
}

function normalizeDetail(r: Raw): MuseumDetail {
  const image = (r.image && typeof r.image === "object" ? r.image : {}) as Raw;
  return {
    ...normalizeOption(r),
    latitude: numOrNull(r.latitude ?? r.lat),
    longitude: numOrNull(r.longitude ?? r.lng),
    website_link: str(r.website_link ?? r.website),
    wikipedia_link: str(r.wikipedia_link ?? r.wikipedia_url),
    is_closed: Boolean(r.is_closed),
    image_license: str(r.image_license ?? image.license),
    image_credit: str(r.image_credit ?? image.credit),
    image_source_url: str(r.image_source_url ?? image.source_url),
    source: str(r.source),
    merged_into_museum_id: numOrNull(r.merged_into_museum_id),
  };
}

function normalizeLink(artworkId: number, d: Raw | null): ArtworkMuseumLink {
  const m = d?.museum && typeof d.museum === "object" ? normalizeOption(d.museum as Raw) : null;
  return {
    artwork_id: artworkId,
    museum_id: numOrNull(d?.museum_id),
    museum_link_status: (str(d?.museum_link_status) as MuseumLinkStatus | null) ?? null,
    location_text: str(d?.location_text ?? d?.location),
    museum: m,
  };
}

const BASE = "/admin/museums";

// ---------------------------------------------------------------------------
// Import review
// ---------------------------------------------------------------------------

export const listCountries = async (token: string): Promise<ApiResult<{ countries: CountrySummary[] }>> =>
  mapOk(await apiRequest<{ countries?: Raw[] }>(`${BASE}/staging/summary`, { admin_portal_token: token }), (d) => ({
    countries: (Array.isArray(d?.countries) ? d.countries : []).map(normalizeCountry).filter((c) => c.country_iso),
  }));

/** There is no per-country route; the summary is small (one row per country). */
export const getCountry = async (token: string, iso: string): Promise<ApiResult<{ country: CountrySummary | null }>> =>
  mapOk(await listCountries(token), (d) => ({ country: d.countries.find((c) => c.country_iso === iso) ?? null }));

export const listCandidates = async (
  token: string,
  iso: string,
  f: CandidateFilters,
  limit = 50,
  offset = 0
): Promise<ApiResult<{ items: MuseumCandidate[]; total: number }>> =>
  mapOk(
    await apiRequest<{ items?: Raw[]; total?: number }>(`${BASE}/staging/items`, {
      admin_portal_token: token,
      country: iso,
      status: f.status === "undecided" ? "pending,needs_review" : f.status === "all" ? undefined : f.status,
      kind: f.kind || undefined,
      has_image: f.has_image === "yes" ? true : f.has_image === "no" ? false : undefined,
      needs_review: f.flag === "flagged" ? true : undefined,
      duplicate_candidates: f.flag === "duplicates" ? true : undefined,
      flag: f.flag === "closed" || f.flag === "no_coords" ? f.flag : undefined,
      q: f.q.trim() || undefined,
      limit,
      offset,
    }),
    (d) => {
      const items = (Array.isArray(d?.items) ? d.items : []).map(normalizeCandidate).filter((c) => c.qid);
      return { items, total: d?.total === undefined || d?.total === null ? offset + items.length : num(d.total) };
    }
  );

export type DecisionResult = { qid: string; status: StagingStatus; museum_id: number | null };

const decisionResult =
  (qid: string, fallback: StagingStatus) =>
  (d: Raw | null): DecisionResult => ({
    qid,
    status: (str(d?.status) as StagingStatus | null) ?? fallback,
    museum_id: numOrNull(d?.museum_id ?? d?.duplicate_of_museum_id),
  });

const withNote = (note: string | undefined, body: Raw = {}) => (note?.trim() ? { ...body, note: note.trim() } : body);

export const approveCandidate = async (token: string, qid: string, note?: string): Promise<ApiResult<DecisionResult>> =>
  mapOk(
    await apiRequest<Raw>(`${BASE}/staging/${encodeURIComponent(qid)}/approve`, { admin_portal_token: token }, json(withNote(note))),
    decisionResult(qid, "approved")
  );

export const rejectCandidate = async (token: string, qid: string, note?: string): Promise<ApiResult<DecisionResult>> =>
  mapOk(
    await apiRequest<Raw>(`${BASE}/staging/${encodeURIComponent(qid)}/reject`, { admin_portal_token: token }, json(withNote(note))),
    decisionResult(qid, "rejected")
  );

/** "This Wikidata item IS museum #id": the QID goes on that row; publishing refreshes it instead of adding a new one. */
export const linkCandidate = async (token: string, qid: string, museumId: number, note?: string): Promise<ApiResult<DecisionResult>> =>
  mapOk(
    await apiRequest<Raw>(`${BASE}/staging/${encodeURIComponent(qid)}/link`, { admin_portal_token: token }, json(withNote(note, { museum_id: museumId }))),
    decisionResult(qid, "approved")
  );

/** "This item duplicates museum #id, or another Wikidata item" (twin, wing, building item): it is never published. */
export const markDuplicate = async (
  token: string,
  qid: string,
  target: { museumId: number } | { qid: string },
  note?: string
): Promise<ApiResult<DecisionResult>> =>
  mapOk(
    await apiRequest<Raw>(
      `${BASE}/staging/${encodeURIComponent(qid)}/duplicate`,
      { admin_portal_token: token },
      json(withNote(note, "museumId" in target ? { museum_id: target.museumId } : { duplicate_of_qid: target.qid }))
    ),
    decisionResult(qid, "duplicate_of")
  );

export const approveCountryBatch = async (token: string, iso: string, expectedCount: number): Promise<ApiResult<{ count: number }>> =>
  mapOk(
    await apiRequest<Raw>(`${BASE}/staging/batch_approve`, { admin_portal_token: token }, json({ countries: [iso], expected_count: expectedCount })),
    (d) => ({ count: num(d?.count) })
  );

/** Max rows per promote call (scope.PROMOTE_LIMIT_MAX). */
export const PROMOTE_LIMIT = 2000;

export const promoteCountry = async (token: string, iso: string): Promise<ApiResult<{ selected: number; inserted: number; updated: number }>> =>
  mapOk(
    await apiRequest<Raw>(`${BASE}/staging/promote`, { admin_portal_token: token }, json({ countries: [iso], limit: PROMOTE_LIMIT, dry_run: false })),
    (d) => ({ selected: num(d?.selected), inserted: num(d?.inserted), updated: num(d?.updated) })
  );

export const mergeMuseums = async (
  token: string,
  sourceId: number,
  targetId: number,
  note?: string
): Promise<ApiResult<{ artworks: number; pending_artworks: number; already_merged: boolean }>> =>
  mapOk(
    await apiRequest<Raw>(`${BASE}/merge`, { admin_portal_token: token }, json(withNote(note, { source_museum_id: sourceId, target_museum_id: targetId }))),
    (d) => {
      const counts = (d?.counts && typeof d.counts === "object" ? d.counts : {}) as Raw;
      return { artworks: num(counts.artworks), pending_artworks: num(counts.pending_artworks), already_merged: Boolean(d?.already_merged) };
    }
  );

/** Live artworks that point at a museum (merge preview). Uses the rights list, which filters by museum_id. */
export const listMuseumArtworks = async (token: string, museumId: number, limit = 50): Promise<ApiResult<MuseumArtworks>> =>
  mapOk(
    await apiRequest<{ total?: number; items?: Raw[] }>(`/admin/rights/artworks`, {
      admin_portal_token: token,
      status: "any",
      museum_id: museumId,
      active_only: false,
      limit,
    }),
    (d) => {
      const items = (Array.isArray(d?.items) ? d.items : []).map((r) => ({
        artwork_id: num(r.artwork_id),
        title: str(r.title) ?? `Artwork #${r.artwork_id}`,
        artist_name: str(r.artist_name),
      }));
      return { total: d?.total === undefined || d?.total === null ? items.length : num(d.total), items };
    }
  );

// ---------------------------------------------------------------------------
// Live museums (picker, /museum page) and artwork links: assumed routes, see the header.
// ---------------------------------------------------------------------------

export const searchMuseums = async (token: string, q: string, limit = 20): Promise<ApiResult<{ museums: MuseumOption[] }>> =>
  mapOk(await apiRequest<{ results?: Raw[]; museums?: Raw[] }>(`${BASE}/live/search`, { admin_portal_token: token, q: q.trim(), limit }), (d) => {
    const list = Array.isArray(d?.results) ? d.results : Array.isArray(d?.museums) ? d.museums : [];
    return { museums: list.map(normalizeOption).filter((m) => m.museum_id > 0) };
  });

export const getMuseum = async (token: string, museumId: number): Promise<ApiResult<{ museum: MuseumDetail | null }>> =>
  mapOk(await apiRequest<Raw>(`${BASE}/live/${museumId}`, { admin_portal_token: token }), (d) => {
    const row = (d?.museum && typeof d.museum === "object" ? d.museum : d) as Raw | null;
    return { museum: row && (row.museum_id ?? row.id) !== undefined ? normalizeDetail(row) : null };
  });

export const getArtworkMuseum = async (token: string, artworkId: number, isPending: boolean): Promise<ApiResult<ArtworkMuseumLink>> =>
  mapOk(await apiRequest<Raw>(`/admin/artworks/${artworkId}/museum`, { admin_portal_token: token, is_pending: isPending }), (d) => normalizeLink(artworkId, d));

export const setArtworkMuseum = async (
  token: string,
  artworkId: number,
  isPending: boolean,
  choice: { status: "linked"; museumId: number } | { status: "private" | "unknown" }
): Promise<ApiResult<ArtworkMuseumLink | null>> =>
  mapOk(
    await apiRequest<Raw>(
      `/admin/artworks/${artworkId}/museum`,
      { admin_portal_token: token, is_pending: isPending },
      json(choice.status === "linked" ? { link_status: "linked", museum_id: choice.museumId } : { link_status: choice.status })
    ),
    // Only trust the echo when it carries the link fields; otherwise the caller keeps its own choice.
    (d) => (d && "museum_link_status" in d ? normalizeLink(artworkId, d) : null)
  );

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export const KIND_LABEL: Record<MuseumKind, string> = {
  museum: "Museum",
  art_gallery: "Art gallery",
  commercial_gallery: "Commercial gallery",
};

export const COMMERCIAL_NOTE = "Location only (no details shown in the app)";

export const STATUS_LABEL: Record<StagingStatus, string> = {
  pending: "Pending",
  needs_review: "Needs review",
  approved: "Approved",
  rejected: "Rejected",
  duplicate_of: "Duplicate",
};

/** Pill colour key for StatusPill. */
export function statusPillKey(s: StagingStatus): string {
  if (s === "approved") return "accepted";
  if (s === "rejected") return "rejected";
  if (s === "duplicate_of") return "muted";
  return "submitted";
}

export const isDecided = (s: StagingStatus) => s === "approved" || s === "rejected" || s === "duplicate_of";

/** Set by the API when an approved museum changed at the source and came back to review. */
export const CONTENT_CHANGED_FLAG = "content_changed";

const FLAG_LABEL: Record<string, string> = {
  [CONTENT_CHANGED_FLAG]: "Changed at the source after it was approved: the live museum keeps the old data until you approve again",
  no_coords: "No coordinates",
  closed: "Closed (Wikidata)",
  twin_candidate: "Wikidata twin nearby (building or institution item)",
  near_existing: "Similar museum already in our table",
  outside_europe: "Overseas territory, outside Europe",
  no_name: "No name",
  qid_conflict: "Its Wikidata ID sits on a retired (merged) row",
};

export const flagLabel = (f: string) => FLAG_LABEL[f] ?? f.replace(/_/g, " ");

const LICENSE_LABEL: Record<string, string> = { public_domain: "Public domain", cc0: "CC0", unknown_legacy: "Legacy image, licence unknown" };

export const licenseLabel = (l: string | null) => (l ? LICENSE_LABEL[l] ?? l : "Licence unknown");

let regionNames: Intl.DisplayNames | null = null;

/** "IT" -> "Italy" (server name first, then the browser's region names). */
export function countryName(iso: string, serverName?: string | null): string {
  if (serverName) return serverName;
  if (!iso) return "";
  try {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(iso.toUpperCase()) ?? iso;
  } catch {
    return iso;
  }
}

export const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("en-US");

export function percent(part: number, whole: number): string {
  if (!whole) return "0%";
  const p = (part / whole) * 100;
  return p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`;
}

export function formatCoord(lat: number | null, lng: number | null): string | null {
  if (lat === null || lng === null || lat === undefined || lng === undefined) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** OpenStreetMap link with a marker, for a quick look at the location (no map library in the Portal). */
export function osmUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

export const wikidataUrl = (qid: string) => `https://www.wikidata.org/wiki/${encodeURIComponent(qid)}`;

export function formatDistance(m: number | null | undefined): string {
  if (m === null || m === undefined) return "distance unknown";
  return m < 1000 ? `${Math.round(m)} m away` : `${(m / 1000).toFixed(1)} km away`;
}

export const displayName = (c: Pick<MuseumCandidate, "name_en" | "name_native" | "qid">) => c.name_en || c.name_native || c.qid;

// Types and calls for the Bots (data connectors) admin area.
// Backend routes: /admin/connectors/*.
import { apiRequest, ApiResult } from "./api";

export type SourceCounts = {
  new_7d: number;
  pending: number;
  accepted: number;
  rejected: number;
  candidates: number;
  artist_unresolved: number;
  matched: number;
  skipped: number;
  errors: number;
  total: number;
};

export type LlmState = "on" | "off" | "budget_reached";

export type RunStatus = "running" | "succeeded" | "capped" | "failed" | "skipped_disabled";

export type ConnectorRun = {
  run_id: number;
  source_key: string;
  mode: "dry_run" | "submit";
  trigger: string | null;
  github_run_url?: string | null;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  seen: number;
  unchanged?: number;
  skipped_rights?: number;
  skipped_scope?: number;
  matched?: number;
  duplicate_suspect?: number;
  artist_unresolved?: number;
  metadata_only: number;
  submitted: number;
  would_submit: number;
  errors: number;
  http_requests?: number;
  http_429?: number;
  // LLM normalize stage (absent on older API versions)
  llm_calls?: number;
  llm_input_tokens?: number;
  llm_output_tokens?: number;
  llm_cost_usd?: number | string | null;
  llm_cleaned?: number;
  llm_fallbacks?: number;
  // What the server decided about the LLM step when the run started (absent on older API versions / runs).
  llm_state?: LlmState | null;
  error: string | null;
  error_samples?: { source_object_id: string; error: string }[] | null;
};

export type DataSource = {
  source_key: string;
  display_name: string;
  base_url: string;
  license_policy: string;
  license_summary: string;
  license_warning: string | null;
  attribution_text: string | null;
  metadata_only: boolean;
  rate_limit_per_sec: number;
  max_submissions_per_run: number;
  schedule_cron: string | null;
  workflow_file: string | null;
  enabled: boolean;
  enabled_changed_by: string | null;
  enabled_changed_at: string | null;
  counts: SourceCounts;
  last_run: ConnectorRun | null;
};

export type SourceItem = {
  source_object_id: string;
  source_url: string;
  rights: string;
  status: string;
  artwork_id: number | null;
  pending_id: number | null;
  matched_artwork_id: number | null;
  payload: Record<string, unknown> | null;
  first_seen_at: string;
  updated_at: string;
  last_error: string | null;
};

export type Provenance = {
  artwork_id: number;
  pending_id: number | null;
  source_key: string;
  source_name: string;
  source_object_id: string;
  source_url: string;
  license: string;
  rights_url: string | null;
  image_source_url: string | null;
  attribution: string | null;
  duplicate_of_artwork_id: number | null;
  license_summary: string;
  license_warning: string | null;
  // LLM clean-up provenance (absent on older API versions)
  cleaned_by_model?: boolean;
  llm_model?: string | null;
  prompt_version?: string | null;
  needs_review?: boolean;
  review_flags?: { flag: string; reason: string }[] | null;
  raw_record?: { source_fields?: Record<string, unknown>; parsed?: Record<string, unknown> } | null;
  cleaned_record?: Record<string, unknown> | null;
};

export type BotPendingItem = {
  artwork_id: number;
  pending_id: number;
  title?: string;
  artist?: string;
  artist_id?: number;
  spaces_dir_low_resolution?: string;
  pending_situation?: number;
  source: Provenance;
};

const BASE = "/admin/connectors";

export const listSources = (token: string): Promise<ApiResult<{ sources: DataSource[]; run_now_configured: boolean }>> =>
  apiRequest(`${BASE}/sources`, { admin_portal_token: token });

export const getSource = (token: string, key: string): Promise<ApiResult<{ source: DataSource; run_now_configured: boolean }>> =>
  apiRequest(`${BASE}/sources/${encodeURIComponent(key)}`, { admin_portal_token: token });

export const setSourceEnabled = (token: string, key: string, enabled: boolean): Promise<ApiResult<{ source: DataSource }>> =>
  apiRequest(`${BASE}/sources/${encodeURIComponent(key)}/enabled`, { admin_portal_token: token, enabled }, { method: "POST" });

export const listRuns = (token: string, key: string, limit = 20): Promise<ApiResult<{ runs: ConnectorRun[] }>> =>
  apiRequest(`${BASE}/sources/${encodeURIComponent(key)}/runs`, { admin_portal_token: token, limit });

export const listItems = (
  token: string,
  key: string,
  status: string | null,
  limit = 50,
  offset = 0
): Promise<ApiResult<{ items: SourceItem[] }>> =>
  apiRequest(`${BASE}/sources/${encodeURIComponent(key)}/items`, { admin_portal_token: token, status, limit, offset });

export const runNow = (
  token: string,
  key: string,
  mode: "dry_run" | "submit"
): Promise<ApiResult<{ status: string; actions_url: string; mode: string }>> =>
  apiRequest(`${BASE}/sources/${encodeURIComponent(key)}/run`, { admin_portal_token: token, mode }, { method: "POST" });

export const listBotPending = (
  token: string,
  page: number,
  perPage: number,
  sourceKey?: string
): Promise<ApiResult<{ items: BotPendingItem[] }>> =>
  apiRequest(`${BASE}/pending_submissions`, {
    admin_portal_token: token,
    page_count: page,
    artworks_per_page: perPage,
    source_key: sourceKey,
  });

export const getProvenance = (token: string, artworkIds: number[]): Promise<ApiResult<{ provenance: Record<string, Provenance> }>> =>
  apiRequest(`${BASE}/provenance`, { admin_portal_token: token, artwork_ids: artworkIds.join(",") });

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "0 3 * * 1" -> "Weekly, Monday 03:00 UTC". Falls back to the raw cron. */
export function describeCron(cron: string | null): string {
  if (!cron) return "Not scheduled";
  const parts = cron.trim().split(/\s+/);
  if (parts.length === 5 && parts[2] === "*" && parts[3] === "*" && /^\d$/.test(parts[4]) && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
    const hh = parts[1].padStart(2, "0");
    const mm = parts[0].padStart(2, "0");
    return `Weekly, ${DAYS[Number(parts[4]) % 7]} ${hh}:${mm} UTC`;
  }
  return `cron ${cron}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** LLM cost of a run; "—" when the run made no LLM calls. */
export function formatUsd(value: number | string | null | undefined, calls?: number): string {
  const n = Number(value ?? 0);
  if ((!calls && !n) || !Number.isFinite(n)) return "—";
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

const show = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("display" in o) return show(o.display);
    if ("canonical_name" in o) return [o.qualifier, o.canonical_name].filter(Boolean).join(" ");
    return JSON.stringify(v);
  }
  return String(v);
};

/** Raw (v1 parse) vs cleaned (LLM) values that differ, for the review panel. */
export function llmDiff(p: Pick<Provenance, "raw_record" | "cleaned_record">): { field: string; raw: string; cleaned: string }[] {
  const raw = p.raw_record?.parsed ?? {};
  const c = p.cleaned_record;
  if (!c) return [];
  const pairs: [string, unknown, unknown][] = [
    ["Title", raw.title, c.title],
    ["Original title", raw.original_title, c.original_title],
    ["Artist", raw.artist_name, c.artist],
    ["Date", raw.year, c.date],
    ["Medium", raw.media, c.medium],
    ["Dimensions", raw.dimensions, c.dimensions],
  ];
  return pairs
    .map(([field, r, cl]) => ({ field, raw: show(r), cleaned: show(cl) }))
    .filter((d) => d.cleaned !== "" && d.raw !== d.cleaned);
}

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  running: "Running",
  succeeded: "Succeeded",
  capped: "Capped",
  failed: "Failed",
  skipped_disabled: "Skipped (disabled)",
};

export const ITEM_STATUS_LABEL: Record<string, string> = {
  submitted: "Pending review",
  accepted: "Accepted",
  rejected: "Rejected",
  metadata_only: "Candidate (metadata only)",
  artist_unresolved: "Artist not found",
  matched_existing: "Already in catalogue",
  duplicate_suspect: "Possible duplicate",
  skipped_rights: "Skipped: rights",
  skipped_scope: "Skipped: scope",
  error: "Error",
};

// ---------------------------------------------------------------------------
// Enable / disable confirmation (shared by the list and the detail page)
// ---------------------------------------------------------------------------

export const isRisky = (s: Pick<DataSource, "license_warning" | "metadata_only">) => Boolean(s.license_warning) || s.metadata_only;

export async function confirmToggle(
  source: DataSource,
  next: boolean,
  showConfirm: (message: string) => Promise<string | boolean>
): Promise<boolean> {
  if (!next) return Boolean(await showConfirm(`Disable ${source.display_name}? Scheduled runs will stop until you enable it again.`));
  if (isRisky(source)) {
    return Boolean(
      await showConfirm(
        `Enable ${source.display_name}? ${source.license_warning ?? "This source has no reuse licence."} Only continue if you have a legal review or a written licence.`
      )
    );
  }
  return Boolean(await showConfirm(`Enable ${source.display_name}? Its weekly run will start creating pending submissions for review.`));
}

/**
 * Source/provenance links come from third-party APIs (museum open-access data),
 * so only allow http(s) URLs into an href; anything else (javascript:, data:, …) becomes "#".
 */
export function safeExternalUrl(u: string | null | undefined): string {
  if (!u) return "#";
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:" ? u : "#";
  } catch {
    return "#";
  }
}

/**
 * Same rule for <img src> values that come from API data: only http(s).
 * Returns undefined otherwise, so React leaves the attribute out and nothing is requested.
 */
export function safeImageUrl(u: string | null | undefined): string | undefined {
  const safe = safeExternalUrl(u);
  return safe === "#" ? undefined : safe;
}

// ---------------------------------------------------------------------------
// Settings and LLM budget. Backend: /admin/connectors/budget and /sources/{key}/settings.
// The API owns the hard ceilings (its environment); this page can only ask for less.
// ---------------------------------------------------------------------------

/** A cap as the API reports it: what was asked for, the API's ceiling, and what applies. */
export type Cap = { requested: number; ceiling: number; effective: number; clamped: boolean };

export type SourceSettings = {
  source_key: string;
  enabled: boolean;
  schedule_cron: string | null;
  llm_enabled: boolean;
  llm_model: string | null; // null = the connector's default model
  llm_max_usd_per_run: Cap;
  llm_max_usd_per_month: Cap;
  max_items_per_run: number;
  settings_changed_by: string | null;
  settings_changed_at: string | null;
};

export type Ceilings = { llm_max_usd_per_run: number; llm_max_usd_per_month: number };

export type SettingChange = {
  id: number;
  actor_email: string | null;
  action: string;
  target: string | null;
  details: { changes?: Record<string, { old: unknown; new: unknown }>; enabled?: boolean } | null;
  created_at: string;
};

export type SettingsResponse = {
  settings: SourceSettings;
  ceilings: Ceilings;
  allowed_models: string[];
  max_items_per_run_limit: number;
  changes: SettingChange[];
  changed?: Record<string, { old: unknown; new: unknown }>;
};

export type MonthUsage = {
  month: string; // "2026-11"
  runs: number;
  llm_runs: number;
  llm_calls: number;
  llm_input_tokens: number;
  llm_output_tokens: number;
  llm_cleaned: number;
  llm_fallbacks: number;
  cost_usd: number;
};

export type BudgetBlock = {
  cap: Cap;
  spent_usd: number;
  remaining_usd: number;
  projected_month_end_usd: number;
  projected_over_cap: boolean;
  history: MonthUsage[];
};

export type SourceBudget = BudgetBlock & {
  source_key: string;
  display_name: string;
  settings: SourceSettings;
  llm_state: LlmState;
  last_llm_run_at: string | null;
};

/** `configured` is null when the API cannot see the secret at all. Never carries a value. */
export type Credential = {
  name: string;
  purpose: string;
  lives_in: string;
  configured: boolean | null;
  visible_to_api: boolean;
  note: string;
  last_used_at?: string | null;
};

export type BudgetOverview = {
  month: string;
  as_of: string;
  ceilings: Ceilings;
  allowed_models: string[];
  max_items_per_run_limit: number;
  projection: string;
  total: BudgetBlock & { budget_reached: boolean; changed_by: string | null; changed_at: string | null };
  sources: SourceBudget[];
  credentials: Credential[];
  changes: SettingChange[];
};

export type SettingsUpdate = {
  llm_enabled?: boolean;
  llm_model?: string | null;
  llm_max_usd_per_run?: number;
  llm_max_usd_per_month?: number;
  max_items_per_run?: number;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

export const getBudget = (token: string): Promise<ApiResult<BudgetOverview>> => apiRequest(`${BASE}/budget`, { admin_portal_token: token });

export const putBudget = (token: string, cap: number, confirmRaise: boolean): Promise<ApiResult<{ cap: Cap; ceilings: Ceilings }>> =>
  apiRequest(
    `${BASE}/budget`,
    { admin_portal_token: token },
    { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ llm_max_usd_per_month_total: cap, confirm_raise: confirmRaise }) }
  );

export const getSettings = (token: string, key: string): Promise<ApiResult<SettingsResponse>> =>
  apiRequest(`${BASE}/sources/${encodeURIComponent(key)}/settings`, { admin_portal_token: token });

export const putSettings = (token: string, key: string, update: SettingsUpdate, confirmRaise: boolean): Promise<ApiResult<SettingsResponse>> =>
  apiRequest(
    `${BASE}/sources/${encodeURIComponent(key)}/settings`,
    { admin_portal_token: token },
    { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ ...update, confirm_raise: confirmRaise }) }
  );

/** True when the API refused a change because a cap went up without a confirmation (nothing was saved). */
export function isRaiseNotConfirmed(res: ApiResult<unknown>): boolean {
  if (res.ok || res.status !== 409 || !res.detail || typeof res.detail !== "object") return false;
  return (res.detail as { code?: unknown }).code === "cap_raise_not_confirmed";
}

/** Money for budgets: always shown, two decimals (four below one cent so small runs do not read as $0.00). */
export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  return n > 0 && n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

/** 3,700,000 -> "3.7M", 41,200 -> "41.2K" (token counts in narrow table cells; the exact value goes in a title). */
export function compactNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

/** "2026-11" -> "Nov 2026". */
export function formatMonth(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return month;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/** Share of the cap used, 0..100. A zero cap counts as fully used. */
export function usedPercent(spent: number, cap: number): number {
  if (!(cap > 0)) return 100;
  return Math.max(0, Math.min(100, (spent / cap) * 100));
}

export const SETTING_LABEL: Record<string, string> = {
  llm_enabled: "LLM clean-up",
  llm_model: "Model",
  llm_max_usd_per_run: "Cap per run",
  llm_max_usd_per_month: "Cap per month",
  llm_max_usd_per_month_total: "Monthly cap, all bots",
  max_items_per_run: "Max items per run",
};

const settingValue = (field: string, v: unknown): string => {
  if (v === null || v === undefined) return field === "llm_model" ? "connector default" : "—";
  if (typeof v === "boolean") return v ? "on" : "off";
  if (typeof v === "number" && field.includes("usd")) return formatMoney(v);
  return String(v);
};

/** One audit entry as a sentence: "Cap per month $5.00 → $3.00; Model connector default → gpt-6-luna". */
export function describeChange(c: SettingChange): string {
  if (c.action === "connector.enable") return "Source enabled";
  if (c.action === "connector.disable") return "Source disabled";
  const changes = c.details?.changes ?? {};
  const parts = Object.entries(changes).map(([f, v]) => `${SETTING_LABEL[f] ?? f} ${settingValue(f, v.old)} → ${settingValue(f, v.new)}`);
  return parts.join("; ") || c.action;
}

// -- settings form: validation, clamping, raise detection (pure, shared by both pages) --

export type SettingsForm = { llmEnabled: boolean; model: string; perRun: string; perMonth: string; maxItems: string };

export const toForm = (s: SourceSettings): SettingsForm => ({
  llmEnabled: s.llm_enabled,
  model: s.llm_model ?? "",
  perRun: s.llm_max_usd_per_run.requested.toFixed(2),
  perMonth: s.llm_max_usd_per_month.requested.toFixed(2),
  maxItems: String(s.max_items_per_run),
});

export const MAX_CAP_INPUT_USD = 1000;

/** A dollar amount typed by the admin: a number or an error message. */
export function parseUsd(text: string): { value: number } | { error: string } {
  const t = text.trim();
  if (t === "") return { error: "Enter an amount in USD." };
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return { error: "Use a plain amount with at most two decimals, for example 2.50." };
  const value = Number(t);
  if (value > MAX_CAP_INPUT_USD) return { error: `At most $${MAX_CAP_INPUT_USD}.` };
  return { value };
}

export function parseItems(text: string, limit: number): { value: number } | { error: string } {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return { error: "Enter a whole number." };
  const value = Number(t);
  if (value > limit) return { error: `At most ${limit} items per run.` };
  return { value };
}

/** Why a typed cap will not apply as typed, or null. */
export function clampMessage(text: string, ceiling: number): string | null {
  const p = parseUsd(text);
  if ("error" in p || p.value <= ceiling) return null;
  return `Above the server ceiling: ${formatMoney(ceiling)} will apply, not ${formatMoney(p.value)}. The ceiling is set in the API environment and cannot be changed here.`;
}

export type FormCheck = {
  errors: Partial<Record<keyof SettingsForm, string>>;
  update: SettingsUpdate; // only the fields that differ from the saved settings
  raised: string[]; // labels of caps that go up (needs a confirmation)
};

export function checkForm(form: SettingsForm, saved: SourceSettings, allowedModels: string[], itemsLimit: number): FormCheck {
  const errors: FormCheck["errors"] = {};
  const update: SettingsUpdate = {};
  const raised: string[] = [];

  if (form.llmEnabled !== saved.llm_enabled) update.llm_enabled = form.llmEnabled;

  const model = form.model === "" ? null : form.model;
  if (model !== null && !allowedModels.includes(model)) errors.model = "Pick a model from the list.";
  else if (model !== saved.llm_model) update.llm_model = model;

  const perRun = parseUsd(form.perRun);
  if ("error" in perRun) errors.perRun = perRun.error;
  else if (perRun.value !== saved.llm_max_usd_per_run.requested) {
    update.llm_max_usd_per_run = perRun.value;
    if (perRun.value > saved.llm_max_usd_per_run.requested) raised.push(`cap per run to ${formatMoney(perRun.value)}`);
  }

  const perMonth = parseUsd(form.perMonth);
  if ("error" in perMonth) errors.perMonth = perMonth.error;
  else if (perMonth.value !== saved.llm_max_usd_per_month.requested) {
    update.llm_max_usd_per_month = perMonth.value;
    if (perMonth.value > saved.llm_max_usd_per_month.requested) raised.push(`cap per month to ${formatMoney(perMonth.value)}`);
  }

  const items = parseItems(form.maxItems, itemsLimit);
  if ("error" in items) errors.maxItems = items.error;
  else if (items.value !== saved.max_items_per_run) {
    update.max_items_per_run = items.value;
    if (items.value > saved.max_items_per_run) raised.push(`max items per run to ${items.value}`);
  }

  return { errors, update, raised };
}

// -- states shown to the admin --

export type BotState = { key: string; label: string; tone: "ok" | "warn" | "bad" | "muted"; detail: string };

/**
 * The states of one source, most important first: disabled, never ran, last run failed,
 * LLM off, budget reached. `budget`/`totalReached` are absent when the API has no budget endpoints.
 */
export function botStates(source: DataSource, budget?: SourceBudget | null, totalReached?: boolean): BotState[] {
  const out: BotState[] = [];
  const run = source.last_run;
  if (!source.enabled)
    out.push({ key: "disabled", label: "Source disabled", tone: "muted", detail: "Scheduled runs start and stop immediately; nothing is fetched." });
  if (!run) out.push({ key: "never", label: "Never ran", tone: "muted", detail: "No run has reported in yet." });
  else if (run.status === "failed")
    out.push({
      key: "failed",
      label: "Last run failed",
      tone: "bad",
      detail: `${formatDateTime(run.started_at)}: ${run.error ? run.error.slice(0, 300) : "no error message was reported"}`,
    });
  if (budget) {
    if (budget.llm_state === "off")
      out.push({ key: "llm_off", label: "LLM off", tone: "muted", detail: "LLM clean-up is switched off for this source. Runs use the deterministic parser." });
    else if (budget.llm_state === "budget_reached") {
      const own = budget.remaining_usd <= 0;
      out.push({
        key: "budget",
        label: "Budget reached",
        tone: "warn",
        detail: own
          ? `This source used its ${formatMoney(budget.cap.effective)} for ${formatMonth(budget.history[0]?.month ?? "")}. Runs continue without the LLM until next month.`
          : `The monthly cap across all bots is used up${totalReached ? "" : " (or nearly)"}. Runs continue without the LLM until next month.`,
      });
    }
  }
  return out;
}

/** Why a run did or did not use the LLM, from what the server decided at its start and what it reported. */
export function runLlmNote(r: ConnectorRun): string {
  if ((r.llm_calls ?? 0) > 0) return "";
  if (r.status === "skipped_disabled") return "";
  if (r.llm_state === "off") return "LLM off";
  if (r.llm_state === "budget_reached") return "Budget reached";
  if (r.llm_state === "on") return "Allowed, not used";
  return "";
}

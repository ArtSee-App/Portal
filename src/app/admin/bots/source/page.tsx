"use client";

import React, { Suspense, useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/header/header";
import styles from "../../admin.module.css";
import { useUser } from "@/context/UserContext";
import { useAlert } from "@/context/AlertContext";
import { AdminGate, ErrorState, LicenceBadge, LoadingState, Stat, StatusPill, Toggle } from "@/components/admin/AdminKit";
import { BudgetFigures, ChangeLog, HistoryTable, StateList } from "@/components/admin/BotBudget";
import {
  botStates,
  BudgetOverview,
  checkForm,
  clampMessage,
  compactNumber,
  confirmToggle,
  ConnectorRun,
  DataSource,
  describeCron,
  formatDateTime,
  formatDuration,
  formatMoney,
  formatUsd,
  getBudget,
  getSettings,
  getSource,
  isRaiseNotConfirmed,
  putSettings,
  runLlmNote,
  SettingsForm,
  SettingsResponse,
  toForm,
  isRisky,
  ITEM_STATUS_LABEL,
  listItems,
  listRuns,
  runNow,
  RUN_STATUS_LABEL,
  safeExternalUrl,
  setSourceEnabled,
  SourceItem,
} from "@/lib/bots";
import type { ApiErrorKind } from "@/lib/api";

type Load<T> = { phase: "loading" } | { phase: "error"; kind: ApiErrorKind; message: string } | { phase: "ready"; data: T };

const ITEM_FILTERS: { key: string | null; label: string; metadataOnly?: boolean; submitting?: boolean }[] = [
  { key: null, label: "All" },
  { key: "submitted", label: "Pending review", submitting: true },
  { key: "metadata_only", label: "Candidates", metadataOnly: true },
  { key: "artist_unresolved", label: "Artist not found", submitting: true },
  { key: "duplicate_suspect", label: "Possible duplicates", submitting: true },
  { key: "rejected", label: "Rejected", submitting: true },
  { key: "error", label: "Errors" },
];

function payloadText(item: SourceItem, key: string): string {
  const v = item.payload?.[key];
  return v === undefined || v === null ? "" : String(v);
}

function RunsTable({ runs, metadataOnly }: { runs: ConnectorRun[]; metadataOnly: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  if (runs.length === 0) {
    return <p className={styles.muted}>No runs yet. The first scheduled run will appear here, or use Run now.</p>;
  }
  return (
    <div className={styles.tableWrap}>
      <table className={`${styles.table} ${styles.tableCompact}`}>
        <thead>
          <tr>
            <th>Started</th>
            <th>Status · duration</th>
            <th className={styles.num}>Fetched</th>
            <th className={styles.num} title="Skipped because the rights or the scope rule excluded the object">Skipped: rights</th>
            <th className={styles.num} title="Skipped because the object was already seen or is already in the catalogue">Skipped: duplicate</th>
            <th className={styles.num} title="Objects that failed with an error">Skipped: error</th>
            <th className={styles.num}>{metadataOnly ? "Candidates" : "Submitted"}</th>
            <th className={styles.num}>LLM calls</th>
            <th className={styles.num}>Tokens in / out</th>
            <th className={styles.num} title="LLM clean-up cost of this run">LLM cost</th>
            <th className={styles.num} title="Records the LLM cleaned / records that fell back to the deterministic parser">Cleaned / fell back</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const produced = metadataOnly ? r.metadata_only : r.mode === "dry_run" ? r.would_submit : r.submitted;
            const llmNote = runLlmNote(r);
            const hasDetails = Boolean(r.error) || (r.error_samples?.length ?? 0) > 0 || r.mode === "submit" || r.mode === "dry_run";
            return (
              <React.Fragment key={r.run_id}>
                <tr className={hasDetails ? styles.clickable : undefined} onClick={() => setOpen(open === r.run_id ? null : r.run_id)}>
                  <td>
                    {formatDateTime(r.started_at)}
                    <div className={styles.muted}>
                      {r.trigger ?? "manual"} · {r.mode === "dry_run" ? "dry run" : "submit"}
                    </div>
                  </td>
                  <td>
                    <StatusPill status={r.status} label={RUN_STATUS_LABEL[r.status] ?? r.status} />
                    <div className={styles.muted}>{formatDuration(r.started_at, r.finished_at)}</div>
                    {r.status === "failed" && r.error && <div className={styles.errorText}>{r.error.slice(0, 140)}</div>}
                  </td>
                  <td className={styles.num}>{r.seen}</td>
                  <td className={styles.num}>{(r.skipped_rights ?? 0) + (r.skipped_scope ?? 0)}</td>
                  <td className={styles.num}>{(r.unchanged ?? 0) + (r.matched ?? 0)}</td>
                  <td className={styles.num}>{r.errors}</td>
                  <td className={styles.num}>
                    {produced}
                    {r.mode === "dry_run" && !metadataOnly ? " (would)" : ""}
                  </td>
                  <td className={styles.num}>{(r.llm_calls ?? 0) > 0 ? r.llm_calls : llmNote || "—"}</td>
                  <td
                    className={styles.num}
                    style={{ whiteSpace: "nowrap" }}
                    title={`${(r.llm_input_tokens ?? 0).toLocaleString("en-US")} in / ${(r.llm_output_tokens ?? 0).toLocaleString("en-US")} out`}
                  >
                    {(r.llm_calls ?? 0) > 0 ? `${compactNumber(r.llm_input_tokens ?? 0)} / ${compactNumber(r.llm_output_tokens ?? 0)}` : "—"}
                  </td>
                  <td className={styles.num}>{formatUsd(r.llm_cost_usd, r.llm_calls)}</td>
                  <td className={styles.num}>{(r.llm_calls ?? 0) > 0 || (r.llm_fallbacks ?? 0) > 0 ? `${r.llm_cleaned ?? 0} / ${r.llm_fallbacks ?? 0}` : "—"}</td>
                  <td>
                    {r.github_run_url && (
                      <a href={safeExternalUrl(r.github_run_url)} target="_blank" rel="noopener noreferrer" className={styles.link} onClick={(e) => e.stopPropagation()}>
                        Logs ↗
                      </a>
                    )}
                  </td>
                </tr>
                {open === r.run_id && (
                  <tr className={styles.runDetails}>
                    <td colSpan={12}>
                      <div className={styles.muted}>
                        Skipped, rights {r.skipped_rights ?? 0} · skipped, scope {r.skipped_scope ?? 0} · unchanged since last run {r.unchanged ?? 0} · already in
                        catalogue {r.matched ?? 0} · possible duplicates (submitted with a flag) {r.duplicate_suspect ?? 0} · artist not found {r.artist_unresolved ?? 0} ·
                        HTTP requests {r.http_requests ?? 0} (429: {r.http_429 ?? 0})
                        {llmNote === "LLM off" && " · LLM: switched off for this source when the run started; deterministic parser used"}
                        {llmNote === "Budget reached" && " · LLM: monthly budget was used up when the run started; deterministic parser used"}
                        {llmNote === "Allowed, not used" &&
                          " · LLM: allowed by the server but no call was reported (off or no key in the bot's GitHub environment, or nothing needed cleaning)"}
                      </div>
                      {r.error && <div className={styles.errorText} style={{ marginTop: 6 }}>Run error: {r.error}</div>}
                      {(r.error_samples?.length ?? 0) > 0 && (
                        <ul className={styles.errorList}>
                          {r.error_samples!.map((e, i) => (
                            <li key={i}>
                              <code>{e.source_object_id}</code>
                              <span className={styles.errorText}>{e.error}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ItemsTable({ items }: { items: SourceItem[] }) {
  if (items.length === 0) return <p className={styles.muted}>Nothing here yet.</p>;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Object</th>
            <th>Artist</th>
            <th>Year</th>
            <th>Style</th>
            <th>Status</th>
            <th>Rights</th>
            <th>Updated</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const title = payloadText(it, "title") || it.source_object_id;
            const birth = payloadText(it, "artist_birth_year");
            const death = payloadText(it, "artist_death_year");
            const cleaned = it.payload?.cleaned_by_model === true;
            const review = it.payload?.needs_review === true;
            const flags = Array.isArray(it.payload?.review_flags) ? (it.payload?.review_flags as string[]).join(" · ") : "";
            const note = it.last_error || payloadText(it, "reason") || (it.matched_artwork_id ? `Matches artwork #${it.matched_artwork_id}` : "") || (it.pending_id ? `Pending #${it.pending_id}` : "");
            return (
              <tr key={it.source_object_id}>
                <td>
                  <a href={safeExternalUrl(it.source_url)} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    {title} ↗
                  </a>
                  {cleaned && (
                    <span className={`${styles.badge} ${styles.badgeNeutral}`} title={payloadText(it, "raw_title") ? `Source title: ${payloadText(it, "raw_title")}` : "Cleaned by LLM"}>
                      LLM
                    </span>
                  )}
                  {review && (
                    <span className={`${styles.badge} ${styles.badgeNeutral}`} title={flags || undefined}>
                      Needs review
                    </span>
                  )}
                </td>
                <td>
                  {payloadText(it, "artist_name") || "—"}
                  {(birth || death) && <span className={styles.muted}> ({birth || "?"}–{death || "?"})</span>}
                </td>
                <td>{payloadText(it, "year") || "—"}</td>
                <td>{payloadText(it, "style") || "—"}</td>
                <td>
                  <StatusPill status={it.status} label={ITEM_STATUS_LABEL[it.status] ?? it.status} />
                </td>
                <td>{it.rights}</td>
                <td>{formatDateTime(it.updated_at)}</td>
                <td className={it.last_error ? styles.errorText : styles.muted}>{note || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SettingsPanel({
  data,
  displayName,
  onSaved,
}: {
  data: SettingsResponse;
  displayName: string;
  onSaved: (next: SettingsResponse) => void;
}) {
  const id = useId();
  const { getIdToken } = useUser();
  const { showAlert, showConfirm } = useAlert();
  const saved = data.settings;
  const [form, setForm] = useState<SettingsForm>(() => toForm(saved));
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = <K extends keyof SettingsForm>(k: K, v: SettingsForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setServerError(null);
  };
  const check = checkForm(form, saved, data.allowed_models, data.max_items_per_run_limit);
  const hasErrors = Object.keys(check.errors).length > 0;
  const dirty = Object.keys(check.update).length > 0;
  const clampRun = clampMessage(form.perRun, data.ceilings.llm_max_usd_per_run);
  const clampMonth = clampMessage(form.perMonth, data.ceilings.llm_max_usd_per_month);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors || !dirty) return;
    const raising = check.raised.length > 0;
    if (raising) {
      const clamped = [clampRun, clampMonth].filter(Boolean).length > 0 ? " Values above the server ceiling are saved but the ceiling applies." : "";
      if (!(await showConfirm(`Raise ${check.raised.join(" and ")} for ${displayName}?${clamped}`))) return;
    }
    setBusy(true);
    const token = await getIdToken();
    const res = token ? await putSettings(token, saved.source_key, check.update, raising) : null;
    setBusy(false);
    if (!res) return setServerError("No session.");
    if (!res.ok) {
      return setServerError(
        isRaiseNotConfirmed(res) ? "Nothing was saved: the settings were changed meanwhile and this would raise a cap. Reload the page and try again." : res.message
      );
    }
    onSaved(res.data);
    setForm(toForm(res.data.settings));
    showAlert("Settings saved. They apply from the next run.", "success");
  };

  const money = (name: "perRun" | "perMonth", label: string, ceiling: number, clamp: string | null, effective: number) => (
    <div className={styles.formField}>
      <label htmlFor={`${id}-${name}`} className={styles.field}>
        {label}
      </label>
      <input
        id={`${id}-${name}`}
        className={styles.control}
        inputMode="decimal"
        autoComplete="off"
        value={form[name]}
        maxLength={8}
        onChange={(e) => set(name, e.target.value)}
        aria-invalid={Boolean(check.errors[name])}
        aria-describedby={`${id}-${name}-hint`}
      />
      <span id={`${id}-${name}-hint`} className={check.errors[name] ? styles.errorText : clamp ? styles.fieldWarn : styles.muted}>
        {check.errors[name] ?? clamp ?? `In effect now: ${formatMoney(effective)}. Server ceiling: ${formatMoney(ceiling)} (read-only).`}
      </span>
    </div>
  );

  return (
    <form onSubmit={save} noValidate>
      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <span className={styles.field}>LLM clean-up</span>
          <Toggle checked={form.llmEnabled} disabled={busy} label={`LLM clean-up for ${displayName}`} onChange={(next) => set("llmEnabled", next)} />
          <span className={styles.muted}>Off: runs use the deterministic parser only and cost nothing.</span>
        </div>
        <div className={styles.formField}>
          <label htmlFor={`${id}-model`} className={styles.field}>
            Model
          </label>
          <select id={`${id}-model`} className={styles.control} value={form.model} onChange={(e) => set("model", e.target.value)} aria-invalid={Boolean(check.errors.model)}>
            <option value="">Connector default</option>
            {data.allowed_models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <span className={check.errors.model ? styles.errorText : styles.muted}>{check.errors.model ?? "Only models on the server's allow-list can be picked."}</span>
        </div>
        {money("perRun", "Cap per run (USD)", data.ceilings.llm_max_usd_per_run, clampRun, saved.llm_max_usd_per_run.effective)}
        {money("perMonth", "Cap per month (USD)", data.ceilings.llm_max_usd_per_month, clampMonth, saved.llm_max_usd_per_month.effective)}
        <div className={styles.formField}>
          <label htmlFor={`${id}-items`} className={styles.field}>
            Max items per run
          </label>
          <input
            id={`${id}-items`}
            className={styles.control}
            inputMode="numeric"
            autoComplete="off"
            value={form.maxItems}
            maxLength={4}
            onChange={(e) => set("maxItems", e.target.value)}
            aria-invalid={Boolean(check.errors.maxItems)}
            aria-describedby={`${id}-items-hint`}
          />
          <span id={`${id}-items-hint`} className={check.errors.maxItems ? styles.errorText : styles.muted}>
            {check.errors.maxItems ?? `Submissions (or candidates) one run may create. At most ${data.max_items_per_run_limit}.`}
          </span>
        </div>
        <div className={styles.formField}>
          <span className={styles.field}>Source and schedule</span>
          <div className={styles.readOnly}>
            {saved.enabled ? "Enabled" : "Disabled"} (switch at the top of this page) · {describeCron(saved.schedule_cron)}
            <br />
            The schedule is defined in the bot&apos;s GitHub workflow and is shown here for reference.
          </div>
        </div>
      </div>
      {serverError && (
        <p className={styles.errorText} role="alert" style={{ marginTop: 12 }}>
          {serverError}
        </p>
      )}
      <div className={styles.formActions}>
        <button type="submit" className={styles.buttonPrimary} disabled={busy || hasErrors || !dirty}>
          {busy ? "Saving…" : "Save settings"}
        </button>
        <button type="button" className={styles.button} disabled={busy || !dirty} onClick={() => setForm(toForm(saved))}>
          Reset
        </button>
        <span className={styles.muted}>
          {saved.settings_changed_at
            ? `Last changed ${formatDateTime(saved.settings_changed_at)}${saved.settings_changed_by ? ` by ${saved.settings_changed_by}` : ""}.`
            : "Never changed."}{" "}
          The bot can only spend less than this, never more: its own GitHub environment keeps separate caps and an on/off switch.
        </span>
      </div>
    </form>
  );
}

function SourceDetail({ sourceKey }: { sourceKey: string }) {
  const { getIdToken } = useUser();
  const { showAlert, showConfirm } = useAlert();
  const [source, setSource] = useState<Load<{ source: DataSource; runNowConfigured: boolean }>>({ phase: "loading" });
  const [runs, setRuns] = useState<Load<ConnectorRun[]>>({ phase: "loading" });
  const [items, setItems] = useState<Load<SourceItem[]>>({ phase: "loading" });
  const [filter, setFilter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Newer endpoints: the page works without them (older API), so their errors are not fatal.
  const [budget, setBudget] = useState<Load<BudgetOverview>>({ phase: "loading" });
  const [settings, setSettings] = useState<Load<SettingsResponse>>({ phase: "loading" });

  const loadBudget = useCallback(
    async (token: string) => {
      const b = await getBudget(token);
      setBudget(b.ok ? { phase: "ready", data: b.data } : { phase: "error", kind: b.kind, message: b.message });
    },
    []
  );

  const loadSource = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return setSource({ phase: "error", kind: "forbidden", message: "No session token." });
    const [s, r, st] = await Promise.all([getSource(token, sourceKey), listRuns(token, sourceKey, 25), getSettings(token, sourceKey), loadBudget(token)]);
    setSettings(st.ok ? { phase: "ready", data: st.data } : { phase: "error", kind: st.kind, message: st.message });
    setSource(s.ok ? { phase: "ready", data: { source: s.data.source, runNowConfigured: s.data.run_now_configured } } : { phase: "error", kind: s.kind, message: s.message });
    setRuns(r.ok ? { phase: "ready", data: r.data.runs ?? [] } : { phase: "error", kind: r.kind, message: r.message });
  }, [getIdToken, sourceKey, loadBudget]);

  const loadItems = useCallback(async () => {
    setItems({ phase: "loading" });
    const token = await getIdToken();
    if (!token) return setItems({ phase: "error", kind: "forbidden", message: "No session token." });
    const res = await listItems(token, sourceKey, filter, 100, 0);
    setItems(res.ok ? { phase: "ready", data: res.data.items ?? [] } : { phase: "error", kind: res.kind, message: res.message });
  }, [getIdToken, sourceKey, filter]);

  useEffect(() => {
    loadSource();
  }, [loadSource]);
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  if (source.phase === "loading") return <LoadingState />;
  if (source.phase === "error") return <ErrorState kind={source.kind} message={source.message} onRetry={loadSource} />;
  const { source: s, runNowConfigured } = source.data;
  const c = s.counts;
  const overview = budget.phase === "ready" ? budget.data : null;
  const sourceBudget = overview?.sources.find((b) => b.source_key === s.source_key) ?? null;
  const states = botStates(s, sourceBudget, overview?.total.budget_reached);

  const settingsSaved = async (next: SettingsResponse) => {
    setSettings({ phase: "ready", data: next });
    const token = await getIdToken();
    if (token) {
      const fresh = await getSource(token, sourceKey); // max items is shown in the header too
      if (fresh.ok) setSource({ phase: "ready", data: { source: fresh.data.source, runNowConfigured: fresh.data.run_now_configured } });
      await loadBudget(token);
    }
  };

  const toggle = async (next: boolean) => {
    if (!(await confirmToggle(s, next, showConfirm))) return;
    setBusy(true);
    const token = await getIdToken();
    const res = token ? await setSourceEnabled(token, s.source_key, next) : null;
    setBusy(false);
    if (!res || !res.ok) {
      showAlert(`Could not update ${s.display_name}: ${res && !res.ok ? res.message : "no session"}`, "error");
      return;
    }
    setSource({ phase: "ready", data: { source: res.data.source ?? { ...s, enabled: next }, runNowConfigured } });
    setSettings((prev) => (prev.phase === "ready" ? { phase: "ready", data: { ...prev.data, settings: { ...prev.data.settings, enabled: next } } } : prev));
  };

  const trigger = async (mode: "dry_run" | "submit") => {
    const what = mode === "dry_run" ? "a dry run (report only, nothing is written)" : s.metadata_only ? "a run that records candidates" : "a run that creates pending submissions";
    if (!(await showConfirm(`Start ${what} for ${s.display_name} now on GitHub Actions?`))) return;
    setBusy(true);
    const token = await getIdToken();
    const res = token ? await runNow(token, s.source_key, mode) : null;
    setBusy(false);
    if (!res || !res.ok) {
      showAlert(res && !res.ok ? res.message : "No session.", "error");
      return;
    }
    showAlert("Run started on GitHub Actions. It appears in the history below once the connector reports in (usually within a minute). Refresh to see it.", "success");
  };

  const runDisabledReason = !runNowConfigured
    ? "Run now is not configured on the API server."
    : !s.enabled
      ? "Enable the source first."
      : null;
  const filters = ITEM_FILTERS.filter((f) => (s.metadata_only ? !f.submitting : !f.metadataOnly));

  return (
    <>
      <div>
        <Link href="/admin/bots" className={styles.backLink}>
          ← All bots
        </Link>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>
              <span className={styles.sourceName} style={{ fontSize: "1.6rem" }}>
                {s.display_name}
                <LicenceBadge summary={s.license_summary} risky={isRisky(s)} />
                {s.metadata_only && <span className={`${styles.badge} ${styles.badgeNeutral}`}>Metadata only</span>}
              </span>
            </h1>
            <div className={styles.sourceMeta}>
              <span>
                <strong>Schedule:</strong> {describeCron(s.schedule_cron)}
              </span>
              <span>
                <strong>Max items:</strong> {s.max_submissions_per_run} per run
              </span>
              <span>
                <strong>API:</strong> {s.base_url}
              </span>
              {s.enabled_changed_at && (
                <span>
                  <strong>{s.enabled ? "Enabled" : "Disabled"}:</strong> {formatDateTime(s.enabled_changed_at)}
                  {s.enabled_changed_by ? ` by ${s.enabled_changed_by}` : ""}
                </span>
              )}
            </div>
          </div>
          <div className={styles.sourceActions}>
            <Toggle checked={s.enabled} disabled={busy} label={`Enable ${s.display_name}`} onChange={toggle} />
            <button type="button" className={styles.button} disabled={busy || Boolean(runDisabledReason)} title={runDisabledReason ?? undefined} onClick={() => trigger("dry_run")}>
              Dry run
            </button>
            <button type="button" className={styles.buttonPrimary} disabled={busy || Boolean(runDisabledReason)} title={runDisabledReason ?? undefined} onClick={() => trigger("submit")}>
              Run now
            </button>
          </div>
        </div>
      </div>

      {s.license_warning && (
        <div className={`${styles.notice} ${styles.noticeWarning}`}>
          <div className={styles.noticeTitle}>Licence note</div>
          {s.license_warning}
        </div>
      )}
      {runDisabledReason && (
        <div className={`${styles.notice} ${styles.noticeInfo}`}>
          <div className={styles.noticeTitle}>Run now unavailable</div>
          {runDisabledReason} Scheduled runs still happen on GitHub Actions{s.enabled ? "" : " but exit immediately while the source is disabled"}.
        </div>
      )}

      {states.length > 0 && (
        <section className={styles.panel}>
          <StateList states={states} />
        </section>
      )}

      <section className={styles.panel}>
        {!s.metadata_only && c.pending > 0 && (
          <p style={{ marginBottom: 12 }}>
            <Link href="/home" className={styles.link}>
              {c.pending} pending review → open the review queue
            </Link>
          </p>
        )}
        <div className={styles.stats}>
          <Stat value={c.new_7d} label="New (7 days)" />
          {s.metadata_only ? (
            <Stat value={c.candidates} label="Candidates" />
          ) : (
            <>
              <Stat value={c.pending} label="Pending review" />
              <Stat value={c.accepted} label="Accepted" />
              <Stat value={c.rejected} label="Rejected" />
            </>
          )}
          <Stat value={c.artist_unresolved} label="Artist not found" />
          <Stat value={c.matched} label="Already in catalogue" />
          <Stat value={c.skipped} label="Skipped" />
          <Stat value={c.errors} label="Errors" alert={c.errors > 0} />
          <Stat value={c.total} label="Seen in total" />
        </div>
      </section>

      {(budget.phase === "error" || settings.phase === "error") && (
        <div className={`${styles.notice} ${styles.noticeInfo}`}>
          <div className={styles.noticeTitle}>Budget and settings unavailable</div>
          {(budget.phase === "error" ? budget.kind : settings.phase === "error" ? settings.kind : "server") === "not_deployed"
            ? "The API on this environment does not have the budget endpoints yet. Deploy the API branch and run the 2026_11_16_connector_budget migration; until then this bot uses the caps from its own environment."
            : `Could not load: ${budget.phase === "error" ? budget.message : settings.phase === "error" ? settings.message : ""}`}
        </div>
      )}

      {overview && sourceBudget && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>LLM budget</h2>
            <span className={styles.muted}>Calendar month, UTC · as of {formatDateTime(overview.as_of)}</span>
          </div>
          <div className={styles.budgetSplit}>
            <div>
              <h3 className={styles.subTitle} style={{ marginTop: 0 }}>
                {s.display_name}
              </h3>
              <BudgetFigures block={sourceBudget} month={overview.month} what="this source" />
            </div>
            <div>
              <h3 className={styles.subTitle} style={{ marginTop: 0 }}>
                All bots together
              </h3>
              <BudgetFigures block={overview.total} month={overview.month} what="all bots" />
            </div>
          </div>
          <h3 className={styles.subTitle}>Last 6 months · {s.display_name}</h3>
          <HistoryTable history={sourceBudget.history} />
        </section>
      )}

      {settings.phase === "ready" && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Settings</h2>
          </div>
          <SettingsPanel data={settings.data} displayName={s.display_name} onSaved={settingsSaved} />
          <h3 className={styles.subTitle}>Changes</h3>
          <ChangeLog changes={settings.data.changes} />
        </section>
      )}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Run history</h2>
          <button type="button" className={styles.button} onClick={loadSource}>
            Refresh
          </button>
        </div>
        {runs.phase === "loading" && <LoadingState />}
        {runs.phase === "error" && <ErrorState kind={runs.kind} message={runs.message} />}
        {runs.phase === "ready" && <RunsTable runs={runs.data} metadataOnly={s.metadata_only} />}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Objects</h2>
          <div className={styles.chips}>
            {filters.map((f) => (
              <button key={f.label} type="button" className={`${styles.chip} ${filter === f.key ? styles.chipActive : ""}`} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {s.metadata_only && (
          <p className={styles.muted} style={{ marginBottom: 12 }}>
            Candidates carry facts only (title, artist, year, style). To publish one, find a licensed image (for example from the museum that holds it) and add it through the normal
            artwork form.
          </p>
        )}
        {filter === "artist_unresolved" && (
          <p className={styles.muted} style={{ marginBottom: 12 }}>
            Bots don't create artists. Add the artist through the normal artist flow; the next weekly run will match it and submit these artworks.
          </p>
        )}
        {items.phase === "loading" && <LoadingState />}
        {items.phase === "error" && <ErrorState kind={items.kind} message={items.message} onRetry={loadItems} />}
        {items.phase === "ready" && <ItemsTable items={items.data} />}
      </section>
    </>
  );
}

function SourceDetailFromQuery() {
  const key = useSearchParams().get("key");
  if (!key) {
    return (
      <div className={styles.state}>
        <div className={styles.stateTitle}>No source selected</div>
        <p>
          <Link href="/admin/bots" className={styles.link}>
            Back to all bots
          </Link>
        </p>
      </div>
    );
  }
  return <SourceDetail sourceKey={key} />;
}

export default function BotSourcePage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <AdminGate>
          <Suspense fallback={<LoadingState />}>
            <SourceDetailFromQuery />
          </Suspense>
        </AdminGate>
      </main>
    </>
  );
}

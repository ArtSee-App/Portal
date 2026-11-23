"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/header/header";
import styles from "../admin.module.css";
import { useUser } from "@/context/UserContext";
import { useAlert } from "@/context/AlertContext";
import { AdminGate, ErrorState, LicenceBadge, LoadingState, Stat, StatusPill, Toggle } from "@/components/admin/AdminKit";
import { BudgetBar, BudgetFigures, ChangeLog, CredentialsPanel, GlobalCapEditor, HistoryTable, StateBadges } from "@/components/admin/BotBudget";
import {
  botStates,
  BudgetOverview,
  confirmToggle,
  DataSource,
  describeCron,
  formatDateTime,
  formatMoney,
  formatMonth,
  getBudget,
  isRaiseNotConfirmed,
  isRisky,
  listSources,
  putBudget,
  RUN_STATUS_LABEL,
  setSourceEnabled,
  SourceBudget,
} from "@/lib/bots";
import type { ApiErrorKind } from "@/lib/api";

// The budget endpoints are newer than the rest of the Bots API: the page still works without them.
type BudgetState = { phase: "loading" } | { phase: "unavailable"; kind: ApiErrorKind; message: string } | { phase: "ready"; data: BudgetOverview };

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; kind: ApiErrorKind; message: string }
  | { phase: "ready"; sources: DataSource[]; runNowConfigured: boolean };

function SourceCard({
  source,
  budget,
  totalReached,
  month,
  onToggle,
  busy,
}: {
  source: DataSource;
  budget: SourceBudget | null;
  totalReached: boolean;
  month: string | null;
  onToggle: (s: DataSource, next: boolean) => void;
  busy: boolean;
}) {
  const c = source.counts;
  const run = source.last_run;
  const states = botStates(source, budget, totalReached);
  const failed = states.find((x) => x.key === "failed");
  return (
    <article className={`${styles.sourceCard} ${source.enabled ? styles.sourceCardEnabled : ""}`}>
      <div className={styles.sourceTop}>
        <div>
          <div className={styles.sourceName}>
            {source.display_name}
            <LicenceBadge summary={source.license_summary} risky={isRisky(source)} />
            {source.metadata_only && <span className={`${styles.badge} ${styles.badgeNeutral}`}>Metadata only</span>}
            <StateBadges states={states} />
          </div>
          <div className={styles.sourceMeta}>
            <span>
              <strong>Schedule:</strong> {describeCron(source.schedule_cron)}
            </span>
            <span>
              <strong>Max items:</strong> {source.max_submissions_per_run} per run
            </span>
            <span>
              <strong>Last run:</strong>{" "}
              {run ? (
                <>
                  <StatusPill status={run.status} label={RUN_STATUS_LABEL[run.status] ?? run.status} /> {formatDateTime(run.started_at)}
                  {run.status !== "skipped_disabled" && ` · ${run.seen} seen`}
                </>
              ) : (
                "never"
              )}
            </span>
          </div>
        </div>
        <div className={styles.sourceActions}>
          <Toggle checked={source.enabled} disabled={busy} label={`Enable ${source.display_name}`} onChange={(next) => onToggle(source, next)} />
          <Link href={`/admin/bots/source?key=${encodeURIComponent(source.source_key)}`} className={styles.buttonGhost}>
            Details →
          </Link>
        </div>
      </div>

      {source.license_warning && (
        <div className={`${styles.notice} ${styles.noticeWarning}`}>
          <div className={styles.noticeTitle}>Licence note</div>
          {source.license_warning}
        </div>
      )}
      {failed && (
        <div className={styles.errorText}>
          <strong>Last run failed.</strong> {failed.detail}
        </div>
      )}

      {budget && month && (
        <div>
          <div className={styles.sourceMeta} style={{ marginBottom: 6 }}>
            <span>
              <strong>LLM {formatMonth(month)}:</strong> {formatMoney(budget.spent_usd)} of {formatMoney(budget.cap.effective)} · {formatMoney(budget.remaining_usd)} left
            </span>
            <span>
              <strong>Model:</strong> {budget.settings.llm_enabled ? budget.settings.llm_model ?? "connector default" : "LLM off"}
            </span>
          </div>
          <BudgetBar spent={budget.spent_usd} cap={budget.cap.effective} label={`LLM budget used, ${source.display_name}`} />
        </div>
      )}
      {!source.metadata_only && c.pending > 0 && (
        <div>
          <Link href="/home" className={styles.link}>
            {c.pending} pending review → open the review queue
          </Link>
        </div>
      )}

      <div className={styles.stats}>
        <Stat value={c.new_7d} label="New (7 days)" />
        {source.metadata_only ? (
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
        <Stat value={c.errors} label="Errors" alert={c.errors > 0} />
      </div>
    </article>
  );
}

function BotsContent() {
  const { getIdToken } = useUser();
  const { showAlert, showConfirm } = useAlert();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [budget, setBudget] = useState<BudgetState>({ phase: "loading" });

  const loadBudget = useCallback(
    async (token: string) => {
      const res = await getBudget(token);
      setBudget(res.ok ? { phase: "ready", data: res.data } : { phase: "unavailable", kind: res.kind, message: res.message });
    },
    []
  );

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    const token = await getIdToken();
    if (!token) {
      setState({ phase: "error", kind: "forbidden", message: "No session token." });
      return;
    }
    const [res] = await Promise.all([listSources(token), loadBudget(token)]);
    if (!res.ok) {
      setState({ phase: "error", kind: res.kind, message: res.message });
      return;
    }
    setState({ phase: "ready", sources: res.data?.sources ?? [], runNowConfigured: Boolean(res.data?.run_now_configured) });
  }, [getIdToken, loadBudget]);

  // Resolves to an error message for the form, or null when saved.
  const saveGlobalCap = async (value: number, isRaise: boolean): Promise<string | null> => {
    if (budget.phase !== "ready") return "Budget not loaded.";
    const ceiling = budget.data.ceilings.llm_max_usd_per_month;
    if (isRaise) {
      const applies = value > ceiling ? ` The server ceiling is ${formatMoney(ceiling)}, so ${formatMoney(ceiling)} will apply.` : "";
      const ok = await showConfirm(`Raise the monthly LLM cap for all bots from ${formatMoney(budget.data.total.cap.requested)} to ${formatMoney(value)}?${applies}`);
      if (!ok) return null;
    }
    const token = await getIdToken();
    if (!token) return "No session.";
    const res = await putBudget(token, value, isRaise);
    if (!res.ok) return isRaiseNotConfirmed(res) ? "Nothing was saved: the cap was changed meanwhile. Reload and try again." : res.message;
    await loadBudget(token);
    showAlert("Monthly cap saved.", "success");
    return null;
  };

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (source: DataSource, next: boolean) => {
    if (!(await confirmToggle(source, next, showConfirm))) return;
    setBusyKey(source.source_key);
    const token = await getIdToken();
    const res = token ? await setSourceEnabled(token, source.source_key, next) : null;
    setBusyKey(null);
    if (!res || !res.ok) {
      showAlert(`Could not update ${source.display_name}: ${res && !res.ok ? res.message : "no session"}`, "error");
      return;
    }
    setState((prev) =>
      prev.phase === "ready"
        ? { ...prev, sources: prev.sources.map((s) => (s.source_key === source.source_key ? res.data.source ?? { ...s, enabled: next } : s)) }
        : prev
    );
    showAlert(`${source.display_name} ${next ? "enabled" : "disabled"}.`, "success");
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Bots</h1>
          <p className={styles.subtitle}>
            Data connectors that look for new public-domain artworks in open museum collections. They run weekly on GitHub
            Actions and only ever create <strong>pending submissions</strong>; nothing goes live without your approval.
          </p>
        </div>
        <Link href="/home" className={styles.button}>
          Review pending submissions
        </Link>
      </div>

      {state.phase === "loading" && <LoadingState />}
      {state.phase === "error" && <ErrorState kind={state.kind} message={state.message} onRetry={load} />}
      {state.phase === "ready" && state.sources.length === 0 && (
        <div className={styles.state}>
          <div className={styles.stateTitle}>No sources registered</div>
          <p>Run the data-connectors migration on the database to register the sources.</p>
        </div>
      )}
      {state.phase === "ready" && budget.phase === "unavailable" && (
        <div className={`${styles.notice} ${styles.noticeInfo}`}>
          <div className={styles.noticeTitle}>Budget and settings unavailable</div>
          {budget.kind === "not_deployed"
            ? "The API on this environment does not have the budget endpoints yet. Deploy the API branch and run the 2026_11_16_connector_budget migration; until then the bots use the caps from their own environment."
            : `The budget could not be loaded: ${budget.message}`}
        </div>
      )}
      {state.phase === "ready" && budget.phase === "ready" && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>LLM budget · all bots</h2>
            <span className={styles.muted}>Calendar month, UTC · as of {formatDateTime(budget.data.as_of)}</span>
          </div>
          <BudgetFigures block={budget.data.total} month={budget.data.month} what="all bots" />
          <div className={styles.budgetSplit}>
            <div>
              <h3 className={styles.subTitle}>Last 6 months</h3>
              <HistoryTable history={budget.data.total.history} />
            </div>
            <div>
              <h3 className={styles.subTitle}>Cap</h3>
              <GlobalCapEditor key={budget.data.total.cap.requested} cap={budget.data.total.cap} onSave={saveGlobalCap} />
              <p className={styles.budgetNote}>
                A bot may spend the smallest of: its own caps (set on its page), this cap, the server ceilings ({formatMoney(budget.data.ceilings.llm_max_usd_per_run)} per run,{" "}
                {formatMoney(budget.data.ceilings.llm_max_usd_per_month)} per month) and the caps in the bot&apos;s own GitHub environment.
              </p>
              <h3 className={styles.subTitle}>Cap changes</h3>
              <ChangeLog changes={budget.data.changes} />
            </div>
          </div>
        </section>
      )}
      {state.phase === "ready" && state.sources.length > 0 && (
        <div className={styles.sourceList}>
          {state.sources.map((s) => (
            <SourceCard
              key={s.source_key}
              source={s}
              budget={budget.phase === "ready" ? budget.data.sources.find((b) => b.source_key === s.source_key) ?? null : null}
              totalReached={budget.phase === "ready" && budget.data.total.budget_reached}
              month={budget.phase === "ready" ? budget.data.month : null}
              onToggle={toggle}
              busy={busyKey === s.source_key}
            />
          ))}
        </div>
      )}
      {state.phase === "ready" && budget.phase === "ready" && <CredentialsPanel credentials={budget.data.credentials} />}
    </>
  );
}

export default function BotsPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <AdminGate>
          <BotsContent />
        </AdminGate>
      </main>
    </>
  );
}

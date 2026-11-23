"use client";

// Budget, state and credentials blocks shared by the Bots list and the source page.
// Everything here renders API data as text; nothing is turned into a link or markup.

import React, { useId, useState } from "react";
import styles from "@/app/admin/admin.module.css";
import {
  BotState,
  BudgetBlock,
  Cap,
  clampMessage,
  Credential,
  describeChange,
  formatDateTime,
  formatMoney,
  formatMonth,
  MonthUsage,
  parseUsd,
  SettingChange,
  usedPercent,
} from "@/lib/bots";

const TONE_CLASS: Record<BotState["tone"], string> = {
  ok: styles.badgeOpen,
  warn: styles.badgeRisk,
  bad: styles.badgeBad,
  muted: styles.badgeNeutral,
};

export function StateBadges({ states }: { states: BotState[] }) {
  if (states.length === 0) return null;
  return (
    <span className={styles.stateRow}>
      {states.map((s) => (
        <span key={s.key} className={`${styles.badge} ${TONE_CLASS[s.tone]}`} title={s.detail}>
          {s.label}
        </span>
      ))}
    </span>
  );
}

/** The same states with their explanation written out (source page). */
export function StateList({ states }: { states: BotState[] }) {
  if (states.length === 0) return null;
  return (
    <ul className={styles.stateList}>
      {states.map((s) => (
        <li key={s.key}>
          <span className={`${styles.badge} ${TONE_CLASS[s.tone]}`}>{s.label}</span>
          <span>{s.detail}</span>
        </li>
      ))}
    </ul>
  );
}

export function BudgetBar({ spent, cap, label }: { spent: number; cap: number; label: string }) {
  const pct = usedPercent(spent, cap);
  const tone = pct >= 100 ? styles.budgetFillFull : pct >= 80 ? styles.budgetFillWarn : "";
  return (
    <div
      className={styles.budgetBar}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={`${formatMoney(spent)} of ${formatMoney(cap)} used`}
    >
      <div className={`${styles.budgetFill} ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Why the cap in effect differs from the one that was asked for. */
export function CapNote({ cap, what }: { cap: Cap; what: string }) {
  if (!cap.clamped) {
    return (
      <span>
        Server ceiling for {what}: <strong>{formatMoney(cap.ceiling)}</strong> (read-only, set in the API environment).
      </span>
    );
  }
  return (
    <span className={styles.fieldWarn}>
      {formatMoney(cap.requested)} was asked for, but the server ceiling for {what} is {formatMoney(cap.ceiling)}, so{" "}
      <strong>{formatMoney(cap.effective)}</strong> applies. The ceiling is set in the API environment and cannot be changed here.
    </span>
  );
}

export function HistoryTable({ history }: { history: MonthUsage[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={`${styles.table} ${styles.tableCompact}`}>
        <thead>
          <tr>
            <th>Month</th>
            <th className={styles.num}>Cost</th>
            <th className={styles.num}>Runs</th>
            <th className={styles.num}>LLM calls</th>
            <th className={styles.num}>Tokens in / out</th>
            <th className={styles.num}>Cleaned / fell back</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.month}>
              <td>{formatMonth(h.month)}</td>
              <td className={styles.num}>{formatMoney(h.cost_usd)}</td>
              <td className={styles.num}>{h.runs}</td>
              <td className={styles.num}>{h.llm_calls.toLocaleString("en-US")}</td>
              <td className={styles.num}>
                {h.llm_input_tokens.toLocaleString("en-US")} / {h.llm_output_tokens.toLocaleString("en-US")}
              </td>
              <td className={styles.num}>
                {h.llm_cleaned} / {h.llm_fallbacks}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Month-to-date spend against the cap in effect: figures, bar, projection, six months of history.
 * `what` names the cap ("this source", "all bots").
 */
export function BudgetFigures({ block, month, what, compact }: { block: BudgetBlock; month: string; what: string; compact?: boolean }) {
  const cap = block.cap.effective;
  const reached = block.remaining_usd <= 0;
  return (
    <div>
      <div className={styles.budgetHead}>
        <span>
          <span className={styles.budgetSpent}>{formatMoney(block.spent_usd)}</span> spent in {formatMonth(month)}
        </span>
        <span>
          Cap <strong>{formatMoney(cap)}</strong>
        </span>
        <span>
          Remaining <strong>{formatMoney(block.remaining_usd)}</strong>
        </span>
        <span title="Month-to-date plus the average daily spend of the last 28 days for the days left in the month">
          Projected month end <strong>{formatMoney(block.projected_month_end_usd)}</strong>
        </span>
      </div>
      <BudgetBar spent={block.spent_usd} cap={cap} label={`LLM budget used, ${what}`} />
      {!compact && (
        <div className={styles.budgetNote}>
          {reached ? (
            <span className={styles.fieldWarn}>
              Budget reached for {what}: runs continue without the LLM (deterministic parser) until the month ends or the cap is raised.{" "}
            </span>
          ) : block.projected_over_cap ? (
            <span className={styles.fieldWarn}>
              At the recent pace the cap would be reached before the month ends; from then on runs continue without the LLM.{" "}
            </span>
          ) : null}
          <CapNote cap={block.cap} what={what} />
        </div>
      )}
    </div>
  );
}

export function ChangeLog({ changes }: { changes: SettingChange[] }) {
  if (changes.length === 0) return <p className={styles.muted}>No changes recorded yet.</p>;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Change (old → new)</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c) => (
            <tr key={c.id}>
              <td>{formatDateTime(c.created_at)}</td>
              <td>{c.actor_email ?? "—"}</td>
              <td>{describeChange(c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CredentialsPanel({ credentials }: { credentials: Credential[] }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Credentials</h2>
        <span className={styles.muted}>Names only. Values are never sent to this page.</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Secret</th>
              <th>Used for</th>
              <th>Where it lives</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((c) => (
              <tr key={c.name}>
                <td>
                  <span className={styles.credName}>{c.name}</span>
                </td>
                <td>{c.purpose}</td>
                <td>{c.lives_in}</td>
                <td>
                  {c.configured === null ? (
                    <span className={`${styles.badge} ${styles.badgeNeutral}`}>Not visible to the API</span>
                  ) : c.configured ? (
                    <span className={`${styles.badge} ${styles.badgeOpen}`}>Configured</span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeBad}`}>Not configured</span>
                  )}
                  <div className={styles.muted} style={{ marginTop: 4 }}>
                    {c.note}
                    {c.configured === null && (
                      <> {c.last_used_at ? `Last run with LLM calls: ${formatDateTime(c.last_used_at)}.` : "No run has reported LLM calls yet."}</>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Edit the monthly cap across all bots. `onSave(value, raise)` resolves to an error message or null. */
export function GlobalCapEditor({
  cap,
  onSave,
}: {
  cap: Cap;
  onSave: (value: number, isRaise: boolean) => Promise<string | null>;
}) {
  const id = useId();
  const [text, setText] = useState(cap.requested.toFixed(2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = parseUsd(text);
  const inputError = "error" in parsed ? parsed.error : null;
  const unchanged = !("error" in parsed) && parsed.value === cap.requested;
  const clamp = clampMessage(text, cap.ceiling);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if ("error" in parsed || unchanged) return;
    setBusy(true);
    setError(await onSave(parsed.value, parsed.value > cap.requested));
    setBusy(false);
  };

  return (
    <form onSubmit={save} noValidate>
      <div className={styles.formField} style={{ maxWidth: 320 }}>
        <label htmlFor={`${id}-cap`} className={styles.field}>
          Monthly cap, all bots (USD)
        </label>
        <input
          id={`${id}-cap`}
          className={styles.control}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          maxLength={8}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          aria-invalid={Boolean(inputError)}
          aria-describedby={`${id}-cap-hint`}
        />
        <span id={`${id}-cap-hint`} className={inputError || error ? styles.errorText : clamp ? styles.fieldWarn : styles.muted}>
          {inputError ?? error ?? clamp ?? `Applies on top of each bot's own cap. Server ceiling: ${formatMoney(cap.ceiling)}.`}
        </span>
      </div>
      <div className={styles.formActions}>
        <button type="submit" className={styles.buttonPrimary} disabled={busy || Boolean(inputError) || unchanged}>
          {busy ? "Saving…" : "Save cap"}
        </button>
      </div>
    </form>
  );
}

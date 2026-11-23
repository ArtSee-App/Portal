"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/header/header";
import styles from "../admin.module.css";
import { useUser } from "@/context/UserContext";
import { useAlert } from "@/context/AlertContext";
import { AdminGate, ChipGroup, ErrorState, LoadingState, Modal, StatusPill } from "@/components/admin/AdminKit";
import { formatDateTime } from "@/lib/bots";
import {
  clearOverride,
  currentRule,
  EARLY_WORK_MAX_YEAR,
  getRightsSummary,
  lifeDates,
  listRestricted,
  MAX_LIFESPAN_YEARS,
  reasonDetail,
  reasonLabel,
  RightsCounts,
  RightsFilter,
  RightsItem,
  RightsRule,
  setOverride,
} from "@/lib/rights";
import type { ApiErrorKind } from "@/lib/api";

type Load<T> = { phase: "loading" } | { phase: "error"; kind: ApiErrorKind; message: string } | { phase: "ready"; data: T };

const PAGE_SIZE = 50;
/** Setting needs a real licence note; the server's own minimum (3) applies to clearing. */
const MIN_NOTE_SET = 10;
const MIN_NOTE_CLEAR = 3;
const fmt = (n: number | undefined) => (n ?? 0).toLocaleString("en-US");

function Explainer({ rule }: { rule: RightsRule }) {
  const firstRestricted = rule.last_free_death_year + 1;
  return (
    <section className={styles.panel} aria-labelledby="rule-title">
      <h2 id="rule-title" className={styles.panelTitle} style={{ marginBottom: 8 }}>
        The rule in plain words
      </h2>
      <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--muted)", marginBottom: 14, maxWidth: 880 }}>
        We only show an artwork&apos;s image once its copyright has run out. In Europe that is {rule.term_years} years after the artist&apos;s death,
        counted from the next 1 January, so today artists who died in <strong>{rule.last_free_death_year} or earlier</strong> are free to show. When
        the death year is missing, a work dated {EARLY_WORK_MAX_YEAR} or earlier, or an artist born in {rule.last_free_death_year - MAX_LIFESPAN_YEARS}{" "}
        or earlier, also counts as free, and so does anything the artist submitted through the Portal themselves. Everything else is restricted:
        scanning still recognises it, but the app shows no image of it. This page does not show the images either.
      </p>
      <div className={styles.ruleBox}>
        <div className={styles.ruleItem}>
          <strong>Living artist</strong>
          No death year and born within a lifetime. Protected for the artist&apos;s whole life plus {rule.term_years} years.
        </div>
        <div className={styles.ruleItem}>
          <strong>Died after the cutoff</strong>
          Died in {firstRestricted} or later. Each work frees itself on 1 January, {rule.term_years + 1} years after the death year.
        </div>
        <div className={styles.ruleItem}>
          <strong>Unknown dates</strong>
          No death year and nothing proves the work is old enough, so we play safe. Adding the artist&apos;s dates usually settles it.
        </div>
        <div className={styles.ruleItem}>
          <strong>Override</strong>
          &quot;Licensed: display allowed&quot;, only when we hold a licence or written permission. Needs a note; setting and clearing are both
          written to the audit log.
        </div>
      </div>
    </section>
  );
}

function OverrideDialog({
  item,
  mode,
  onClose,
  onDone,
}: {
  item: RightsItem;
  mode: "set" | "clear";
  onClose: () => void;
  onDone: (next: RightsItem, message: string) => void;
}) {
  const { getIdToken } = useUser();
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const min = mode === "set" ? MIN_NOTE_SET : MIN_NOTE_CLEAR;
  const noteOk = note.trim().length >= min;
  const noteId = `note-${item.artwork_id}`;
  const hintId = `note-hint-${item.artwork_id}`;
  const formId = `override-form-${item.artwork_id}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!noteOk) return;
    setBusy(true);
    setError(null);
    const token = await getIdToken();
    const res = token ? (mode === "set" ? await setOverride(token, item.artwork_id, note, "full") : await clearOverride(token, item.artwork_id, note)) : null;
    setBusy(false);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.message : "No session.");
      return;
    }
    const next: RightsItem =
      mode === "set"
        ? {
            ...item,
            status: res.data.rights_status ?? "full",
            reason: res.data.rights_reason ?? "override",
            override: { display: "full", note: note.trim(), set_by: "you", set_at: new Date().toISOString() },
          }
        : { ...item, status: res.data.rights_status ?? item.status, reason: res.data.rights_reason ?? item.reason, override: null };
    onDone(
      next,
      mode === "set"
        ? `"${item.title}" can now be shown in the app.`
        : next.status === "full"
          ? `Override cleared. The rule itself allows "${item.title}", so it stays visible.`
          : `Override cleared. "${item.title}" is hidden in the app again.`
    );
  };

  return (
    <Modal
      open
      busy={busy}
      onClose={onClose}
      title={mode === "set" ? `Allow display of "${item.title}"?` : `Clear the override on "${item.title}"?`}
      footer={
        <>
          <button type="button" className={styles.buttonGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form={formId} className={mode === "set" ? styles.buttonPrimary : styles.buttonDanger} disabled={busy}>
            {busy ? "Saving…" : mode === "set" ? "Set override" : "Clear override"}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>
          {item.artist_name ?? "Unknown artist"} ({lifeDates(item)}). {reasonLabel(item.reason)}.
        </p>
        {mode === "set" ? (
          <p>
            The app starts showing this image, marked <strong>Licensed: display allowed</strong>. Only do this when ArtVista holds a licence or
            written permission from the rights holder. Your account and the note go to the audit log.
          </p>
        ) : (
          <p>
            The rule decides again: if the artwork is still under copyright the app stops showing its image. It stays in the catalogue either way.
            Your account and the note go to the audit log.
            {item.override?.note && (
              <>
                {" "}
                Current note: <em>{item.override.note}</em>
              </>
            )}
          </p>
        )}
        <label htmlFor={noteId} className={styles.field}>
          {mode === "set" ? "Note (required)" : "Reason (required)"}
        </label>
        <textarea
          id={noteId}
          className={styles.control}
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => setTouched(true)}
          required
          aria-invalid={touched && !noteOk}
          aria-describedby={hintId}
          placeholder={mode === "set" ? "Licence from the artist's estate, signed 2026-10-02, PDF in Drive > Legal > Licences" : "Licence expired"}
        />
        <span id={hintId} className={touched && !noteOk ? styles.errorText : styles.muted}>
          {mode === "set"
            ? `Say what licence we hold, who granted it and where the document is (at least ${MIN_NOTE_SET} characters).`
            : `Why the override goes (at least ${MIN_NOTE_CLEAR} characters). Shown in the audit log.`}
        </span>
        {error && (
          <div className={`${styles.notice} ${styles.noticeWarning}`} role="alert">
            Could not save: {error}
          </div>
        )}
      </form>
    </Modal>
  );
}

function InApp({ item }: { item: RightsItem }) {
  const o = item.override;
  if (!o) return <StatusPill status="muted" label={item.status === "full" ? "Shown" : "Image hidden"} />;
  return (
    <>
      {o.display === "full" ? <StatusPill status="accepted" label="Licensed: display allowed" /> : <StatusPill status="rejected" label="Hidden by an admin" />}
      {o.note && <div className={styles.overrideNote}>{o.note}</div>}
      {(o.set_by || o.set_at) && <span className={styles.cellNote}>{[o.set_by, o.set_at ? formatDateTime(o.set_at) : ""].filter(Boolean).join(", ")}</span>}
    </>
  );
}

function RightsContent() {
  const { getIdToken } = useUser();
  const { showAlert } = useAlert();
  const [filter, setFilter] = useState<RightsFilter>("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [state, setState] = useState<Load<{ items: RightsItem[]; total: number }>>({ phase: "loading" });
  const [counts, setCounts] = useState<RightsCounts | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dialog, setDialog] = useState<{ item: RightsItem; mode: "set" | "clear" } | null>(null);
  const requestId = useRef(0);
  const rule = currentRule();

  const loadCounts = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    const res = await getRightsSummary(token);
    if (res.ok) setCounts(res.data);
  }, [getIdToken]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState({ phase: "loading" });
    const token = await getIdToken();
    if (!token) return setState({ phase: "error", kind: "forbidden", message: "No session token." });
    const res = await listRestricted(token, filter, q, PAGE_SIZE, 0);
    if (id !== requestId.current) return;
    setState(res.ok ? { phase: "ready", data: res.data } : { phase: "error", kind: res.kind, message: res.message });
  }, [getIdToken, filter, q]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const loadMore = async () => {
    if (state.phase !== "ready") return;
    const id = requestId.current;
    setLoadingMore(true);
    const token = await getIdToken();
    const res = token ? await listRestricted(token, filter, q, PAGE_SIZE, state.data.items.length) : null;
    setLoadingMore(false);
    if (id !== requestId.current) return;
    if (!res || !res.ok) {
      showAlert(res && !res.ok ? `Could not load more: ${res.message}` : "No session.", "error");
      return;
    }
    setState({ phase: "ready", data: { items: [...state.data.items, ...res.data.items], total: res.data.total } });
  };

  const onDone = (next: RightsItem, message: string) => {
    setDialog(null);
    showAlert(message, "success");
    setState((prev) =>
      prev.phase === "ready" ? { ...prev, data: { ...prev.data, items: prev.data.items.map((it) => (it.artwork_id === next.artwork_id ? next : it)) } } : prev
    );
    loadCounts();
  };

  return (
    <>
      <Explainer rule={rule} />
      <section className={styles.panel} aria-labelledby="restricted-title">
        <div className={styles.panelHeader}>
          <h2 id="restricted-title" className={styles.panelTitle}>
            Restricted artworks
            {counts && (
              <span className={styles.muted} style={{ fontWeight: 400, marginLeft: 8 }}>
                {fmt(counts.restricted_total)} of {fmt(counts.active_artworks)} live artworks
              </span>
            )}
          </h2>
          <ChipGroup
            label="Filter by reason"
            value={filter}
            onChange={setFilter}
            options={[
              { key: "", label: "All restricted" },
              { key: "living_artist", label: "Living artist", count: counts?.living_artist },
              { key: "died_after_cutoff", label: "Died after the cutoff", count: counts?.died_after_cutoff },
              { key: "unknown_dates", label: "Unknown dates", count: counts?.unknown_dates },
              { key: "override", label: "Override", count: counts?.override },
            ]}
          />
        </div>
        <form
          className={styles.filterBar}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(qInput);
          }}
        >
          <label className={styles.field}>
            Title or artist
            <input type="search" className={`${styles.control} ${styles.controlWide}`} value={qInput} maxLength={100} onChange={(e) => setQInput(e.target.value)} />
          </label>
          <button type="submit" className={styles.button}>
            Search
          </button>
          {q && (
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={() => {
                setQInput("");
                setQ("");
              }}
            >
              Clear
            </button>
          )}
        </form>

        {state.phase === "loading" && <LoadingState />}
        {state.phase === "error" && <ErrorState kind={state.kind} message={state.message} onRetry={load} />}
        {state.phase === "ready" && state.data.items.length === 0 && (
          <p className={styles.muted}>
            {filter || q
              ? "Nothing matches these filters."
              : "No restricted artworks. Either every live artwork is free to show, or the rights backfill has not run yet."}
          </p>
        )}
        {state.phase === "ready" && state.data.items.length > 0 && (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>Copyright-restricted artworks, without images</caption>
                <thead>
                  <tr>
                    <th scope="col">Artwork</th>
                    <th scope="col">Artist</th>
                    <th scope="col">Why</th>
                    <th scope="col">Source</th>
                    <th scope="col">In the app</th>
                    <th scope="col">
                      <span className={styles.srOnly}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.items.map((it) => (
                    <tr key={it.artwork_id}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{it.title}</span> <span className={styles.muted}>#{it.artwork_id}</span>
                        {it.creation_date && <span className={styles.cellNote}>{it.creation_date}</span>}
                      </td>
                      <td>
                        {it.artist_name ?? <span className={styles.muted}>Unknown artist</span>}
                        <span className={styles.cellNote}>{lifeDates(it)}</span>
                      </td>
                      <td>
                        {reasonLabel(it.reason)}
                        <span className={styles.cellNote}>{reasonDetail(it, rule)}</span>
                      </td>
                      <td>{it.source ?? <span className={styles.muted}>Not recorded</span>}</td>
                      <td>
                        <InApp item={it} />
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          {it.override ? (
                            <button
                              type="button"
                              className={`${styles.buttonDanger} ${styles.buttonSmall}`}
                              onClick={() => setDialog({ item: it, mode: "clear" })}
                              aria-label={`Clear override for ${it.title}`}
                            >
                              Clear override
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`${styles.button} ${styles.buttonSmall}`}
                              onClick={() => setDialog({ item: it, mode: "set" })}
                              aria-label={`Set licensed override for ${it.title}`}
                            >
                              Set override…
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.tableFooter}>
              <span className={styles.muted}>
                Showing {fmt(state.data.items.length)} of {fmt(state.data.total)}
              </span>
              {state.data.items.length < state.data.total && (
                <button type="button" className={styles.button} onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : `Load ${PAGE_SIZE} more`}
                </button>
              )}
            </div>
          </>
        )}
      </section>
      {dialog && (
        <OverrideDialog
          key={`${dialog.item.artwork_id}-${dialog.mode}`}
          item={dialog.item}
          mode={dialog.mode}
          onClose={() => setDialog(null)}
          onDone={onDone}
        />
      )}
    </>
  );
}

export default function RightsPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Rights</h1>
            <p className={styles.subtitle}>Artworks that are still under copyright. Their images are hidden in the app and are not shown here.</p>
          </div>
        </div>
        <AdminGate>
          <RightsContent />
        </AdminGate>
      </main>
    </>
  );
}

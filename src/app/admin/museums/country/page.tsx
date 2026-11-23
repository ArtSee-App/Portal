"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/header/header";
import styles from "../../admin.module.css";
import { useUser } from "@/context/UserContext";
import { useAlert } from "@/context/AlertContext";
import { AdminGate, ChipGroup, ErrorState, LoadingState, Modal, Stat, StatusPill } from "@/components/admin/AdminKit";
import { formatDateTime, safeExternalUrl } from "@/lib/bots";
import {
  approveCandidate,
  approveCountryBatch,
  CandidateFilters,
  COMMERCIAL_NOTE,
  CountrySummary,
  DecisionResult,
  displayName,
  ExistingMatch,
  CONTENT_CHANGED_FLAG,
  flagLabel,
  fmt,
  formatCoord,
  formatDistance,
  getCountry,
  isDecided,
  KIND_LABEL,
  licenseLabel,
  linkCandidate,
  listCandidates,
  listMuseumArtworks,
  markDuplicate,
  mergeMuseums,
  MuseumArtworks,
  MuseumCandidate,
  MuseumKind,
  osmUrl,
  percent,
  PROMOTE_LIMIT,
  promoteCountry,
  rejectCandidate,
  STATUS_LABEL,
  statusPillKey,
  wikidataUrl,
} from "@/lib/museums";
import type { ApiErrorKind, ApiResult } from "@/lib/api";

type Load<T> = { phase: "loading" } | { phase: "error"; kind: ApiErrorKind; message: string } | { phase: "ready"; data: T };

const PAGE_SIZE = 50;

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

const errorText = (res: ApiResult<unknown> | null) => (res && !res.ok ? res.message : "No session.");

// ---------------------------------------------------------------------------
// Step 1: batch approval
// ---------------------------------------------------------------------------

function BatchPanel({ country, onOpen }: { country: CountrySummary; onOpen: () => void }) {
  const name = country.country_name;
  const { approvable: ready, flagged } = country.batch;
  const undecided = country.counts.undecided;
  const whole = ready + flagged || 1;

  if (undecided === 0) {
    return (
      <div className={`${styles.notice} ${styles.noticeInfo}`}>
        <div className={styles.noticeTitle}>Step 1 done: nothing pending in {name}</div>
        Every imported museum here has been approved, rejected or marked as a duplicate.
      </div>
    );
  }

  return (
    <section className={styles.batchPanel} aria-labelledby="batch-title">
      <div>
        <h2 id="batch-title" className={styles.panelTitle}>
          Step 1: approve {name} in one go
        </h2>
        <p className={styles.subtitle} style={{ marginTop: 4 }}>
          {fmt(undecided)} museums in {name} are waiting. <strong>{fmt(ready)}</strong> look routine and can be approved together.{" "}
          <strong>{fmt(flagged)}</strong> are flagged and need your eye first; the one-click approval leaves them alone.
        </p>
      </div>
      <div className={styles.batchSplit} aria-hidden="true">
        <div className={styles.batchSplitReady} style={{ width: `${(ready / whole) * 100}%` }} />
        <div className={styles.batchSplitFlagged} style={{ width: `${(flagged / whole) * 100}%` }} />
      </div>
      <div className={styles.batchLegend}>
        <span>
          <span className={styles.legendDot} style={{ backgroundColor: "var(--success-solid)" }} aria-hidden="true" />
          Ready: {fmt(ready)}
        </span>
        <span>
          <span className={styles.legendDot} style={{ backgroundColor: "var(--warning-solid)" }} aria-hidden="true" />
          Flagged: {fmt(flagged)}
          {country.counts.duplicates > 0 && <span className={styles.muted}> (includes possible duplicates of museums we already have)</span>}
        </span>
      </div>
      <div className={styles.batchActionRow}>
        <button type="button" className={`${styles.buttonPrimary} ${styles.buttonBig}`} disabled={ready === 0} onClick={onOpen}>
          Approve all {fmt(ready)} in {name} except the {fmt(flagged)} flagged
        </button>
        {ready === 0 && <span className={styles.muted}>Nothing routine left: only flagged museums are pending.</span>}
      </div>
    </section>
  );
}

function BatchDialog({
  country,
  open,
  busy,
  onCancel,
  onConfirm,
}: {
  country: CountrySummary;
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const name = country.country_name;
  const { approvable, flagged } = country.batch;
  return (
    <Modal
      open={open}
      busy={busy}
      onClose={onCancel}
      title={`Approve ${fmt(approvable)} museums in ${name}?`}
      footer={
        <>
          <button type="button" className={styles.buttonGhost} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={styles.buttonPrimary} onClick={onConfirm} disabled={busy}>
            {busy ? "Approving…" : `Approve ${fmt(approvable)} museums`}
          </button>
        </>
      }
    >
      <div>
        <strong>What happens</strong>
        <ul className={styles.whatList}>
          <li>
            The <strong>{fmt(approvable)}</strong> pending museums in {name} that are not flagged become <strong>Approved</strong>.
          </li>
          <li>
            The app does not change yet. They go live on the map and in museum search when you <strong>publish</strong> (step 2 on this page).
            Commercial galleries among them go live as a location only (name and pin, no details).
          </li>
          <li>
            The <strong>{fmt(flagged)}</strong> flagged museums stay pending, untouched. You handle them one by one in the table below.
          </li>
          <li>Museums already approved, rejected or marked as duplicates are not touched. No existing museum row is changed.</li>
          <li>The approval is recorded in the admin audit log under your account.</li>
          <li>If the set changed since this page loaded (for example a new import ran), nothing is approved and the page shows the new numbers.</li>
        </ul>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Step 2: publish (promote approved rows into the live museum table)
// ---------------------------------------------------------------------------

function PublishPanel({ country, onOpen }: { country: CountrySummary; onOpen: () => void }) {
  const waiting = country.counts.awaiting_promotion;
  return (
    <section className={styles.panel} aria-labelledby="publish-title">
      <div className={styles.panelHeader} style={{ marginBottom: 8 }}>
        <h2 id="publish-title" className={styles.panelTitle}>
          Step 2: publish to the app
        </h2>
        <button type="button" className={styles.buttonPrimary} disabled={waiting === 0} onClick={onOpen}>
          {waiting === 0 ? "Nothing to publish" : `Publish ${fmt(Math.min(waiting, PROMOTE_LIMIT))} approved museums`}
        </button>
      </div>
      <p className={styles.muted} style={{ fontSize: "0.9rem" }}>
        {fmt(country.counts.promoted)} museums from {country.country_name} are live in the app.{" "}
        {waiting > 0
          ? `${fmt(waiting)} approved (or updated on Wikidata since) are waiting to go live.`
          : "Everything approved is live."}
        {waiting > PROMOTE_LIMIT && ` One press publishes up to ${fmt(PROMOTE_LIMIT)}; press again for the rest.`}
      </p>
    </section>
  );
}

function PublishDialog({ country, open, busy, onCancel, onConfirm }: { country: CountrySummary; open: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const n = Math.min(country.counts.awaiting_promotion, PROMOTE_LIMIT);
  return (
    <Modal
      open={open}
      busy={busy}
      onClose={onCancel}
      title={`Publish ${fmt(n)} museums in ${country.country_name}?`}
      footer={
        <>
          <button type="button" className={styles.buttonGhost} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={styles.buttonPrimary} onClick={onConfirm} disabled={busy}>
            {busy ? "Publishing…" : `Publish ${fmt(n)}`}
          </button>
        </>
      }
    >
      <div>
        <strong>What happens</strong>
        <ul className={styles.whatList}>
          <li>
            The approved museums are written to the live museum list. They appear on the app map and in museum search for everyone.
          </li>
          <li>
            A museum we already have (same Wikidata ID, or one you linked) is refreshed instead of added twice. Its curated name, summary and
            image stay as they are.
          </li>
          <li>Commercial galleries go live as a location only: name and pin, no image, no details.</li>
          <li>Images are only the public-domain or CC0 Commons files shown in the table; the rest get the app&apos;s placeholder.</li>
          <li>The publish is recorded in the admin audit log under your account.</li>
        </ul>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Resolve a possible duplicate (link / duplicate / new) and merge two live rows
// ---------------------------------------------------------------------------

function MatchText({ m }: { m: ExistingMatch }) {
  const coord = formatCoord(m.latitude, m.longitude);
  return (
    <span>
      <strong>
        #{m.museum_id} {m.name ?? "Unnamed museum"}
      </strong>
      <span className={styles.cellNote}>
        {m.city ?? "No city"}
        {m.method === "name_geo" && ` · ${formatDistance(m.distance_m)}`}
        {m.score !== null && m.method === "name_geo" && ` · name match ${Math.round(m.score)}/100`}
        {m.method === "qid" && " · same Wikidata ID"}
        {m.wikidata_qid && m.method !== "qid" && ` · already has ${m.wikidata_qid}`}
      </span>
      {coord && (
        <span className={styles.cellNote}>
          {coord}{" "}
          <a href={safeExternalUrl(osmUrl(m.latitude!, m.longitude!))} {...ext} className={styles.link}>
            Map ↗
          </a>
        </span>
      )}
    </span>
  );
}

type Decision = "link" | "duplicate" | "duplicate_qid" | "new";

function MergeRows({ candidate, suggestedId, onMerged }: { candidate: MuseumCandidate; suggestedId: number | null; onMerged: (msg: string) => void }) {
  const { getIdToken } = useUser();
  const [keep, setKeep] = useState(suggestedId ? String(suggestedId) : "");
  const [retire, setRetire] = useState(candidate.promoted_museum_id && candidate.promoted_museum_id !== suggestedId ? String(candidate.promoted_museum_id) : "");
  const [preview, setPreview] = useState<Load<MuseumArtworks> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keepId = /^\d+$/.test(keep) ? Number(keep) : null;
  const retireId = /^\d+$/.test(retire) ? Number(retire) : null;
  const valid = keepId !== null && retireId !== null && keepId !== retireId;

  useEffect(() => {
    setPreview(null);
    setError(null);
  }, [keep, retire]);

  const loadPreview = async () => {
    if (!valid || preview?.phase === "loading") return;
    setPreview({ phase: "loading" });
    const token = await getIdToken();
    if (!token) return setPreview({ phase: "error", kind: "forbidden", message: "No session token." });
    const res = await listMuseumArtworks(token, retireId!, 50);
    setPreview(res.ok ? { phase: "ready", data: res.data } : { phase: "error", kind: res.kind, message: res.message });
  };

  const merge = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    const token = await getIdToken();
    const res = token ? await mergeMuseums(token, retireId!, keepId!, `Portal merge while reviewing ${candidate.qid}`) : null;
    setBusy(false);
    if (!res || !res.ok) return setError(errorText(res));
    onMerged(
      res.data.already_merged
        ? `#${retireId} was already merged into #${keepId}.`
        : `#${retireId} merged into #${keepId}: ${fmt(res.data.artworks)} artworks and ${fmt(res.data.pending_artworks)} pending submissions moved.`
    );
  };

  const fieldId = `merge-${candidate.qid}`;
  return (
    <details className={styles.factCard} open={Boolean(retire)}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Our table has this museum twice? Merge two museum rows</summary>
      <p style={{ margin: "8px 0" }}>
        Pick the row to keep and the row to retire. The retired row points to the kept one (old links in the app keep working) and every artwork on it
        moves over, in one step.
      </p>
      <div className={styles.filterBar} style={{ marginBottom: 8 }}>
        <label className={styles.field} htmlFor={`${fieldId}-keep`}>
          Keep museum #
          <input id={`${fieldId}-keep`} className={styles.control} inputMode="numeric" value={keep} onChange={(e) => setKeep(e.target.value.trim())} />
        </label>
        <label className={styles.field} htmlFor={`${fieldId}-retire`}>
          Retire museum #
          <input id={`${fieldId}-retire`} className={styles.control} inputMode="numeric" value={retire} onChange={(e) => setRetire(e.target.value.trim())} />
        </label>
        <button type="button" className={styles.button} disabled={!valid || busy} onClick={loadPreview}>
          Preview the artworks that would move
        </button>
      </div>
      {keep && retire && !valid && <p className={styles.errorText}>Enter two different museum ids.</p>}
      {preview?.phase === "loading" && <LoadingState />}
      {preview?.phase === "error" && (
        <p className={styles.errorText}>
          {preview.kind === "not_deployed"
            ? "The preview needs the rights endpoints on the API. The merge itself works without it."
            : `Preview failed: ${preview.message}`}
        </p>
      )}
      {preview?.phase === "ready" && (
        <div aria-live="polite">
          {preview.data.total === 0 ? (
            <p>
              <strong>No live artwork points at #{retireId}.</strong> Pending submissions that do are moved too.
            </p>
          ) : (
            <>
              <p style={{ marginBottom: 6 }}>
                <strong>{fmt(preview.data.total)} artworks</strong> move from #{retireId} to #{keepId}
                {preview.data.total > preview.data.items.length ? ` (first ${preview.data.items.length} shown)` : ""}. Pending submissions on #{retireId}{" "}
                move too.
              </p>
              <div className={styles.tableWrap} style={{ maxHeight: 220, overflowY: "auto" }}>
                <table className={styles.table}>
                  <caption className={styles.srOnly}>Artworks that would move to museum #{keepId}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Artwork</th>
                      <th scope="col">Artist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.items.map((a) => (
                      <tr key={a.artwork_id}>
                        <td>
                          {a.title} <span className={styles.muted}>#{a.artwork_id}</span>
                        </td>
                        <td>{a.artist_name ?? "Unknown"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <button type="button" className={styles.buttonDanger} disabled={!valid || busy || preview?.phase !== "ready"} onClick={merge}>
          {busy ? "Merging…" : valid ? `Merge #${retireId} into #${keepId}` : "Merge"}
        </button>
        {valid && preview?.phase !== "ready" && <span className={styles.muted}> Preview first.</span>}
      </div>
      {error && (
        <p className={styles.errorText} role="alert" style={{ marginTop: 6 }}>
          Not merged: {error}
        </p>
      )}
    </details>
  );
}

function ResolveDialog({
  candidate,
  onClose,
  onDone,
}: {
  candidate: MuseumCandidate;
  onClose: () => void;
  onDone: (result: DecisionResult | null, message: string) => void;
}) {
  const { getIdToken } = useUser();
  const match = candidate.match;
  const twins = candidate.twin_qids;
  const [rowChoice, setRowChoice] = useState<"suggested" | "other">(match ? "suggested" : "other");
  const [otherId, setOtherId] = useState("");
  const [decision, setDecision] = useState<Decision>(match ? "link" : twins.length ? "duplicate_qid" : "new");
  const [twinQid, setTwinQid] = useState(twins[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = displayName(candidate);
  const coord = formatCoord(candidate.latitude, candidate.longitude);
  const rowId = rowChoice === "suggested" ? match?.museum_id ?? null : /^\d+$/.test(otherId) ? Number(otherId) : null;
  const needsRow = decision === "link" || decision === "duplicate";
  const canSave = !busy && (!needsRow || rowId !== null) && (decision !== "duplicate_qid" || Boolean(twinQid));

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    const token = await getIdToken();
    let res: ApiResult<DecisionResult> | null = null;
    let message = "";
    if (token) {
      if (decision === "link") {
        res = await linkCandidate(token, candidate.qid, rowId!);
        message = `"${name}" linked to museum #${rowId}. Publishing refreshes that row; no new museum is added.`;
      } else if (decision === "duplicate") {
        res = await markDuplicate(token, candidate.qid, { museumId: rowId! });
        message = `"${name}" marked as a duplicate of #${rowId}. It will never be published.`;
      } else if (decision === "duplicate_qid") {
        res = await markDuplicate(token, candidate.qid, { qid: twinQid });
        message = `"${name}" marked as a duplicate of ${twinQid}. It will never be published.`;
      } else {
        res = await approveCandidate(token, candidate.qid, "Not the same place as the suggested museum");
        message = `"${name}" approved as a new museum. It goes live when you publish.`;
      }
    }
    setBusy(false);
    if (!res || !res.ok) return setError(errorText(res));
    onDone(res.data, message);
  };

  const radioName = `decision-${candidate.qid}`;
  return (
    <Modal
      open
      wide
      busy={busy}
      onClose={onClose}
      title={`Possible duplicate: ${name}`}
      footer={
        <>
          <button type="button" className={styles.buttonGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={styles.buttonPrimary} onClick={save} disabled={!canSave}>
            {busy ? "Saving…" : "Save decision"}
          </button>
        </>
      }
    >
      <div className={styles.compare}>
        <div className={styles.factCard}>
          <h3>From Wikidata (staged)</h3>
          <div lang="en">
            <strong>{candidate.name_en ?? "No English name"}</strong>
          </div>
          {candidate.name_native && (
            <div lang={candidate.native_lang ?? undefined} className={styles.muted}>
              {candidate.native_lang ? `${candidate.native_lang}: ` : "Native: "}
              {candidate.name_native}
            </div>
          )}
          <div>
            {KIND_LABEL[candidate.kind] ?? candidate.kind} · {candidate.city ?? "No city"}
          </div>
          {coord ? (
            <div>
              {coord}{" "}
              <a href={safeExternalUrl(osmUrl(candidate.latitude!, candidate.longitude!))} {...ext} className={styles.link}>
                Map ↗
              </a>
            </div>
          ) : (
            <div className={styles.muted}>No coordinates</div>
          )}
          <div>
            <a href={safeExternalUrl(wikidataUrl(candidate.qid))} {...ext} className={styles.link}>
              {candidate.qid} on Wikidata ↗
            </a>
          </div>
          {candidate.flags.length > 0 && <div className={styles.muted}>Flags: {candidate.flags.map(flagLabel).join("; ")}</div>}
        </div>
        <fieldset className={styles.fieldset}>
          <legend>Pick the existing museum row</legend>
          {match && (
            <label className={`${styles.choice} ${rowChoice === "suggested" ? styles.choiceChecked : ""}`}>
              <input type="radio" name={`row-${candidate.qid}`} checked={rowChoice === "suggested"} onChange={() => setRowChoice("suggested")} />
              <span>
                <span className={styles.muted}>Suggested: </span>
                <MatchText m={match} />
              </span>
            </label>
          )}
          <label className={`${styles.choice} ${rowChoice === "other" ? styles.choiceChecked : ""}`}>
            <input type="radio" name={`row-${candidate.qid}`} checked={rowChoice === "other"} onChange={() => setRowChoice("other")} />
            <span>
              Another museum, by id: #
              <input
                aria-label="Museum id"
                className={styles.control}
                style={{ minWidth: 0, width: 110, marginLeft: 4 }}
                inputMode="numeric"
                value={otherId}
                onFocus={() => setRowChoice("other")}
                onChange={(e) => setOtherId(e.target.value.trim())}
              />
              <span className={styles.cellNote}>
                Find ids in the{" "}
                <Link href="/museum" className={styles.link} target="_blank">
                  museum lookup ↗
                </Link>
              </span>
            </span>
          </label>
        </fieldset>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>What is this Wikidata item?</legend>
        <label className={`${styles.choice} ${decision === "link" ? styles.choiceChecked : ""}`}>
          <input type="radio" name={radioName} checked={decision === "link"} onChange={() => setDecision("link")} />
          <span>
            <strong>The same museum as {rowId ? `#${rowId}` : "that row"}: link them.</strong>
            <span className={styles.cellNote}>
              The row gets the Wikidata ID and this item is approved. Publishing refreshes that row instead of adding a second museum. No artwork moves.
            </span>
          </span>
        </label>
        <label className={`${styles.choice} ${decision === "duplicate" ? styles.choiceChecked : ""}`}>
          <input type="radio" name={radioName} checked={decision === "duplicate"} onChange={() => setDecision("duplicate")} />
          <span>
            <strong>A twin, wing or building item of {rowId ? `#${rowId}` : "that row"}: mark as duplicate.</strong>
            <span className={styles.cellNote}>It is never published. The existing row stays as it is.</span>
          </span>
        </label>
        {twins.length > 0 && (
          <label className={`${styles.choice} ${decision === "duplicate_qid" ? styles.choiceChecked : ""}`}>
            <input type="radio" name={radioName} checked={decision === "duplicate_qid"} onChange={() => setDecision("duplicate_qid")} />
            <span>
              <strong>A twin of another Wikidata item: mark as duplicate of</strong>{" "}
              <select aria-label="Twin Wikidata item" className={styles.control} style={{ minWidth: 0 }} value={twinQid} onChange={(e) => setTwinQid(e.target.value)}>
                {twins.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>{" "}
              {twinQid && (
                <a href={safeExternalUrl(wikidataUrl(twinQid))} {...ext} className={styles.link}>
                  Open ↗
                </a>
              )}
              <span className={styles.cellNote}>Wikidata sometimes has one item for the building and one for the institution. Keep one, drop the other.</span>
            </span>
          </label>
        )}
        <label className={`${styles.choice} ${decision === "new" ? styles.choiceChecked : ""}`}>
          <input type="radio" name={radioName} checked={decision === "new"} onChange={() => setDecision("new")} />
          <span>
            <strong>Not the same place: approve as a new museum.</strong>
            <span className={styles.cellNote}>It goes live as its own museum when you publish.</span>
          </span>
        </label>
      </fieldset>
      {needsRow && rowId === null && <p className={styles.errorText}>Pick the existing museum row first.</p>}
      {error && (
        <div className={`${styles.notice} ${styles.noticeWarning}`} role="alert">
          Not saved: {error}
        </div>
      )}

      <MergeRows candidate={candidate} suggestedId={match?.museum_id ?? null} onMerged={(msg) => onDone(null, msg)} />
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Staged museum table
// ---------------------------------------------------------------------------

function CandidateRow({
  c,
  busy,
  onDecide,
  onResolve,
}: {
  c: MuseumCandidate;
  busy: boolean;
  onDecide: (c: MuseumCandidate, d: "approve" | "reject") => void;
  onResolve: (c: MuseumCandidate) => void;
}) {
  const decided = isDecided(c.status);
  const coord = formatCoord(c.latitude, c.longitude);
  const name = displayName(c);
  const flagged = c.status === "needs_review";
  const changed = c.flags.includes(CONTENT_CHANGED_FLAG);
  const resolvable = c.is_duplicate_candidate && (c.status === "pending" || c.status === "needs_review" || c.status === "approved");

  return (
    <tr className={changed ? styles.rowChanged : flagged ? styles.rowFlagged : undefined}>
      <td>
        {changed && (
          <span className={`${styles.badge} ${styles.badgeRisk}`} style={{ marginBottom: 4 }}>
            Changed since approval
          </span>
        )}
        {changed && <br />}
        {c.name_en ? (
          <span lang="en" style={{ fontWeight: 600 }}>
            {c.name_en}
          </span>
        ) : (
          <span className={styles.muted}>No English name</span>
        )}
        {c.name_native && (
          <span className={styles.nameNative} lang={c.native_lang ?? undefined}>
            {c.native_lang ? `${c.native_lang}: ` : ""}
            {c.name_native}
          </span>
        )}
        <span className={styles.cellNote}>
          <a href={safeExternalUrl(wikidataUrl(c.qid))} {...ext} className={styles.link} aria-label={`${c.qid} on Wikidata`}>
            {c.qid} ↗
          </a>
          {c.website && (
            <>
              {" · "}
              <a href={safeExternalUrl(c.website)} {...ext} className={styles.link} aria-label={`Website of ${name}`}>
                Website ↗
              </a>
            </>
          )}
        </span>
      </td>
      <td>
        {KIND_LABEL[c.kind] ?? c.kind}
        {c.kind === "commercial_gallery" && (
          <span className={`${styles.badge} ${styles.badgeCommercial}`} style={{ marginTop: 4 }}>
            {COMMERCIAL_NOTE}
          </span>
        )}
        {c.types.length > 0 && <span className={styles.cellNote}>{c.types.slice(0, 2).join(", ")}</span>}
      </td>
      <td>
        {c.city ?? <span className={styles.muted}>No city</span>}
        {coord ? (
          <span className={styles.cellNote}>
            {coord}{" "}
            <a href={safeExternalUrl(osmUrl(c.latitude!, c.longitude!))} {...ext} className={styles.link} aria-label={`Open ${name} on OpenStreetMap`}>
              Map ↗
            </a>
          </span>
        ) : (
          <span className={styles.cellNote}>No coordinates</span>
        )}
      </td>
      <td>
        {c.display_mode === "location_only" ? (
          <span className={styles.muted}>No image (location only)</span>
        ) : c.image_license ? (
          <>
            <span className={`${styles.badge} ${styles.badgeOpen}`}>{licenseLabel(c.image_license)}</span>
            <span className={styles.cellNote}>{c.image_credit ? `Credit: ${c.image_credit}` : "No credit line"}</span>
            {c.image_source_url && (
              <span className={styles.cellNote}>
                <a href={safeExternalUrl(c.image_source_url)} {...ext} className={styles.link} aria-label={`Image source for ${name}`}>
                  Source ↗
                </a>
              </span>
            )}
          </>
        ) : (
          <>
            <span className={styles.muted}>No free image (the app shows a placeholder)</span>
            {c.image_license_raw && <span className={styles.cellNote}>Commons file is {c.image_license_raw}, not usable</span>}
          </>
        )}
      </td>
      <td>
        {c.flags.length === 0 && !c.match ? (
          <span className={styles.muted}>None</span>
        ) : (
          <ul className={styles.flagList}>
            {c.flags.map((f) => (
              <li key={f} className={styles.flagItem} style={f === CONTENT_CHANGED_FLAG ? { fontWeight: 700 } : undefined}>
                {flagLabel(f)}
              </li>
            ))}
            {c.match?.method === "name_geo" && (
              <li className={styles.muted}>
                Maybe #{c.match.museum_id} {c.match.name ?? ""}, {formatDistance(c.match.distance_m)}
              </li>
            )}
            {c.match?.method === "qid" && <li className={styles.muted}>Already in our table as #{c.match.museum_id}; publishing refreshes that row</li>}
          </ul>
        )}
      </td>
      <td>
        <StatusPill status={statusPillKey(c.status)} label={STATUS_LABEL[c.status] ?? c.status} />
        {c.promoted_museum_id && <span className={styles.cellNote}>Live as #{c.promoted_museum_id}</span>}
        {c.status === "approved" && !c.promoted_museum_id && <span className={styles.cellNote}>Not published yet</span>}
        {c.status === "duplicate_of" && (
          <span className={styles.cellNote}>Duplicate of {c.duplicate_of_museum_id ? `#${c.duplicate_of_museum_id}` : c.duplicate_of_qid}</span>
        )}
        {decided && c.reviewed_at && (
          <span className={styles.cellNote}>
            {formatDateTime(c.reviewed_at)}
            {c.reviewed_by ? ` by ${c.reviewed_by}` : ""}
          </span>
        )}
      </td>
      <td>
        <div className={styles.rowActions}>
          {resolvable && (
            <button
              type="button"
              className={`${decided ? styles.button : styles.buttonPrimary} ${styles.buttonSmall}`}
              disabled={busy}
              onClick={() => onResolve(c)}
              aria-label={`Resolve possible duplicate ${name}`}
            >
              Resolve duplicate…
            </button>
          )}
          {!decided && !c.is_duplicate_candidate && (
            <button type="button" className={`${styles.button} ${styles.buttonSmall}`} disabled={busy} onClick={() => onDecide(c, "approve")} aria-label={`Approve ${name}`}>
              Approve
            </button>
          )}
          {(!decided || (c.status === "approved" && !c.promoted_museum_id)) && (
            <button type="button" className={`${styles.buttonDanger} ${styles.buttonSmall}`} disabled={busy} onClick={() => onDecide(c, "reject")} aria-label={`Reject ${name}`}>
              Reject
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

const DEFAULT_FILTERS: CandidateFilters = { status: "undecided", kind: "", has_image: "", flag: "", q: "" };

function CountryDetail({ iso }: { iso: string }) {
  const { getIdToken } = useUser();
  const { showAlert, showConfirm } = useAlert();
  const [country, setCountry] = useState<Load<CountrySummary | null>>({ phase: "loading" });
  const [filters, setFilters] = useState<CandidateFilters>(DEFAULT_FILTERS);
  const [qInput, setQInput] = useState("");
  const [items, setItems] = useState<Load<{ items: MuseumCandidate[]; total: number }>>({ phase: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyQid, setBusyQid] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"batch" | "publish" | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [resolveFor, setResolveFor] = useState<MuseumCandidate | null>(null);
  const requestId = useRef(0);

  const loadCountry = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return setCountry({ phase: "error", kind: "forbidden", message: "No session token." });
    const res = await getCountry(token, iso);
    setCountry(res.ok ? { phase: "ready", data: res.data.country } : { phase: "error", kind: res.kind, message: res.message });
  }, [getIdToken, iso]);

  const loadItems = useCallback(async () => {
    const id = ++requestId.current;
    setItems({ phase: "loading" });
    const token = await getIdToken();
    if (!token) return setItems({ phase: "error", kind: "forbidden", message: "No session token." });
    const res = await listCandidates(token, iso, filters, PAGE_SIZE, 0);
    if (id !== requestId.current) return; // a newer filter won
    setItems(res.ok ? { phase: "ready", data: res.data } : { phase: "error", kind: res.kind, message: res.message });
  }, [getIdToken, iso, filters]);

  useEffect(() => {
    loadCountry();
  }, [loadCountry]);
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const loadMore = async () => {
    if (items.phase !== "ready") return;
    const id = requestId.current;
    setLoadingMore(true);
    const token = await getIdToken();
    const res = token ? await listCandidates(token, iso, filters, PAGE_SIZE, items.data.items.length) : null;
    setLoadingMore(false);
    if (id !== requestId.current) return;
    if (!res || !res.ok) return showAlert(`Could not load more: ${errorText(res)}`, "error");
    setItems({ phase: "ready", data: { items: [...items.data.items, ...res.data.items], total: res.data.total } });
  };

  const patchItem = (qid: string, r: DecisionResult) =>
    setItems((prev) =>
      prev.phase === "ready"
        ? {
            ...prev,
            data: {
              ...prev.data,
              items: prev.data.items.map((it) =>
                it.qid === qid
                  ? {
                      ...it,
                      status: r.status,
                      reviewed_at: new Date().toISOString(),
                      reviewed_by: "you",
                      duplicate_of_museum_id: r.status === "duplicate_of" ? r.museum_id : it.duplicate_of_museum_id,
                    }
                  : it
              ),
            },
          }
        : prev
    );

  const decide = async (c: MuseumCandidate, d: "approve" | "reject") => {
    const name = displayName(c);
    let note: string | undefined;
    if (d === "approve") {
      const where = c.kind === "commercial_gallery" ? " as a location only (no details in the app)" : "";
      const update = c.match?.method === "qid" ? ` It refreshes the existing museum #${c.match.museum_id} instead of adding a new one.` : "";
      if (!(await showConfirm(`Approve "${name}"? It goes live${where} when you publish.${update}`))) return;
    } else {
      const answer = await showConfirm(`Reject "${name}"? It stays out of the app and later imports will not bring it back. Reason (optional):`, true);
      if (answer === false) return;
      note = typeof answer === "string" ? answer : undefined;
    }
    setBusyQid(c.qid);
    const token = await getIdToken();
    const res = token ? await (d === "approve" ? approveCandidate(token, c.qid) : rejectCandidate(token, c.qid, note)) : null;
    setBusyQid(null);
    if (!res || !res.ok) return showAlert(`Could not ${d} "${name}": ${errorText(res)}`, "error");
    patchItem(c.qid, res.data);
    showAlert(`"${name}" ${d === "approve" ? "approved. It goes live when you publish" : "rejected"}.`, "success");
    loadCountry();
  };

  const runBatch = async (c: CountrySummary) => {
    setDialogBusy(true);
    const token = await getIdToken();
    const res = token ? await approveCountryBatch(token, iso, c.batch.approvable) : null;
    setDialogBusy(false);
    setDialog(null);
    if (!res || !res.ok) {
      showAlert(
        res && !res.ok && res.kind === "conflict"
          ? "The set changed since the page loaded, so nothing was approved. The page now shows the new numbers; check them and try again."
          : `Batch approval failed: ${errorText(res)}. Nothing was approved.`,
        res && !res.ok && res.kind === "conflict" ? "warning" : "error"
      );
    } else {
      showAlert(`Approved ${fmt(res.data.count)} museums in ${c.country_name}. Publish them (step 2) to make them visible in the app.`, "success");
    }
    loadCountry();
    loadItems();
  };

  const runPublish = async (c: CountrySummary) => {
    setDialogBusy(true);
    const token = await getIdToken();
    const res = token ? await promoteCountry(token, iso) : null;
    setDialogBusy(false);
    setDialog(null);
    if (!res || !res.ok) showAlert(`Publishing failed: ${errorText(res)}. Nothing was published.`, "error");
    else showAlert(`Published ${fmt(res.data.selected)} museums in ${c.country_name}: ${fmt(res.data.inserted)} new, ${fmt(res.data.updated)} refreshed.`, "success");
    loadCountry();
    loadItems();
  };

  const back = (
    <Link href="/admin/museums" className={styles.backLink}>
      ← All countries
    </Link>
  );
  if (country.phase === "loading") return <LoadingState />;
  if (country.phase === "error") {
    return (
      <>
        {back}
        <ErrorState kind={country.kind} message={country.message} onRetry={loadCountry} />
      </>
    );
  }
  if (!country.data) {
    return (
      <>
        {back}
        <div className={styles.state}>
          <div className={styles.stateTitle}>Nothing imported for {iso}</div>
          <p>No staged museums for this country yet.</p>
        </div>
      </>
    );
  }
  const c = country.data;
  const name = c.country_name;
  const showChipCounts = filters.status === "undecided";
  const setFilter = <K extends keyof CandidateFilters>(k: K, v: CandidateFilters[K]) => setFilters((prev) => ({ ...prev, [k]: v }));

  return (
    <>
      <div>
        {back}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>
              {name} <span className={styles.muted}>{c.country_iso}</span>
            </h1>
            <div className={styles.sourceMeta}>
              <span>
                <strong>Imported:</strong> {fmt(c.total)}
              </span>
              <span>
                <strong>Kinds:</strong> {fmt(c.kinds.museum)} museums, {fmt(c.kinds.art_gallery)} art galleries, {fmt(c.kinds.commercial_gallery)} commercial
              </span>
              <span>
                <strong>Already in our table:</strong> {fmt(c.counts.matched_existing)} (same Wikidata ID)
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className={styles.panel} aria-label={`${name} counts`}>
        <div className={styles.stats}>
          <Stat value={fmt(c.counts.undecided)} label="Pending" />
          <Stat value={fmt(c.counts.needs_review)} label="Needs review" alert={c.counts.needs_review > 0} />
          <Stat value={fmt(c.counts.duplicates)} label="Possible duplicates" alert={c.counts.duplicates > 0} />
          <Stat value={fmt(c.counts.approved)} label="Approved" />
          <Stat value={fmt(c.counts.promoted)} label="Live in the app" />
          <Stat value={fmt(c.counts.rejected)} label="Rejected" />
          <Stat value={fmt(c.counts.duplicate_of)} label="Marked duplicate" />
          <Stat value={percent(c.images.with_image, c.total)} label={`With an image (${fmt(c.images.with_image)})`} />
        </div>
      </section>

      <BatchPanel country={c} onOpen={() => setDialog("batch")} />
      <PublishPanel country={c} onOpen={() => setDialog("publish")} />
      <BatchDialog country={c} open={dialog === "batch"} busy={dialogBusy} onCancel={() => setDialog(null)} onConfirm={() => runBatch(c)} />
      <PublishDialog country={c} open={dialog === "publish"} busy={dialogBusy} onCancel={() => setDialog(null)} onConfirm={() => runPublish(c)} />

      <section className={styles.panel} aria-labelledby="staged-title">
        <div className={styles.panelHeader}>
          <h2 id="staged-title" className={styles.panelTitle}>
            Staged museums
          </h2>
          <ChipGroup
            label="Show"
            value={filters.flag}
            onChange={(v) => setFilter("flag", v)}
            options={[
              { key: "", label: "All" },
              { key: "flagged", label: "Needs review", count: showChipCounts ? c.counts.needs_review : undefined },
              { key: "duplicates", label: "Duplicate candidates" },
              { key: "closed", label: "Closed" },
              { key: "no_coords", label: "No coordinates" },
            ]}
          />
        </div>
        <form
          className={styles.filterBar}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("q", qInput);
          }}
        >
          <label className={styles.field}>
            Status
            <select className={styles.control} value={filters.status} onChange={(e) => setFilter("status", e.target.value as CandidateFilters["status"])}>
              <option value="undecided">Pending (not decided)</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="duplicate_of">Marked duplicate</option>
              <option value="all">All</option>
            </select>
          </label>
          <label className={styles.field}>
            Kind
            <select className={styles.control} value={filters.kind} onChange={(e) => setFilter("kind", e.target.value as MuseumKind | "")}>
              <option value="">All kinds</option>
              <option value="museum">Museum</option>
              <option value="art_gallery">Art gallery</option>
              <option value="commercial_gallery">Commercial gallery</option>
            </select>
          </label>
          <label className={styles.field}>
            Image
            <select className={styles.control} value={filters.has_image} onChange={(e) => setFilter("has_image", e.target.value as CandidateFilters["has_image"])}>
              <option value="">Any</option>
              <option value="yes">Has a free image</option>
              <option value="no">No image</option>
            </select>
          </label>
          <label className={styles.field}>
            Name or Wikidata ID
            <input type="search" className={`${styles.control} ${styles.controlWide}`} value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Uffizi or Q51252" />
          </label>
          <button type="submit" className={styles.button}>
            Search
          </button>
          {(filters.kind || filters.has_image || filters.flag || filters.q || filters.status !== "undecided") && (
            <button
              type="button"
              className={styles.buttonGhost}
              onClick={() => {
                setQInput("");
                setFilters(DEFAULT_FILTERS);
              }}
            >
              Clear filters
            </button>
          )}
        </form>

        {items.phase === "loading" && <LoadingState />}
        {items.phase === "error" && <ErrorState kind={items.kind} message={items.message} onRetry={loadItems} />}
        {items.phase === "ready" && items.data.items.length === 0 && <p className={styles.muted}>No museums match these filters.</p>}
        {items.phase === "ready" && items.data.items.length > 0 && (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>Staged museums in {name}</caption>
                <thead>
                  <tr>
                    <th scope="col">Name (English and native)</th>
                    <th scope="col">Kind</th>
                    <th scope="col">Location</th>
                    <th scope="col">Image</th>
                    <th scope="col">Flags</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className={styles.srOnly}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.data.items.map((it) => (
                    <CandidateRow key={it.qid} c={it} busy={busyQid === it.qid} onDecide={decide} onResolve={setResolveFor} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.tableFooter}>
              <span className={styles.muted}>
                Showing {fmt(items.data.items.length)} of {fmt(items.data.total)}
              </span>
              {items.data.items.length < items.data.total && (
                <button type="button" className={styles.button} onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : `Load ${PAGE_SIZE} more`}
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {resolveFor && (
        <ResolveDialog
          key={resolveFor.qid}
          candidate={resolveFor}
          onClose={() => setResolveFor(null)}
          onDone={(result, message) => {
            if (result) patchItem(resolveFor.qid, result);
            setResolveFor(null);
            showAlert(message, "success");
            loadCountry();
            if (!result) loadItems();
          }}
        />
      )}
    </>
  );
}

function CountryFromQuery() {
  const iso = useSearchParams().get("iso");
  if (!iso || !/^[A-Za-z]{2}$/.test(iso)) {
    return (
      <div className={styles.state}>
        <div className={styles.stateTitle}>No country selected</div>
        <p>
          <Link href="/admin/museums" className={styles.link}>
            Back to all countries
          </Link>
        </p>
      </div>
    );
  }
  return <CountryDetail iso={iso.toUpperCase()} />;
}

export default function MuseumCountryPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <AdminGate>
          <Suspense fallback={<LoadingState />}>
            <CountryFromQuery />
          </Suspense>
        </AdminGate>
      </main>
    </>
  );
}

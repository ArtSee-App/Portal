"use client";

import React, { useCallback, useEffect, useState } from "react";
import Header from "@/components/header/header";
import styles from "../admin.module.css";
import { useUser } from "@/context/UserContext";
import { useAlert } from "@/context/AlertContext";
import { AdminGate, ErrorState, LoadingState, Stat } from "@/components/admin/AdminKit";
import { apiRequest, ApiErrorKind } from "@/lib/api";
import { formatDateTime } from "@/lib/bots";

type Summary = {
  active_total: number;
  active_without_vectors: number;
  active_without_header: number;
  pending_queue: number;
  oldest_pending: string | null;
};

type Unindexed = {
  artwork_id: number;
  artist_id: number;
  title: string;
  artist_name: string;
  has_header_image: boolean;
  additional_images: number;
  scan_count: number | null;
};

type Health = { summary: Summary; unindexed: Unindexed[]; retry_available: boolean };
type RetryResult = { status: "indexed" | "partial"; vectors_stored: number; failed_images: unknown[] };

type Load = { phase: "loading" } | { phase: "error"; kind: ApiErrorKind; message: string } | { phase: "ready"; data: Health };

const PAGE_SIZE = 50;

function IndexingContent() {
  const { getIdToken } = useUser();
  const { showAlert, showConfirm } = useAlert();
  const [state, setState] = useState<Load>({ phase: "loading" });
  const [retrying, setRetrying] = useState<number | null>(null);
  const [done, setDone] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    const token = await getIdToken();
    if (!token) return setState({ phase: "error", kind: "forbidden", message: "No session token." });
    const res = await apiRequest<Health>("/admin/indexing/health", { admin_portal_token: token, limit: PAGE_SIZE });
    setState(res.ok ? { phase: "ready", data: res.data } : { phase: "error", kind: res.kind, message: res.message });
  }, [getIdToken]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = async (a: Unindexed) => {
    if (!(await showConfirm(`Re-index "${a.title}" (#${a.artwork_id})? This embeds its images and stores the vectors so scans can find it.`))) return;
    setRetrying(a.artwork_id);
    const token = await getIdToken();
    const res = token
      ? await apiRequest<RetryResult>("/admin/indexing/retry", { admin_portal_token: token, artwork_id: a.artwork_id }, { method: "POST" })
      : null;
    setRetrying(null);
    if (!res || !res.ok) {
      showAlert(res && !res.ok ? `Indexing failed: ${res.message}` : "No session.", "error");
      return;
    }
    const note = res.data.status === "partial" ? `Indexed (${res.data.failed_images.length} extra image(s) failed)` : `Indexed, ${res.data.vectors_stored} vectors`;
    setDone((prev) => ({ ...prev, [a.artwork_id]: note }));
    showAlert(`"${a.title}" is searchable again.`, "success");
  };

  if (state.phase === "loading") return <LoadingState />;
  if (state.phase === "error") return <ErrorState kind={state.kind} message={state.message} onRetry={load} />;
  const { summary: s, unindexed, retry_available } = state.data;

  return (
    <>
      {!retry_available && (
        <div className={`${styles.notice} ${styles.noticeInfo}`}>
          <div className={styles.noticeTitle}>Retry not available yet</div>
          Re-indexing from here needs the indexing fix deployed on the API. Until then this page is read-only; the backfill
          script that ships with that fix indexes these artworks in bulk.
        </div>
      )}
      <section className={styles.panel}>
        <div className={styles.stats}>
          <Stat value={s.active_total ?? 0} label="Live artworks" />
          <Stat value={s.active_without_vectors ?? 0} label="Live, not searchable" alert={(s.active_without_vectors ?? 0) > 0} />
          <Stat value={s.active_without_header ?? 0} label="Live, no image" alert={(s.active_without_header ?? 0) > 0} />
          <Stat value={s.pending_queue ?? 0} label="Pending review" />
          <Stat value={s.oldest_pending ? formatDateTime(s.oldest_pending) : "—"} label="Oldest pending" />
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Live artworks without vectors</h2>
          <button type="button" className={styles.button} onClick={load}>
            Refresh
          </button>
        </div>
        {unindexed.length === 0 ? (
          <p className={styles.muted}>Every live artwork is searchable.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Artwork</th>
                  <th>Artist</th>
                  <th className={styles.num}>Extra images</th>
                  <th className={styles.num}>Scans</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {unindexed.map((a) => (
                  <tr key={a.artwork_id}>
                    <td>
                      {a.title} <span className={styles.muted}>#{a.artwork_id}</span>
                      {!a.has_header_image && <div className={styles.errorText}>No header image: re-upload needed</div>}
                    </td>
                    <td>{a.artist_name}</td>
                    <td className={styles.num}>{a.additional_images}</td>
                    <td className={styles.num}>{a.scan_count ?? 0}</td>
                    <td className={styles.num}>
                      {done[a.artwork_id] ? (
                        <span className={styles.muted}>{done[a.artwork_id]}</span>
                      ) : (
                        <button
                          type="button"
                          className={styles.button}
                          disabled={!retry_available || !a.has_header_image || retrying !== null}
                          onClick={() => retry(a)}
                        >
                          {retrying === a.artwork_id ? "Indexing…" : "Retry"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {unindexed.length === PAGE_SIZE && <p className={styles.muted} style={{ marginTop: 10 }}>Showing the newest {PAGE_SIZE}.</p>}
          </div>
        )}
      </section>
    </>
  );
}

export default function IndexingPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Indexing health</h1>
            <p className={styles.subtitle}>
              Live artworks that the scanner cannot find because they have no feature vectors (for example approvals made while indexing was
              broken). Retry re-embeds one artwork and stores its vectors.
            </p>
          </div>
        </div>
        <AdminGate>
          <IndexingContent />
        </AdminGate>
      </main>
    </>
  );
}

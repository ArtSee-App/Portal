"use client";

// Museum lookup. Replaces the old mock edit form (it never called an API and showed fake
// "saved" messages). Admins search the live museum list and open one museum read-only;
// country import review lives in /admin/museums and an artwork's museum is set in the
// artwork form. Museum accounts get an honest "not available yet" message.

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Header from "@/components/header/header";
import styles from "../admin/admin.module.css";
import { useUser } from "@/context/UserContext";
import { ErrorState, LoadingState } from "@/components/admin/AdminKit";
import { safeExternalUrl } from "@/lib/bots";
import {
  COMMERCIAL_NOTE,
  formatCoord,
  getMuseum,
  KIND_LABEL,
  licenseLabel,
  MuseumDetail,
  MuseumOption,
  osmUrl,
  searchMuseums,
  wikidataUrl,
} from "@/lib/museums";
import type { ApiErrorKind } from "@/lib/api";

type Load<T> = { phase: "idle" } | { phase: "loading" } | { phase: "error"; kind: ApiErrorKind; message: string } | { phase: "ready"; data: T };

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

function MuseumSearch() {
  const { getIdToken } = useUser();
  const [q, setQ] = useState("");
  const [state, setState] = useState<Load<MuseumOption[]>>({ phase: "idle" });

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setState({ phase: "loading" });
    const token = await getIdToken();
    if (!token) return setState({ phase: "error", kind: "forbidden", message: "No session token." });
    const res = await searchMuseums(token, q, 50);
    setState(res.ok ? { phase: "ready", data: res.data?.museums ?? [] } : { phase: "error", kind: res.kind, message: res.message });
  };

  return (
    <section className={styles.panel} aria-labelledby="search-title">
      <h2 id="search-title" className={styles.panelTitle} style={{ marginBottom: 12 }}>
        Find a museum
      </h2>
      <form className={styles.filterBar} role="search" onSubmit={run}>
        <label className={styles.field}>
          English or native name
          <input type="search" className={`${styles.control} ${styles.controlWide}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rijksmuseum" />
        </label>
        <button type="submit" className={styles.button} disabled={q.trim().length < 2}>
          Search
        </button>
      </form>
      {state.phase === "loading" && <LoadingState />}
      {state.phase === "error" && <ErrorState kind={state.kind} message={state.message} />}
      {state.phase === "ready" && state.data.length === 0 && <p className={styles.muted}>No museum matches.</p>}
      {state.phase === "ready" && state.data.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Museums matching the search</caption>
            <thead>
              <tr>
                <th scope="col">Museum</th>
                <th scope="col">Kind</th>
                <th scope="col">City</th>
                <th scope="col" className={styles.num}>
                  Artworks
                </th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((m) => (
                <tr key={m.museum_id}>
                  <td>
                    <Link href={`/museum?id=${m.museum_id}`} className={styles.link}>
                      {m.name}
                    </Link>{" "}
                    <span className={styles.muted}>#{m.museum_id}</span>
                    {m.name_native && m.name_native !== m.name && <span className={styles.nameNative}>{m.name_native}</span>}
                  </td>
                  <td>{m.kind ? KIND_LABEL[m.kind] ?? m.kind : <span className={styles.muted}>Not set</span>}</td>
                  <td>{[m.city, m.country].filter(Boolean).join(", ") || <span className={styles.muted}>Unknown</span>}</td>
                  <td className={styles.num}>{m.artwork_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.ruleItem}>
      <strong>{label}</strong>
      {children}
    </div>
  );
}

function MuseumView({ id }: { id: number }) {
  const { getIdToken } = useUser();
  const [state, setState] = useState<Load<MuseumDetail>>({ phase: "loading" });

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    const token = await getIdToken();
    if (!token) return setState({ phase: "error", kind: "forbidden", message: "No session token." });
    const res = await getMuseum(token, id);
    if (!res.ok) return setState({ phase: "error", kind: res.kind, message: res.message });
    setState(res.data.museum ? { phase: "ready", data: res.data.museum } : { phase: "error", kind: "server", message: `The API returned no museum #${id}.` });
  }, [getIdToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.phase === "loading" || state.phase === "idle") return <LoadingState />;
  if (state.phase === "error") return <ErrorState kind={state.kind} message={state.message} onRetry={load} />;
  const m = state.data;
  const coord = formatCoord(m.latitude, m.longitude);

  return (
    <section className={styles.panel} aria-labelledby="museum-title">
      <h2 id="museum-title" className={styles.title} style={{ fontSize: "1.3rem" }}>
        {m.name} <span className={styles.muted}>#{m.museum_id}</span>
      </h2>
      {m.name_native && m.name_native !== m.name && <p className={styles.subtitle}>{m.name_native}</p>}
      {m.merged_into_museum_id && (
        <div className={`${styles.notice} ${styles.noticeWarning}`} style={{ marginTop: 12 }}>
          This row was merged into{" "}
          <Link href={`/museum?id=${m.merged_into_museum_id}`} className={styles.link}>
            #{m.merged_into_museum_id}
          </Link>
          . The app answers the old id with that museum.
        </div>
      )}
      <div className={styles.ruleBox} style={{ marginTop: 16 }}>
        <Fact label="Kind">
          {m.kind ? KIND_LABEL[m.kind] ?? m.kind : "Not set"}
          {(m.kind === "commercial_gallery" || m.display_mode === "location_only") && <span className={styles.cellNote}>{COMMERCIAL_NOTE}</span>}
          {m.is_closed && <span className={styles.cellNote}>Closed</span>}
        </Fact>
        <Fact label="Place">
          {[m.city, m.country].filter(Boolean).join(", ") || "Unknown"}
          {coord ? (
            <span className={styles.cellNote}>
              {coord}{" "}
              <a href={safeExternalUrl(osmUrl(m.latitude!, m.longitude!))} {...ext} className={styles.link}>
                Map ↗
              </a>
            </span>
          ) : (
            <span className={styles.cellNote}>No coordinates</span>
          )}
        </Fact>
        <Fact label="Artworks">{m.artwork_count === null ? "Not reported" : `${m.artwork_count} linked`}</Fact>
        <Fact label="Links">
          {m.wikidata_qid && (
            <span className={styles.cellNote}>
              <a href={safeExternalUrl(wikidataUrl(m.wikidata_qid))} {...ext} className={styles.link}>
                {m.wikidata_qid} on Wikidata ↗
              </a>
            </span>
          )}
          {m.website_link && (
            <span className={styles.cellNote}>
              <a href={safeExternalUrl(m.website_link)} {...ext} className={styles.link}>
                Website ↗
              </a>
            </span>
          )}
          {m.wikipedia_link && (
            <span className={styles.cellNote}>
              <a href={safeExternalUrl(m.wikipedia_link)} {...ext} className={styles.link}>
                Wikipedia ↗
              </a>
            </span>
          )}
          {!m.wikidata_qid && !m.website_link && !m.wikipedia_link && <span className={styles.muted}>None</span>}
        </Fact>
        <Fact label="Image">
          {m.display_mode === "location_only" ? (
            "None: location only"
          ) : m.image_license ? (
            <>
              {licenseLabel(m.image_license)}
              {m.image_credit && <span className={styles.cellNote}>Credit: {m.image_credit}</span>}
              {m.image_source_url && (
                <span className={styles.cellNote}>
                  <a href={safeExternalUrl(m.image_source_url)} {...ext} className={styles.link}>
                    Source ↗
                  </a>
                </span>
              )}
            </>
          ) : (
            "No image (the app shows a placeholder)"
          )}
        </Fact>
        <Fact label="Data source">{m.source ?? "Not recorded"}</Fact>
      </div>
    </section>
  );
}

function MuseumPageContent() {
  const { user, isLoadingUser } = useUser();
  const idParam = useSearchParams().get("id");
  const id = idParam && /^\d+$/.test(idParam) ? Number(idParam) : null;

  if (isLoadingUser) return <LoadingState />;

  if (user?.type !== "admin") {
    return (
      <>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>Museum profile</h1>
        </div>
        <div className={styles.state}>
          <div className={styles.stateTitle}>Not available yet</div>
          <p>
            Editing a museum profile from the Portal is not available yet. Museum details come from public sources and are reviewed by the
            ArtVista team; if something about your museum is wrong, please contact us.
          </p>
          <p style={{ marginTop: 12 }}>
            <Link href="/home" className={styles.link}>
              Back to home
            </Link>
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        {id !== null && (
          <Link href="/museum" className={styles.backLink}>
            ← Find another museum
          </Link>
        )}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Museum lookup</h1>
            <p className={styles.subtitle}>
              Read-only view of the live museum list. New museums come in through{" "}
              <Link href="/admin/museums" className={styles.link}>
                country review
              </Link>
              ; an artwork&apos;s museum is set in the artwork form.
            </p>
          </div>
        </div>
      </div>
      {id !== null ? <MuseumView id={id} /> : <MuseumSearch />}
    </>
  );
}

export default function MuseumPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <Suspense fallback={<LoadingState />}>
          <MuseumPageContent />
        </Suspense>
      </main>
    </>
  );
}

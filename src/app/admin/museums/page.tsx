"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/header/header";
import styles from "../admin.module.css";
import { useUser } from "@/context/UserContext";
import { AdminGate, ErrorState, LoadingState, Stat } from "@/components/admin/AdminKit";
import { countryName, CountrySummary, fmt, listCountries, percent } from "@/lib/museums";
import type { ApiErrorKind } from "@/lib/api";

type Load = { phase: "loading" } | { phase: "error"; kind: ApiErrorKind; message: string } | { phase: "ready"; countries: CountrySummary[] };

type SortKey = "pending" | "name" | "total";

function HowItWorks() {
  return (
    <section className={styles.panel} aria-labelledby="how-title">
      <h2 id="how-title" className={styles.panelTitle} style={{ marginBottom: 14 }}>
        How country review works
      </h2>
      <ol className={styles.steps}>
        <li>
          <strong>Everything starts as pending</strong>
          The import copies every art museum and gallery of a country from Wikidata into a waiting list. The app shows none of them yet.
        </li>
        <li>
          <strong>Look at the flagged ones yourself</strong>
          A few are flagged: maybe the same place as a museum we already have, a Wikidata twin, closed, or no map position. Open the country and
          approve, reject or resolve those one by one.
        </li>
        <li>
          <strong>Approve the rest in one click</strong>
          The button reads like &quot;Approve all 1,820 in Italy except the 34 flagged&quot;. Flagged ones are never part of it; they stay pending
          until you decide.
        </li>
        <li>
          <strong>Publish to the app</strong>
          Approving does not change the app yet. Press Publish on the country page and the approved museums go live on the map and in museum
          search.
        </li>
      </ol>
    </section>
  );
}

function Kinds({ c }: { c: CountrySummary }) {
  const parts: [number, string][] = [
    [c.kinds.museum, "museums"],
    [c.kinds.art_gallery, "art galleries"],
    [c.kinds.commercial_gallery, "commercial"],
  ];
  return (
    <div className={styles.kindList}>
      {parts.map(([n, label]) => (
        <div key={label} className={n ? undefined : styles.zero}>
          {fmt(n)} {label}
        </div>
      ))}
    </div>
  );
}

function Coverage({ part, whole }: { part: number; whole: number }) {
  const pct = whole ? Math.min(100, (part / whole) * 100) : 0;
  return (
    <div className={styles.coverage} title={`${fmt(part)} of ${fmt(whole)} have a public-domain or CC0 image`}>
      <div className={styles.coverageBar} aria-hidden="true">
        <div className={styles.coverageFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.num}>
        {percent(part, whole)}
        <span className={styles.srOnly}> ({fmt(part)} of {fmt(whole)} with an image)</span>
      </span>
    </div>
  );
}

function CountryTable({ countries }: { countries: CountrySummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("pending");
  const [onlyPending, setOnlyPending] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = countries.filter((c) => {
      if (onlyPending && !c.counts.undecided && !c.counts.awaiting_promotion) return false;
      if (!q) return true;
      return countryName(c.country_iso, c.country_name).toLowerCase().includes(q) || c.country_iso.toLowerCase() === q;
    });
    return list.sort((a, b) => {
      if (sort === "name") return countryName(a.country_iso, a.country_name).localeCompare(countryName(b.country_iso, b.country_name));
      if (sort === "total") return b.total - a.total;
      return b.counts.undecided - a.counts.undecided || b.total - a.total;
    });
  }, [countries, query, sort, onlyPending]);

  return (
    <section className={styles.panel} aria-labelledby="countries-title">
      <div className={styles.panelHeader}>
        <h2 id="countries-title" className={styles.panelTitle}>
          Countries
        </h2>
      </div>
      <div className={styles.filterBar}>
        <label className={styles.field}>
          Find a country
          <input type="search" className={styles.control} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Italy or IT" />
        </label>
        <label className={styles.field}>
          Sort by
          <select className={styles.control} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="pending">Most undecided first</option>
            <option value="total">Most museums first</option>
            <option value="name">Name</option>
          </select>
        </label>
        <label className={styles.choice} style={{ padding: "7px 10px" }}>
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
          Only countries with work left
        </label>
      </div>
      {rows.length === 0 ? (
        <p className={styles.muted}>No country matches.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.tableCompact}`}>
            <caption className={styles.srOnly}>Imported museums per country, with review counts, kinds and image coverage</caption>
            <thead>
              <tr>
                <th scope="col">Country</th>
                <th scope="col" className={styles.num} title="Not decided yet (routine plus flagged)">
                  Pending
                </th>
                <th scope="col" className={styles.num} title="Pending and not flagged: what the one-click approval would include">
                  Ready for batch
                </th>
                <th scope="col" className={styles.num}>
                  Needs review
                </th>
                <th scope="col" className={styles.num}>
                  Duplicates
                </th>
                <th scope="col" className={styles.num}>
                  Approved
                </th>
                <th scope="col" className={styles.num}>
                  Rejected
                </th>
                <th scope="col">Kinds</th>
                <th scope="col">Image coverage</th>
                <th scope="col">
                  <span className={styles.srOnly}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const name = countryName(c.country_iso, c.country_name);
                return (
                  <tr key={c.country_iso}>
                    <th scope="row" className={styles.rowHeader}>
                      <Link href={`/admin/museums/country?iso=${encodeURIComponent(c.country_iso)}`} className={styles.link}>
                        {name}
                      </Link>{" "}
                      <span className={styles.muted}>{c.country_iso}</span>
                      <span className={styles.cellNote}>{fmt(c.total)} imported</span>
                    </th>
                    <td className={`${styles.num} ${c.counts.undecided ? "" : styles.zero}`}>{fmt(c.counts.undecided)}</td>
                    <td className={`${styles.num} ${c.batch.approvable ? "" : styles.zero}`}>{fmt(c.batch.approvable)}</td>
                    <td className={`${styles.num} ${c.counts.needs_review ? "" : styles.zero}`}>{fmt(c.counts.needs_review)}</td>
                    <td className={`${styles.num} ${c.counts.duplicates ? "" : styles.zero}`}>{fmt(c.counts.duplicates)}</td>
                    <td className={`${styles.num} ${c.counts.approved ? "" : styles.zero}`}>
                      {fmt(c.counts.approved)}
                      {c.counts.approved > 0 && (
                        <span className={styles.cellNote}>
                          {fmt(c.counts.promoted)} live
                          {c.counts.awaiting_promotion > 0 && `, ${fmt(c.counts.awaiting_promotion)} to publish`}
                        </span>
                      )}
                    </td>
                    <td className={`${styles.num} ${c.counts.rejected ? "" : styles.zero}`}>{fmt(c.counts.rejected)}</td>
                    <td>
                      <Kinds c={c} />
                    </td>
                    <td>
                      <Coverage part={c.images.with_image} whole={c.total} />
                    </td>
                    <td className={styles.num}>
                      <Link href={`/admin/museums/country?iso=${encodeURIComponent(c.country_iso)}`} className={`${styles.buttonGhost} ${styles.buttonSmall}`} aria-label={`Review ${name}`}>
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MuseumsContent() {
  const { getIdToken } = useUser();
  const [state, setState] = useState<Load>({ phase: "loading" });

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    const token = await getIdToken();
    if (!token) return setState({ phase: "error", kind: "forbidden", message: "No session token." });
    const res = await listCountries(token);
    setState(res.ok ? { phase: "ready", countries: res.data?.countries ?? [] } : { phase: "error", kind: res.kind, message: res.message });
  }, [getIdToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.phase === "loading") return <LoadingState />;
  if (state.phase === "error") return <ErrorState kind={state.kind} message={state.message} onRetry={load} />;
  if (state.countries.length === 0) {
    return (
      <div className={styles.state}>
        <div className={styles.stateTitle}>No museums imported yet</div>
        <p>Run the wikidata_museums connector for a country first. Its museums will show up here, grouped by country, waiting for review.</p>
      </div>
    );
  }

  const sum = (f: (c: CountrySummary) => number) => state.countries.reduce((acc, c) => acc + f(c), 0);
  const total = sum((c) => c.total);

  return (
    <>
      <section className={styles.panel} aria-label="Totals across all countries">
        <div className={styles.stats}>
          <Stat value={fmt(state.countries.length)} label="Countries" />
          <Stat value={fmt(total)} label="Imported" />
          <Stat value={fmt(sum((c) => c.counts.undecided))} label="Pending" />
          <Stat value={fmt(sum((c) => c.counts.needs_review))} label="Needs review" />
          <Stat value={fmt(sum((c) => c.counts.duplicates))} label="Possible duplicates" />
          <Stat value={fmt(sum((c) => c.counts.approved))} label="Approved" />
          <Stat value={fmt(sum((c) => c.counts.awaiting_promotion))} label="Approved, not published" alert={sum((c) => c.counts.awaiting_promotion) > 0} />
          <Stat value={fmt(sum((c) => c.counts.rejected))} label="Rejected" />
          <Stat value={percent(sum((c) => c.images.with_image), total)} label="With an image" />
        </div>
      </section>
      <CountryTable countries={state.countries} />
    </>
  );
}

export default function MuseumsPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Museums</h1>
            <p className={styles.subtitle}>
              European museums and galleries imported from Wikidata, reviewed one country at a time. Nothing here is visible in the app until you
              approve it.
            </p>
          </div>
        </div>
        <AdminGate>
          <HowItWorks />
          <MuseumsContent />
        </AdminGate>
      </main>
    </>
  );
}

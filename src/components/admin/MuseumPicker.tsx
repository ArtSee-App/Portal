"use client";

import React, { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import formStyles from "@/app/artwork/page.module.css";
import styles from "./MuseumPicker.module.css";
import { useUser } from "@/context/UserContext";
import {
  ArtworkMuseumLink,
  COMMERCIAL_NOTE,
  getArtworkMuseum,
  KIND_LABEL,
  MuseumOption,
  searchMuseums,
  setArtworkMuseum,
} from "@/lib/museums";
import type { ApiErrorKind } from "@/lib/api";

type Choice = { status: "linked"; museum: MuseumOption } | { status: "private" } | { status: "unknown" } | { status: "none" };
type Mode = "linked" | "private" | "unknown";

export type MuseumPickerHandle = {
  /** True when the admin changed the museum and has not saved it. */
  isDirty: () => boolean;
  /** Human text of the current choice, for confirm messages. */
  describe: () => string;
  /** Saves the current choice. Resolves false (and shows the error inline) when it fails. */
  save: () => Promise<boolean>;
};

const keyOf = (c: Choice) => (c.status === "linked" ? `linked:${c.museum.museum_id}` : c.status);

function describeChoice(c: Choice): string {
  if (c.status === "linked") return `${c.museum.name} (#${c.museum.museum_id})`;
  if (c.status === "private") return "Private collection";
  if (c.status === "unknown") return "Unknown";
  return "Not set";
}

function fromLink(link: ArtworkMuseumLink): Choice {
  if (link.museum_id !== null && link.museum_id !== undefined) {
    const fallback: MuseumOption = {
      museum_id: link.museum_id,
      name: `Museum #${link.museum_id}`,
      name_native: null,
      city: null,
      country: null,
      country_iso: null,
      kind: null,
      display_mode: null,
      artwork_count: null,
      wikidata_qid: null,
    };
    return { status: "linked", museum: link.museum ?? fallback };
  }
  if (link.museum_link_status === "private") return { status: "private" };
  if (link.museum_link_status === "unknown") return { status: "unknown" };
  return { status: "none" };
}

function OptionText({ m }: { m: MuseumOption }) {
  const where = [m.city, m.country].filter(Boolean).join(", ");
  return (
    <>
      <span className={styles.optionName} lang="en">
        {m.name}
      </span>
      {m.name_native && m.name_native !== m.name && <span className={styles.optionNative}>{m.name_native}</span>}
      <span className={styles.optionMeta}>
        {[where, `#${m.museum_id}`, m.artwork_count !== null && m.artwork_count !== undefined ? `${m.artwork_count} artworks` : ""].filter(Boolean).join(" · ")}
        {m.kind && m.kind !== "museum" && ` · ${KIND_LABEL[m.kind] ?? m.kind}`}
      </span>
      {m.kind === "commercial_gallery" && <span className={styles.commercial}>{COMMERCIAL_NOTE}</span>}
    </>
  );
}

type Props = {
  artworkId: number;
  isPending: boolean;
  /** museum_id from the artwork details, shown when the link endpoint is not deployed. */
  fallbackMuseumId?: string;
  /** The page saves an unsaved choice before approving (pending artworks). */
  savesOnApprove?: boolean;
};

const MuseumPicker = forwardRef<MuseumPickerHandle, Props>(function MuseumPicker({ artworkId, isPending, fallbackMuseumId, savesOnApprove }, ref) {
  const { getIdToken } = useUser();
  const uid = useId();
  const listId = `${uid}-list`;
  const inputId = `${uid}-input`;
  const statusId = `${uid}-status`;

  const [load, setLoad] = useState<{ phase: "loading" } | { phase: "error"; kind: ApiErrorKind; message: string } | { phase: "ready"; link: ArtworkMuseumLink }>({
    phase: "loading",
  });
  const [saved, setSaved] = useState<Choice>({ status: "none" });
  const [choice, setChoice] = useState<Choice>({ status: "none" });
  const [mode, setMode] = useState<Mode>("linked");
  const [lastMuseum, setLastMuseum] = useState<MuseumOption | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MuseumOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchId = useRef(0);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const loadLink = useCallback(async () => {
    setLoad({ phase: "loading" });
    const token = await getIdToken();
    if (!token) return setLoad({ phase: "error", kind: "forbidden", message: "No session token." });
    const res = await getArtworkMuseum(token, artworkId, isPending);
    if (!res.ok) return setLoad({ phase: "error", kind: res.kind, message: res.message });
    const c = fromLink(res.data);
    setSaved(c);
    setChoice(c);
    setMode(c.status === "private" || c.status === "unknown" ? c.status : "linked");
    if (c.status === "linked") setLastMuseum(c.museum);
    setLoad({ phase: "ready", link: res.data });
  }, [getIdToken, artworkId, isPending]);

  useEffect(() => {
    loadLink();
  }, [loadLink]);

  // Debounced search on English and native names (the server matches both).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    const id = ++searchId.current;
    setSearching(true);
    const t = setTimeout(async () => {
      const token = await getIdToken();
      const res = token ? await searchMuseums(token, q, 20) : null;
      if (id !== searchId.current) return;
      setSearching(false);
      if (!res || !res.ok) {
        setResults([]);
        setSearchError(res && !res.ok ? (res.kind === "not_deployed" ? "Museum search is not deployed on the API yet." : res.message) : "No session.");
        return;
      }
      setSearchError(null);
      setResults(res.data?.museums ?? []);
      setActive(-1);
    }, 250);
    return () => clearTimeout(t);
  }, [query, getIdToken]);

  const pickMode = (m: Mode) => {
    setMode(m);
    setJustSaved(false);
    if (m === "linked") setChoice(lastMuseum ? { status: "linked", museum: lastMuseum } : { status: "none" });
    else setChoice({ status: m });
  };

  const select = (m: MuseumOption) => {
    setLastMuseum(m);
    setChoice({ status: "linked", museum: m });
    setQuery("");
    setResults([]);
    setOpen(false);
    setActive(-1);
    setJustSaved(false);
  };

  const dirty = keyOf(choice) !== keyOf(saved);
  const complete = choice.status !== "none";

  const save = useCallback(async (): Promise<boolean> => {
    if (choice.status === "none") {
      setSaveError("Pick a museum from the list, or choose Private collection or Unknown.");
      return false;
    }
    setSaving(true);
    setSaveError(null);
    const token = await getIdToken();
    const res = token
      ? await setArtworkMuseum(
          token,
          artworkId,
          isPending,
          choice.status === "linked" ? { status: "linked", museumId: choice.museum.museum_id } : { status: choice.status }
        )
      : null;
    setSaving(false);
    if (!res || !res.ok) {
      setSaveError(res && !res.ok ? res.message : "No session.");
      return false;
    }
    const next = res.data ? fromLink(res.data) : choice;
    // Keep the richer option we picked if the server only echoes the id.
    const merged = next.status === "linked" && choice.status === "linked" && next.museum.museum_id === choice.museum.museum_id ? choice : next;
    setSaved(merged);
    setChoice(merged);
    setJustSaved(true);
    return true;
  }, [choice, getIdToken, artworkId, isPending]);

  useImperativeHandle(ref, () => ({ isDirty: () => dirty && complete, describe: () => describeChoice(choice), save }), [dirty, complete, choice, save]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      // Never submit the artwork form from this field.
      e.preventDefault();
      if (open && active >= 0 && results[active]) select(results[active]);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    }
  };

  if (load.phase === "loading") {
    return (
      <div className={formStyles.inputWrapper}>
        <p>Museum</p>
        <div className={styles.note}>Loading the artwork&apos;s museum…</div>
      </div>
    );
  }

  if (load.phase === "error") {
    return (
      <div className={formStyles.inputWrapper}>
        <p>Museum</p>
        <div className={styles.unavailable} role="status">
          <strong>{load.kind === "not_deployed" ? "Museum linking is not deployed on the API yet." : "Could not load the artwork's museum."}</strong>{" "}
          {load.kind === "not_deployed" ? "Once it is, you can pick the museum here." : load.message}
          {fallbackMuseumId ? ` The artwork record currently points to museum #${fallbackMuseumId}.` : " The artwork record has no museum."}{" "}
          <button type="button" className={styles.linkButton} onClick={loadLink}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const locationText = load.link.location_text?.trim();
  const showList = open && query.trim().length >= 2;

  return (
    <div className={formStyles.inputWrapper}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Museum (where the artwork is held)</legend>
        <div className={styles.modes} role="radiogroup" aria-label="Where the artwork is held">
          {(
            [
              ["linked", "A museum"],
              ["private", "Private collection"],
              ["unknown", "Unknown"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <label key={m} className={`${styles.mode} ${mode === m ? styles.modeActive : ""}`}>
              <input type="radio" name={`${uid}-mode`} value={m} checked={mode === m} onChange={() => pickMode(m)} />
              {label}
            </label>
          ))}
        </div>

        {mode === "linked" && (
          <>
            {choice.status === "linked" ? (
              <div className={styles.selected}>
                <div>
                  <OptionText m={choice.museum} />
                </div>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => {
                    setChoice({ status: "none" });
                    setJustSaved(false);
                    setTimeout(() => document.getElementById(inputId)?.focus(), 0);
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className={styles.combo}>
                <label htmlFor={inputId} className={styles.srOnly}>
                  Search museums by English or native name
                </label>
                <input
                  id={inputId}
                  type="text"
                  role="combobox"
                  aria-expanded={showList}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
                  aria-describedby={statusId}
                  autoComplete="off"
                  className={formStyles.input}
                  placeholder="Search by English or native name, e.g. Uffizi"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  onBlur={() => setTimeout(() => setOpen(false), 150)}
                  onKeyDown={onKeyDown}
                />
                {showList && (
                  <ul id={listId} role="listbox" className={styles.list} aria-label="Museums">
                    {results.map((m, i) => (
                      <li
                        key={m.museum_id}
                        id={`${listId}-${i}`}
                        role="option"
                        aria-selected={i === active}
                        className={`${styles.option} ${i === active ? styles.optionActive : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => select(m)}
                        onMouseEnter={() => setActive(i)}
                      >
                        <OptionText m={m} />
                      </li>
                    ))}
                    {!searching && results.length === 0 && !searchError && (
                      <li className={styles.optionEmpty} role="presentation">
                        No museum matches. Try the native name, or choose Unknown.
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}
            <div id={statusId} className={styles.note} aria-live="polite">
              {searching ? "Searching…" : searchError ?? (choice.status === "none" && query.trim().length < 2 ? "Type at least 2 letters." : "")}
            </div>
            {locationText && choice.status !== "linked" && (
              <div className={styles.note}>
                The source says: <q>{locationText}</q>{" "}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => {
                    setQuery(locationText.split(",")[0].trim());
                    setOpen(true);
                    document.getElementById(inputId)?.focus();
                  }}
                >
                  Search for it
                </button>
              </div>
            )}
          </>
        )}

        {mode === "private" && (
          <div className={styles.note}>The app says &quot;Private collection&quot;. No museum is linked, and no fake museum row is created.</div>
        )}
        {mode === "unknown" && <div className={styles.note}>We don&apos;t know where it is. No museum is linked.</div>}

        <div className={styles.saveRow}>
          <button type="button" className={styles.saveButton} onClick={save} disabled={saving || !dirty || !complete}>
            {saving ? "Saving…" : "Save museum"}
          </button>
          <span className={styles.note} aria-live="polite">
            {saveError ? (
              <span className={styles.error}>Not saved: {saveError}</span>
            ) : dirty ? (
              complete ? `Unsaved change.${savesOnApprove ? " Approving the artwork saves it too." : ""}` : ""
            ) : (
              `${justSaved ? "Saved" : "Currently"}: ${describeChoice(saved)}.`
            )}
          </span>
        </div>
      </fieldset>
    </div>
  );
});

export default MuseumPicker;

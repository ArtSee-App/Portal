"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import Header from "@/components/header/header";
import styles from "../admin.module.css";
import { useUser } from "@/context/UserContext";
import { useAlert } from "@/context/AlertContext";
import { AdminGate, ErrorState, LoadingState, Modal } from "@/components/admin/AdminKit";
import { formatDateTime, safeExternalUrl } from "@/lib/bots";
import { fieldErrors } from "@/lib/api";
import type { ApiErrorKind } from "@/lib/api";
import { BODY_MAX, createNews, deleteNews, listNews, NewsInput, NewsItem, TITLE_MAX, updateNews, validateNews } from "@/lib/news";

type Load = { phase: "loading" } | { phase: "error"; kind: ApiErrorKind; message: string } | { phase: "ready"; items: NewsItem[] };

const preview = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

function NewsDialog({ item, onClose, onSaved }: { item: NewsItem | null; onClose: () => void; onSaved: (saved: NewsItem, created: boolean) => void }) {
  const { getIdToken } = useUser();
  const [form, setForm] = useState<NewsInput>({ title: item?.title ?? "", body: item?.body ?? "", image: item?.image ?? "" });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // What the API said about single fields (e.g. an image host it does not accept), until that field is edited.
  const [serverErrors, setServerErrors] = useState<Partial<Record<keyof NewsInput, string>>>({});
  const id = useId();
  const errors = { ...serverErrors, ...validateNews(form) };
  const edit = (k: keyof NewsInput, v: string) => {
    setServerErrors((e) => ({ ...e, [k]: undefined }));
    setForm((f) => ({ ...f, [k]: v }));
  };
  const valid = Object.values(errors).every((v) => !v);
  const unchanged = item !== null && form.title.trim() === item.title && form.body.trim() === item.body && (form.image.trim() || null) === item.image;

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setTouched(true);
    if (!valid || busy || unchanged) return;
    setBusy(true);
    setError(null);
    const token = await getIdToken();
    const res = token ? (item ? await updateNews(token, item, form) : await createNews(token, form)) : null;
    setBusy(false);
    if (!res) return setError("No session.");
    if (res.ok) return onSaved(res.data, item === null);
    const perField = fieldErrors(res);
    const known = (["title", "body", "image"] as const).filter((k) => perField[k]);
    if (known.length === 0) return setError(res.message);
    setServerErrors(Object.fromEntries(known.map((k) => [k, perField[k]])));
    setError(known.map((k) => perField[k]).join(" "));
  };

  const show = (k: keyof NewsInput) => touched && errors[k];
  const imageUrl = form.image.trim() && !errors.image ? safeExternalUrl(form.image.trim()) : null;

  return (
    <Modal
      open
      wide
      busy={busy}
      title={item ? "Edit news item" : "New news item"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.buttonGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={styles.buttonPrimary} onClick={() => save()} disabled={busy || unchanged || (touched && !valid)}>
            {busy ? "Saving…" : item ? "Save changes" : "Publish"}
          </button>
        </>
      }
    >
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {!item && (
          <div className={`${styles.notice} ${styles.noticeInfo}`}>
            Publishing puts this at the top of &quot;Current news&quot; on every phone&apos;s Home tab right away. News is shown in the language you
            write it in.
          </div>
        )}
        <label htmlFor={`${id}-title`} className={styles.field}>
          Title
        </label>
        <input
          id={`${id}-title`}
          className={`${styles.control} ${styles.controlWide}`}
          value={form.title}
          maxLength={TITLE_MAX}
          onChange={(e) => edit("title", e.target.value)}
          aria-invalid={Boolean(show("title"))}
        />
        {show("title") && <span className={styles.errorText}>{errors.title}</span>}

        <label htmlFor={`${id}-body`} className={styles.field} style={{ marginTop: 8 }}>
          Article text
        </label>
        <textarea
          id={`${id}-body`}
          className={styles.control}
          rows={8}
          maxLength={BODY_MAX}
          value={form.body}
          onChange={(e) => edit("body", e.target.value)}
          aria-invalid={Boolean(show("body"))}
        />
        <span className={show("body") ? styles.errorText : styles.muted}>
          {show("body") ? errors.body : `Plain text, line breaks are kept. ${form.body.length} / ${BODY_MAX}`}
        </span>

        <label htmlFor={`${id}-image`} className={styles.field} style={{ marginTop: 8 }}>
          Image URL (optional)
        </label>
        <input
          id={`${id}-image`}
          className={`${styles.control} ${styles.controlWide}`}
          value={form.image}
          maxLength={1000}
          placeholder="https://…"
          onChange={(e) => edit("image", e.target.value)}
          aria-invalid={Boolean(show("image"))}
        />
        <span className={show("image") ? styles.errorText : styles.muted}>
          {show("image")
            ? errors.image
            : "The card background, hosted on ArtVista's own image storage. Without one the app shows its default news artwork."}
        </span>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" style={{ maxWidth: 240, maxHeight: 140, objectFit: "cover", borderRadius: 8, marginTop: 4 }} />
        )}

        {error && (
          <div className={`${styles.notice} ${styles.noticeWarning}`} role="alert">
            Could not save: {error}
          </div>
        )}
      </form>
    </Modal>
  );
}

function NewsContent() {
  const { getIdToken } = useUser();
  const { showAlert, showConfirm } = useAlert();
  const [state, setState] = useState<Load>({ phase: "loading" });
  const [dialog, setDialog] = useState<{ item: NewsItem | null } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    const token = await getIdToken();
    if (!token) return setState({ phase: "error", kind: "forbidden", message: "No session token." });
    const res = await listNews(token);
    setState(res.ok ? { phase: "ready", items: res.data } : { phase: "error", kind: res.kind, message: res.message });
  }, [getIdToken]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (item: NewsItem) => {
    const ok = await showConfirm(
      `Delete "${item.title || "Untitled"}"? It disappears from every phone's Home tab the next time Home loads. This cannot be undone here (the text is kept in the audit log).`
    );
    if (!ok) return;
    setDeleting(item.id);
    const token = await getIdToken();
    const res = token ? await deleteNews(token, item.id) : null;
    setDeleting(null);
    if (!res || !res.ok) {
      showAlert(res && !res.ok ? `Delete failed: ${res.message}` : "No session.", "error");
      return;
    }
    setState((prev) => (prev.phase === "ready" ? { ...prev, items: prev.items.filter((i) => i.id !== item.id) } : prev));
    showAlert(`"${item.title}" deleted.`, "success");
  };

  if (state.phase === "loading") return <LoadingState />;
  if (state.phase === "error") return <ErrorState kind={state.kind} message={state.message} onRetry={load} />;

  return (
    <section className={styles.panel} aria-labelledby="news-title">
      <div className={styles.panelHeader}>
        <h2 id="news-title" className={styles.panelTitle}>
          Current news <span className={styles.muted} style={{ fontWeight: 400 }}>{state.items.length} item(s), newest first, as the app shows them</span>
        </h2>
        <div className={styles.rowActions}>
          <button type="button" className={styles.button} onClick={load}>
            Refresh
          </button>
          <button type="button" className={styles.buttonPrimary} onClick={() => setDialog({ item: null })}>
            New item
          </button>
        </div>
      </div>
      {state.items.length === 0 ? (
        <p className={styles.muted}>No news. The app&apos;s Home tab shows its empty news card until you publish one.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Image</th>
                <th>Title and text</th>
                <th>Published</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ width: 96 }}>
                    {item.image ? (
                      <a href={safeExternalUrl(item.image)} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={safeExternalUrl(item.image)} alt="" style={{ width: 80, height: 52, objectFit: "cover", borderRadius: 6 }} />
                      </a>
                    ) : (
                      <span className={styles.muted}>None</span>
                    )}
                  </td>
                  <td>
                    <strong>{item.title || <span className={styles.muted}>Untitled</span>}</strong>
                    <div className={styles.cellNote} style={{ whiteSpace: "pre-line" }}>
                      {preview(item.body)}
                    </div>
                  </td>
                  <td>{formatDateTime(item.timestamp)}</td>
                  <td className={styles.num}>
                    <div className={styles.rowActions}>
                      <button type="button" className={styles.button} disabled={deleting !== null} onClick={() => setDialog({ item })}>
                        Edit
                      </button>
                      <button type="button" className={styles.buttonDanger} disabled={deleting !== null} onClick={() => remove(item)}>
                        {deleting === item.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog && (
        <NewsDialog
          item={dialog.item}
          onClose={() => setDialog(null)}
          onSaved={(saved, created) => {
            setDialog(null);
            setState((prev) =>
              prev.phase !== "ready"
                ? prev
                : { ...prev, items: created ? [saved, ...prev.items] : prev.items.map((i) => (i.id === saved.id ? saved : i)) }
            );
            showAlert(created ? `"${saved.title}" published.` : "Changes saved.", "success");
          }}
        />
      )}
    </section>
  );
}

export default function NewsPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>News</h1>
            <p className={styles.subtitle}>
              The &quot;Current news&quot; cards on the app&apos;s Home tab (Firestore collection <code>updates</code>). Changes are live on the next
              Home load; no app release needed.
            </p>
          </div>
        </div>
        <AdminGate>
          <NewsContent />
        </AdminGate>
      </main>
    </>
  );
}

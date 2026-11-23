"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import Header from "@/components/header/header";
import styles from "../admin.module.css";
import { useUser } from "@/context/UserContext";
import { useAlert } from "@/context/AlertContext";
import { AdminGate, ErrorState, LoadingState, Modal, Stat } from "@/components/admin/AdminKit";
import { formatDateTime, safeExternalUrl } from "@/lib/bots";
import type { ApiErrorKind } from "@/lib/api";
import {
  AppConfigPut,
  AppConfigState,
  DEFAULT_STORE_URLS,
  getAppConfig,
  LANGUAGE_LABEL,
  LANGUAGES,
  MESSAGE_MAX,
  Platform,
  PLATFORM_LABEL,
  PLATFORMS,
  PlatformConfig,
  putAppConfig,
  raisesMinimum,
  unconfirmedRaise,
  validateForm,
} from "@/lib/appConfig";

type Load = { phase: "loading" } | { phase: "error"; kind: ApiErrorKind; message: string } | { phase: "ready"; data: AppConfigState };

function Explainer({ cacheSeconds }: { cacheSeconds: number }) {
  return (
    <section className={styles.panel} aria-labelledby="how-title">
      <h2 id="how-title" className={styles.panelTitle} style={{ marginBottom: 8 }}>
        How the app uses these numbers
      </h2>
      <div className={styles.ruleBox}>
        <div className={styles.ruleItem}>
          <strong>Minimum version</strong>
          Any install older than this shows a full-screen &quot;Update required&quot; page with only an Update button. It cannot be dismissed: the
          app is unusable until the user installs the update from the store.
        </div>
        <div className={styles.ruleItem}>
          <strong>Latest version</strong>
          Installs at or above the minimum but older than this get one gentle, dismissible &quot;Update available&quot; prompt per latest version.
        </div>
        <div className={styles.ruleItem}>
          <strong>Empty</strong>
          No requirement. If the API is down or not deployed, the app never blocks anyone.
        </div>
        <div className={styles.ruleItem}>
          <strong>Timing</strong>
          The app checks on launch and when it returns to the foreground. A change reaches every phone within about {Math.round(cacheSeconds / 60)}{" "}
          minutes (server cache).
        </div>
      </div>
    </section>
  );
}

function PlatformCard({ cfg, onEdit }: { cfg: PlatformConfig; onEdit: () => void }) {
  const messageCount = Object.keys(cfg.update_message).length;
  return (
    <section className={styles.panel} aria-labelledby={`${cfg.platform}-title`}>
      <div className={styles.panelHeader}>
        <h2 id={`${cfg.platform}-title`} className={styles.panelTitle}>
          {PLATFORM_LABEL[cfg.platform]}
        </h2>
        <button type="button" className={styles.buttonPrimary} onClick={onEdit}>
          Edit
        </button>
      </div>
      <div className={styles.stats}>
        <Stat value={cfg.min_version ?? "None"} label="Minimum (forced)" alert={Boolean(cfg.min_version)} />
        <Stat value={cfg.latest_version ?? "None"} label="Latest (suggested)" />
      </div>
      <p style={{ marginTop: 12, fontSize: "0.9rem", lineHeight: 1.6 }}>
        Store link:{" "}
        <a href={safeExternalUrl(cfg.store_url)} target="_blank" rel="noopener noreferrer" className={styles.link}>
          {cfg.store_url}
        </a>
        <br />
        Message:{" "}
        {messageCount === 0 ? (
          <span className={styles.muted}>the app&apos;s own text (translated in all 11 languages)</span>
        ) : (
          <>
            &quot;{cfg.update_message.en ?? Object.values(cfg.update_message)[0]}&quot;{" "}
            <span className={styles.muted}>({messageCount} of 11 languages; the rest fall back to English, then to the app&apos;s text)</span>
          </>
        )}
        <br />
        <span className={styles.muted}>
          {cfg.updated_at ? `Last changed ${formatDateTime(cfg.updated_at)}${cfg.updated_by ? ` by ${cfg.updated_by}` : ""}` : "Never changed"}
        </span>
      </p>
    </section>
  );
}

function EditDialog({ current, onClose, onSaved }: { current: PlatformConfig; onClose: () => void; onSaved: (next: PlatformConfig) => void }) {
  const { getIdToken } = useUser();
  const [form, setForm] = useState<AppConfigPut>({
    platform: current.platform,
    min_version: current.min_version ?? "",
    latest_version: current.latest_version ?? "",
    store_url: current.store_url || DEFAULT_STORE_URLS[current.platform],
    update_message: { ...current.update_message },
  });
  const [ack, setAck] = useState(false);
  // The minimum the server holds. Starts as what this page loaded; corrected when the API
  // answers 409 because it changed in the meantime (another admin, another tab).
  const [serverMin, setServerMin] = useState<string | null>(current.min_version);
  const [serverAsksConfirm, setServerAsksConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLanguages, setShowLanguages] = useState(Object.keys(current.update_message).some((l) => l !== "en"));
  const id = useId();

  const errors = validateForm(form);
  const raising = Boolean(form.min_version) && (serverAsksConfirm || raisesMinimum(serverMin, form.min_version || null));
  const valid = Object.keys(errors).length === 0 && (!raising || ack);
  const set = <K extends keyof AppConfigPut>(k: K, v: AppConfigPut[K]) => {
    if (k === "min_version") {
      setAck(false); // the confirmation names one version: a different one needs a new tick
      setServerAsksConfirm(false);
    }
    setForm((f) => ({ ...f, [k]: v }));
  };
  const setMessage = (l: string, v: string) => setForm((f) => ({ ...f, update_message: { ...f.update_message, [l]: v } }));

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const token = await getIdToken();
    const res = token ? await putAppConfig(token, form, raising && ack) : null;
    setBusy(false);
    if (!res) return setError("No session.");
    if (res.ok) return onSaved(res.data);
    const refused = unconfirmedRaise(res);
    if (refused) {
      // Nothing was saved. Show the warning against the server's real minimum and ask again.
      setServerMin(refused.current);
      setServerAsksConfirm(true);
      setAck(false);
      return setError(
        `the minimum on the server is ${refused.current ?? "not set"}, so ${form.min_version} would block every install below it. ` +
          "Nothing was changed. Read the warning above, tick the confirmation and save again."
      );
    }
    setError(res.message);
  };

  const field = (name: "min_version" | "latest_version", label: string, hint: string) => (
    <>
      <label htmlFor={`${id}-${name}`} className={styles.field}>
        {label}
      </label>
      <input
        id={`${id}-${name}`}
        className={styles.control}
        inputMode="decimal"
        autoComplete="off"
        placeholder="1.5.0"
        value={form[name] ?? ""}
        maxLength={20}
        onChange={(e) => set(name, e.target.value.trim())}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={`${id}-${name}-hint`}
      />
      <span id={`${id}-${name}-hint`} className={errors[name] ? styles.errorText : styles.muted}>
        {errors[name] ?? hint}
      </span>
    </>
  );

  return (
    <Modal
      open
      wide
      busy={busy}
      title={`${PLATFORM_LABEL[current.platform]} versions`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.buttonGhost} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={styles.buttonPrimary} onClick={() => save()} disabled={!valid || busy}>
            {busy ? "Saving…" : raising ? "Force this update" : "Save"}
          </button>
        </>
      }
    >
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {field("min_version", "Minimum version", "Older installs are blocked until they update. Leave empty for no requirement.")}
        {field("latest_version", "Latest version", "The version in the store now. Older installs get one gentle prompt.")}

        {raising && (
          <div className={`${styles.notice} ${styles.noticeWarning}`} role="alert" style={{ marginTop: 8 }}>
            <div className={styles.noticeTitle}>This forces every older install to update</div>
            Every {PLATFORM_LABEL[current.platform]} install below <strong>{form.min_version}</strong> will show a full-screen &quot;Update
            required&quot; page and cannot be used until the user updates from the store
            {serverMin ? ` (today the minimum is ${serverMin})` : " (today nobody is blocked)"}. Only do this once{" "}
            {form.min_version} is live in the store for everyone, including all countries and phased releases, or users will be locked out with
            no update to install.
            <label className={styles.choice} style={{ marginTop: 10 }}>
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              I understand: {form.min_version} is live in the store and older installs must update.
            </label>
          </div>
        )}

        <label htmlFor={`${id}-url`} className={styles.field} style={{ marginTop: 8 }}>
          Store link
        </label>
        <input
          id={`${id}-url`}
          className={`${styles.control} ${styles.controlWide}`}
          value={form.store_url}
          maxLength={500}
          onChange={(e) => set("store_url", e.target.value)}
          aria-invalid={Boolean(errors.store_url)}
          aria-describedby={`${id}-url-hint`}
        />
        <span id={`${id}-url-hint`} className={errors.store_url ? styles.errorText : styles.muted}>
          {errors.store_url ?? (
            <>
              Opened by the Update button.{" "}
              {form.store_url !== DEFAULT_STORE_URLS[current.platform] && (
                <button type="button" className={styles.link} style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }} onClick={() => set("store_url", DEFAULT_STORE_URLS[current.platform])}>
                  Reset to the ArtVista listing
                </button>
              )}
            </>
          )}
        </span>

        <label htmlFor={`${id}-msg-en`} className={styles.field} style={{ marginTop: 8 }}>
          Message (optional)
        </label>
        <textarea
          id={`${id}-msg-en`}
          className={styles.control}
          rows={2}
          maxLength={MESSAGE_MAX}
          placeholder="Leave empty to use the app's own text, already translated into every language."
          value={form.update_message.en ?? ""}
          onChange={(e) => setMessage("en", e.target.value)}
        />
        <span className={errors.update_message ? styles.errorText : styles.muted}>
          {errors.update_message ??
            "Shown on the update screen and prompt. Plain text, no dashes. Languages without a message get the English one; with no English one, the app's own translated text."}
        </span>
        <button
          type="button"
          className={styles.link}
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", alignSelf: "flex-start" }}
          aria-expanded={showLanguages}
          onClick={() => setShowLanguages((s) => !s)}
        >
          {showLanguages ? "Hide other languages" : "Add translations"}
        </button>
        {showLanguages &&
          LANGUAGES.filter((l) => l !== "en").map((l) => (
            <React.Fragment key={l}>
              <label htmlFor={`${id}-msg-${l}`} className={styles.field}>
                {LANGUAGE_LABEL[l]}
              </label>
              <textarea
                id={`${id}-msg-${l}`}
                className={styles.control}
                rows={2}
                maxLength={MESSAGE_MAX}
                dir={l === "ar" ? "rtl" : undefined}
                value={form.update_message[l] ?? ""}
                onChange={(e) => setMessage(l, e.target.value)}
              />
            </React.Fragment>
          ))}

        {error && (
          <div className={`${styles.notice} ${styles.noticeWarning}`} role="alert">
            Could not save: {error}
          </div>
        )}
      </form>
    </Modal>
  );
}

function AppVersionContent() {
  const { getIdToken } = useUser();
  const { showAlert } = useAlert();
  const [state, setState] = useState<Load>({ phase: "loading" });
  const [editing, setEditing] = useState<Platform | null>(null);

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    const token = await getIdToken();
    if (!token) return setState({ phase: "error", kind: "forbidden", message: "No session token." });
    const res = await getAppConfig(token);
    setState(res.ok ? { phase: "ready", data: res.data } : { phase: "error", kind: res.kind, message: res.message });
  }, [getIdToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.phase === "loading") return <LoadingState />;
  if (state.phase === "error") return <ErrorState kind={state.kind} message={state.message} onRetry={load} />;
  const { platforms, cache_seconds } = state.data;

  return (
    <>
      <Explainer cacheSeconds={cache_seconds} />
      {PLATFORMS.map((p) => (
        <PlatformCard key={p} cfg={platforms[p]} onEdit={() => setEditing(p)} />
      ))}
      {editing && (
        <EditDialog
          current={platforms[editing]}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            setEditing(null);
            setState({ phase: "ready", data: { ...state.data, platforms: { ...platforms, [next.platform]: next } } });
            showAlert(`${PLATFORM_LABEL[next.platform]} versions saved. Phones pick it up within ${Math.round(cache_seconds / 60)} minutes.`, "success");
          }}
        />
      )}
    </>
  );
}

export default function AppVersionPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>App version</h1>
            <p className={styles.subtitle}>
              The minimum and latest ArtVista app version per platform. Raising the minimum forces every older install to update before the app
              can be used.
            </p>
          </div>
        </div>
        <AdminGate>
          <AppVersionContent />
        </AdminGate>
      </main>
    </>
  );
}

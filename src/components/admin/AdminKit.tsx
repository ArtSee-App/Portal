"use client";

import React, { useEffect, useId, useRef } from "react";
import Link from "next/link";
import styles from "@/app/admin/admin.module.css";
import { Loader } from "@/components/loadingOverlay/loadingOverlay";
import { useUser } from "@/context/UserContext";
import type { ApiErrorKind } from "@/lib/api";

/** Renders children only for portal admins. The API enforces the same rule server-side. */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, isLoadingUser } = useUser();
  if (isLoadingUser) {
    return (
      <div className={styles.loaderWrapper}>
        <Loader />
      </div>
    );
  }
  if (user?.type !== "admin") {
    return (
      <div className={`${styles.state} ${styles.stateError}`}>
        <div className={styles.stateTitle}>Admins only</div>
        <p>This area is only available to ArtVista admins.</p>
        <p style={{ marginTop: 12 }}>
          <Link href="/home" className={styles.link}>
            Back to home
          </Link>
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.toggleTrack}>
        <span className={styles.toggleThumb} />
      </span>
      {checked ? "Enabled" : "Disabled"}
    </button>
  );
}

const ERROR_COPY: Record<ApiErrorKind, { title: string; body: string }> = {
  not_deployed: {
    title: "Backend not deployed yet",
    body: "The Image-Search-API on this environment does not have these endpoints yet. Deploy the API branch and run its migration, then refresh.",
  },
  not_configured: {
    title: "Not configured",
    body: "This feature needs server configuration on the Image-Search-API.",
  },
  forbidden: {
    title: "Not allowed",
    body: "Your session is not accepted as an admin session. Sign out and sign in again.",
  },
  conflict: { title: "Conflict", body: "The server refused the change." },
  network: {
    title: "Could not reach the API",
    body: "Check your connection and try again. If it keeps failing the API may be down.",
  },
  server: { title: "Something went wrong", body: "The API returned an error." },
};

export function ErrorState({
  kind,
  message,
  onRetry,
}: {
  kind: ApiErrorKind;
  message?: string;
  onRetry?: () => void;
}) {
  const copy = ERROR_COPY[kind];
  return (
    <div className={`${styles.state} ${kind === "not_deployed" ? "" : styles.stateError}`}>
      <div className={styles.stateTitle}>{copy.title}</div>
      <p>{copy.body}</p>
      {message && kind !== "not_deployed" && <p className={styles.muted}>{message}</p>}
      {onRetry && (
        <p style={{ marginTop: 16 }}>
          <button type="button" className={styles.button} onClick={onRetry}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className={styles.loaderWrapper}>
      <Loader />
    </div>
  );
}

export function Stat({ value, label, alert }: { value: number | string; label: string; alert?: boolean }) {
  return (
    <div className={`${styles.stat} ${alert ? styles.statAlert : ""}`}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

const PILL_CLASS: Record<string, string> = {
  succeeded: styles.pillSucceeded,
  accepted: styles.pillAccepted,
  capped: styles.pillCapped,
  submitted: styles.pillPending,
  failed: styles.pillFailed,
  rejected: styles.pillRejected,
  error: styles.pillError,
  running: styles.pillRunning,
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <span className={`${styles.pill} ${PILL_CLASS[status] ?? styles.pillMuted}`}>{label ?? status}</span>;
}

export function LicenceBadge({ summary, risky }: { summary: string; risky: boolean }) {
  return (
    <span className={`${styles.badge} ${risky ? styles.badgeRisk : styles.badgeOpen}`} title={summary}>
      {risky ? "⚠ " : ""}
      {summary}
    </span>
  );
}

/**
 * Accessible modal built on the native <dialog>: focus stays inside, Escape closes, the page
 * behind is inert. Pass busy to block closing while a request is in flight.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
  busy,
}: {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`${styles.modal} ${wide ? styles.modalWide : ""}`}
      aria-labelledby={titleId}
      aria-busy={busy || undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClose={() => {
        // Chrome force-closes after repeated Escape even when cancel is prevented; keep state in sync.
        if (open) onClose();
      }}
    >
      {open && (
        <>
          <div className={styles.modalHeader}>
            <h2 id={titleId} className={styles.modalTitle}>
              {title}
            </h2>
            <button type="button" className={styles.modalClose} aria-label="Close" disabled={busy} onClick={onClose}>
              ×
            </button>
          </div>
          <div className={styles.modalBody}>{children}</div>
          {footer && <div className={styles.modalFooter}>{footer}</div>}
        </>
      )}
    </dialog>
  );
}

/** Exclusive filter chips with aria-pressed, used by the Museums and Rights pages. */
export function ChipGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { key: T; label: string; count?: number }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key || "all"}
          type="button"
          aria-pressed={value === o.key}
          className={`${styles.chip} ${value === o.key ? styles.chipActive : ""}`}
          onClick={() => onChange(o.key)}
        >
          {o.label}
          {o.count !== undefined && <span className={styles.chipCount}>{o.count.toLocaleString("en-US")}</span>}
        </button>
      ))}
    </div>
  );
}

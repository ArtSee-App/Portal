// Admin-controlled app versions (force update).
//
//   GET /admin/app-config   {platforms: {ios, android}, default_store_urls, languages, cache_seconds}
//   PUT /admin/app-config   {platform, min_version, latest_version, store_url, update_message: {en, tr, ...}}
//   Public, read by the app: GET /v1/app/config?platform=ios&lang=tr -> {min_version, latest_version, store_url, message}
// Auth: admin_portal_token query param today; apiRequest sends Authorization: Bearer instead once NEXT_PUBLIC_API_BEARER_AUTH=true. Every PUT goes to admin_action_log.
//
// What the app does with it:
//   installed < min_version             blocking "Update required" screen, cannot be dismissed
//   min_version <= installed < latest   one gentle, dismissible prompt per latest version
//   no config, API down or not deployed the app carries on (fails open)
import { apiRequest, ApiResult } from "./api";

export type Platform = "ios" | "android";
export const PLATFORMS: Platform[] = ["ios", "android"];
export const PLATFORM_LABEL: Record<Platform, string> = { ios: "iOS", android: "Android" };

/** The app's 11 languages, English first. */
export const LANGUAGES = ["en", "de", "es", "fr", "it", "nl", "pt", "ro", "tr", "el", "ar"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_LABEL: Record<Language, string> = {
  en: "English",
  de: "German",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  nl: "Dutch",
  pt: "Portuguese",
  ro: "Romanian",
  tr: "Turkish",
  el: "Greek",
  ar: "Arabic",
};
export const MESSAGE_MAX = 300;

/**
 * The store listings, as the app's rate prompt opens them:
 * App Store id 6503986684 (eas.json submit.ios.ascAppId, bundle org.reactjs.native.artvista),
 * Google Play package com.artvista.
 */
export const DEFAULT_STORE_URLS: Record<Platform, string> = {
  ios: "https://apps.apple.com/app/artvista-art-companion/id6503986684",
  android: "https://play.google.com/store/apps/details?id=com.artvista",
};
export const STORE_HOSTS: Record<Platform, string[]> = {
  ios: ["apps.apple.com", "itunes.apple.com"],
  android: ["play.google.com"],
};

export type PlatformConfig = {
  platform: Platform;
  min_version: string | null;
  latest_version: string | null;
  store_url: string;
  update_message: Partial<Record<Language, string>>;
  updated_by: string | null;
  updated_at: string | null;
  /** False until an admin (or the migration seed) wrote a row for this platform. */
  configured: boolean;
};

export type AppConfigState = { platforms: Record<Platform, PlatformConfig>; cache_seconds: number };

export type AppConfigPut = {
  platform: Platform;
  min_version: string | null;
  latest_version: string | null;
  store_url: string;
  update_message: Partial<Record<Language, string>>;
};

// ---------------------------------------------------------------------------
// Versions: the same strict rule as the API
// ---------------------------------------------------------------------------

const SEMVER = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;

export function parseVersion(v: string): [number, number, number] | null {
  const m = SEMVER.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export const isVersion = (v: string) => parseVersion(v) !== null;

/** -1, 0, 1; null when either side is not a version. Numeric per part, so 1.10.0 > 1.9.0. */
export function compareVersions(a: string, b: string): number | null {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  return 0;
}

export type FormErrors = Partial<Record<"min_version" | "latest_version" | "store_url" | "update_message", string>>;

export function validateForm(f: AppConfigPut): FormErrors {
  const e: FormErrors = {};
  if (f.min_version && !isVersion(f.min_version)) e.min_version = "Use MAJOR.MINOR.PATCH, digits only, like 1.5.0.";
  if (f.latest_version && !isVersion(f.latest_version)) e.latest_version = "Use MAJOR.MINOR.PATCH, digits only, like 1.5.0.";
  if (f.min_version && !f.latest_version && !e.min_version) e.latest_version = "Set the latest version too (at least the minimum).";
  if (!e.min_version && !e.latest_version && f.min_version && f.latest_version && (compareVersions(f.min_version, f.latest_version) ?? 0) > 0)
    e.min_version = "The minimum cannot be higher than the latest version.";
  try {
    const u = new URL(f.store_url.trim());
    if (u.protocol !== "https:" || !STORE_HOSTS[f.platform].includes(u.hostname))
      e.store_url = `Must be an https link on ${STORE_HOSTS[f.platform].join(" or ")}.`;
  } catch {
    e.store_url = "Not a valid URL.";
  }
  const long = LANGUAGES.find((l) => (f.update_message[l] ?? "").trim().length > MESSAGE_MAX);
  if (long) e.update_message = `The ${LANGUAGE_LABEL[long]} message is longer than ${MESSAGE_MAX} characters.`;
  return e;
}

/** True when saving would block installs that are allowed today. */
export function raisesMinimum(before: string | null, after: string | null): boolean {
  if (!after) return false;
  if (!before) return true;
  return (compareVersions(after, before) ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);

function normalize(platform: Platform, r: Raw | undefined): PlatformConfig {
  const messages: Partial<Record<Language, string>> = {};
  const rawMessages = r?.update_message;
  if (rawMessages && typeof rawMessages === "object") {
    for (const l of LANGUAGES) {
      const v = (rawMessages as Raw)[l];
      if (typeof v === "string" && v) messages[l] = v;
    }
  }
  return {
    platform,
    min_version: str(r?.min_version),
    latest_version: str(r?.latest_version),
    store_url: str(r?.store_url) ?? DEFAULT_STORE_URLS[platform],
    update_message: messages,
    updated_by: str(r?.updated_by),
    updated_at: str(r?.updated_at),
    configured: Boolean(r?.configured),
  };
}

export async function getAppConfig(token: string): Promise<ApiResult<AppConfigState>> {
  const res = await apiRequest<{ platforms?: Record<string, Raw>; cache_seconds?: number }>("/admin/app-config", { admin_portal_token: token });
  if (!res.ok) return res;
  const p = res.data?.platforms ?? {};
  return {
    ...res,
    data: {
      platforms: { ios: normalize("ios", p.ios), android: normalize("android", p.android) },
      cache_seconds: Number(res.data?.cache_seconds) || 300,
    },
  };
}

/**
 * The API refuses to raise (or first set) the minimum version without an explicit
 * confirmation: HTTP 409 with the minimum it has stored right now. Returns that
 * minimum (null = none set) when `res` is this refusal, else undefined.
 */
export function unconfirmedRaise(res: ApiResult<unknown>): { current: string | null } | undefined {
  if (res.ok || res.status !== 409 || !res.detail || typeof res.detail !== "object") return undefined;
  const d = res.detail as Raw;
  return d.code === "min_version_raise_not_confirmed" ? { current: str(d.current_min_version) } : undefined;
}

/** `confirmRaise`: the admin ticked "older installs must update" for a higher minimum. */
export async function putAppConfig(token: string, body: AppConfigPut, confirmRaise = false): Promise<ApiResult<PlatformConfig>> {
  const clean: AppConfigPut & { confirm_min_version_raise?: true } = {
    platform: body.platform,
    min_version: body.min_version?.trim() || null,
    latest_version: body.latest_version?.trim() || null,
    store_url: body.store_url.trim(),
    update_message: Object.fromEntries(
      LANGUAGES.map((l) => [l, (body.update_message[l] ?? "").trim()] as const).filter(([, v]) => v)
    ) as Partial<Record<Language, string>>,
  };
  if (confirmRaise) clean.confirm_min_version_raise = true;
  const res = await apiRequest<{ config?: Raw }>(
    "/admin/app-config",
    { admin_portal_token: token },
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clean) }
  );
  return res.ok ? { ...res, data: normalize(body.platform, { ...res.data?.config, configured: true }) } : res;
}

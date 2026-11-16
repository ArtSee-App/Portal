/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// Same default as src/lib/api.ts.
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.artvista.app").origin;

// Content-Security-Policy. Every host below is one the code really talks to:
// - api.artvista.app: every page; some legacy calls are hardcoded, so it stays even with a local API base
// - identitytoolkit / securetoken / firestore: Firebase Auth (e-mail + password) and Firestore (firebase.ts)
// - www.google.com/recaptcha, www.gstatic.com/recaptcha: reCAPTCHA v3 (react-google-recaptcha-v3)
// - *.digitaloceanspaces.com: artwork images; home/page.tsx fetch()es one for the duplicate check
// Images come from API data (object storage, museum and source thumbnails, news images an
// admin pastes), so img-src allows any https host; an <img> cannot run script.
// The pages are statically prerendered, so there is no per-request nonce: Next's inline
// bootstrap scripts need 'unsafe-inline'. Dev adds what the dev server (HMR, eval) needs.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://api.artvista.app",
    apiOrigin,
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firestore.googleapis.com",
    "https://www.google.com/recaptcha/",
    "https://*.digitaloceanspaces.com",
    isDev ? "ws:" : "",
  ]
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .join(" "),
  "frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  isDev ? "" : "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig = {
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};


export default nextConfig;

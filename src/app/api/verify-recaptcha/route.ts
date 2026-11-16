// src/app/api/verify-recaptcha/route.ts
import { NextResponse } from "next/server";

// The only action the client asks a token for (login/page.tsx uses it for sign-in and sign-up).
const EXPECTED_ACTION = "register";
const MIN_SCORE = 0.5;
const MAX_TOKEN_LENGTH = 4096;

const fail = (status: number, error: string) => NextResponse.json({ success: false, error }, { status });

// Hostnames a token may have been issued on. RECAPTCHA_ALLOWED_HOSTNAMES (comma separated)
// wins; without it only the hostname this request was sent to is accepted.
function allowedHostnames(req: Request): string[] {
    const configured = (process.env.RECAPTCHA_ALLOWED_HOSTNAMES || "")
        .split(",")
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean);
    if (configured.length > 0) return configured;
    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim();
    const hostname = host.replace(/:\d+$/, "").toLowerCase();
    return hostname ? [hostname] : [];
}

export async function POST(req: Request) {
    let token: unknown;
    try {
        token = (await req.json())?.token;
    } catch {
        return fail(400, "Invalid request");
    }
    // Server-only: read at request time. Never add it to `env` in next.config.ts (that inlines the value).
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    // Local dev only: there is no reCAPTCHA secret on dev machines, so skip the check.
    // `next build` / production always sets NODE_ENV=production, so this never runs there.
    if (process.env.NODE_ENV === "development" && !secretKey) {
        return NextResponse.json({ success: true, skipped: "dev" });
    }

    if (typeof token !== "string" || !token || token.length > MAX_TOKEN_LENGTH || !secretKey) {
        return fail(400, "Missing token or secret key");
    }

    const hostnames = allowedHostnames(req);
    if (hostnames.length === 0) return fail(400, "Invalid request");

    try {
        // Secret and token go in the form body, never in the URL (URLs end up in logs and error texts).
        const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ secret: secretKey, response: token }),
            cache: "no-store",
        });
        if (!response.ok) return fail(502, "Verification error");
        const data = await response.json();

        const ok =
            data?.success === true &&
            typeof data.score === "number" &&
            data.score >= MIN_SCORE &&
            data.action === EXPECTED_ACTION &&
            typeof data.hostname === "string" &&
            hostnames.includes(data.hostname.toLowerCase());

        return ok ? NextResponse.json({ success: true }) : fail(403, "Failed reCAPTCHA verification");
    } catch {
        return fail(500, "Verification error");
    }
}

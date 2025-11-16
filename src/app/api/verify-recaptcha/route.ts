// src/app/api/verify-recaptcha/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { token } = await req.json();
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!token || !secretKey) {
        return NextResponse.json({ success: false, error: "Missing token or secret key" }, { status: 400 });
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

    try {
        const response = await fetch(verificationUrl, { method: "POST" });
        const data = await response.json();

        if (data.success && data.score >= 0.5) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: "Failed reCAPTCHA verification" }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ success: false, error: "Verification error" }, { status: 500 });
    }
}

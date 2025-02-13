// src/app/RootClient.tsx
"use client";

import { UserProvider } from "@/context/UserContext";
import { AlertProvider } from "@/context/AlertContext";
import AppWrapper from "./AppWrapper";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Dynamically import GoogleReCaptchaProvider (Client-side only)
const GoogleReCaptchaProvider = dynamic(
    () =>
        import("react-google-recaptcha-v3").then(
            (mod) => mod.GoogleReCaptchaProvider
        ),
    { ssr: false }
);

export default function RootClient({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    useEffect(() => {
        // Add or remove the class based on pathname
        if (pathname === "/login") {
            document.body.classList.add("show-recaptcha");
            document.body.classList.remove("hide-recaptcha");
        } else {
            document.body.classList.add("hide-recaptcha");
            document.body.classList.remove("show-recaptcha");
        }
    }, [pathname]);

    return (
        <GoogleReCaptchaProvider
            reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
            scriptProps={{
                async: true,
                defer: true,
                appendTo: "body",
            }}
        >
            <UserProvider>
                <AlertProvider>
                    <AppWrapper>{children}</AppWrapper>
                </AlertProvider>
            </UserProvider>
        </GoogleReCaptchaProvider>
    );
}

// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function Index() {
    const router = useRouter();
    const { user, isLoadingUser } = useUser();

    useEffect(() => {
        if (!isLoadingUser) {
            if (user) {
                router.replace("/home"); // If logged in, go to home
            } else {
                router.replace("/login"); // If not, go to login
            }
        }
    }, [user, isLoadingUser, router]);

    return null; // Render nothing during redirect
}

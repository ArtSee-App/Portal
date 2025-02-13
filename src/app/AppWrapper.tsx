// src/app/AppWrapper.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter, usePathname } from "next/navigation";
import styles from "./AppWrapper.module.css";

const LoadingScreen = () => (
    <div className={styles.loadingScreen}>
        <img
            src="/favicon.png"
            alt="Loading"
            style={{ width: "120px", height: "120px", objectFit: "contain" }}
        />
    </div>
);

const AppWrapper = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoadingUser } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    // NEW: Block rendering until auth check is done
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        if (!isLoadingUser) {
            if (!user && pathname !== "/login") {
                router.replace("/login"); // Reset navigation stack
            }
            setIsCheckingAuth(false);
        }
    }, [user, isLoadingUser, pathname, router]);

    // Block rendering during auth check to prevent flash
    if (isCheckingAuth || isLoadingUser) {
        return <LoadingScreen />;
    }

    return <>{children}</>;
};

export default AppWrapper;

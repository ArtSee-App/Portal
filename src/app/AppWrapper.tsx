"use client";

import React from "react";
import { useUser } from "@/context/UserContext";
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
    const { isLoadingUser } = useUser();

    if (isLoadingUser) {
        return <LoadingScreen />;
    }

    return <>{children}</>;
};

export default AppWrapper;

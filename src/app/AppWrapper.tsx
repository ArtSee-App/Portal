"use client";

import React from "react";
import { useUser } from "@/context/UserContext";

const LoadingScreen = () => (
    <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "var(--background)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    }}>
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

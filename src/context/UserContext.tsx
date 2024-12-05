"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface User {
    userId: string;
    email: string;
    type: string;
    approved: boolean;
}

interface UserContextProps {
    user: User | null;
    setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window !== "undefined") {
            const storedUser = localStorage.getItem("user");
            return storedUser ? JSON.parse(storedUser) : null;
        }
        return null;
    });

    const setUserAndPersist = (user: User | null) => {
        setUser(user);
        if (user) {
            localStorage.setItem("user", JSON.stringify(user));
        } else {
            localStorage.removeItem("user");
        }
    };

    useEffect(() => {
        // Optional: Sync localStorage with initial state
        if (typeof window !== "undefined") {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        }
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser: setUserAndPersist }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};

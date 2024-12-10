"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth"; // Import Firebase User type
import { auth } from "../../firebase"; // Import Firebase auth object

interface User extends FirebaseUser {
    type: string;
    approved: boolean;
}

interface UserContextProps {
    user: User | null;
    setUser: (user: User | null) => void;
    getIdToken: () => Promise<string | null>; // Function to fetch idToken
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
            const { type, approved, email } = user; // Save only necessary fields
            localStorage.setItem("user", JSON.stringify({ type, approved, email }));
        } else {
            localStorage.removeItem("user");
        }
    };

    const getIdToken = useCallback(async (): Promise<string | null> => {
        if (auth.currentUser) {
            try {
                console.log('muie ' + auth.currentUser.email);
                const token = await auth.currentUser.getIdToken();
                return token;
            } catch (error) {
                console.error("Error fetching idToken:", error);
                return null;
            }
        }
        console.error("No authenticated user found.");
        return null;
    }, []);

    useEffect(() => {
        // Sync with localStorage and fetch idToken when user changes
        if (typeof window !== "undefined") {
            const storedUser = localStorage.getItem("user");
            if (storedUser && auth.currentUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser({ ...parsedUser } as User);
            }
        }
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser: setUserAndPersist, getIdToken }}>
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

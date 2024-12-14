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
    isLoadingUser: boolean; // Add isLoadingUser to context props
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null); // Initially null
    const [isLoadingUser, setIsLoadingUser] = useState(true); // Add a loading state for rehydration

    const setUserAndPersist = (user: User | null) => {
        setUser(user);
        if (user) {
            const { type, approved, email, uid } = user; // Save necessary fields
            localStorage.setItem("user", JSON.stringify({ type, approved, email, uid }));
        } else {
            localStorage.removeItem("user");
        }
    };

    const getIdToken = useCallback(async (): Promise<string | null> => {
        if (auth.currentUser) {
            try {
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
        // Listen for Firebase auth state changes
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const token = await firebaseUser.getIdToken();
                    const storedUser = localStorage.getItem("user");
                    const parsedUser = storedUser ? JSON.parse(storedUser) : {};

                    // Rehydrate user context
                    setUser({
                        ...parsedUser,
                        email: firebaseUser.email, // Ensure Firebase user fields are added
                        uid: firebaseUser.uid,
                    } as User);
                } catch (error) {
                    console.error("Error fetching idToken during rehydration:", error);
                }
            } else {
                setUser(null);
            }
            setIsLoadingUser(false); // Rehydration complete
        });

        return () => unsubscribe(); // Clean up the subscription
    }, []);


    return (
        <UserContext.Provider value={{ user, setUser: setUserAndPersist, getIdToken, isLoadingUser }}>
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

"use client";

import React, { createContext, useContext, useState } from "react";
import Alert from "@/components/alert/alert";

interface AlertContextType {
    showAlert: (message: string, type?: "success" | "error" | "info" | "warning") => void;
    showConfirm: (message: string, isPrompt?: boolean) => Promise<string | boolean>; // Supports input-based prompts
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = (): AlertContextType => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error("useAlert must be used within an AlertProvider");
    }
    return context;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [alert, setAlert] = useState<{
        message: string;
        type: "success" | "error" | "info" | "warning";
        isConfirm: boolean;
        isPrompt: boolean; // Added to support input prompts
        resolve?: (result: string | boolean) => void; // Supports both confirmation and input return
    } | null>(null);

    const showAlert = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
        setAlert({ message, type, isConfirm: false, isPrompt: false });
    };

    const showConfirm = (message: string, isPrompt: boolean = false): Promise<string | boolean> => {
        return new Promise((resolve) => {
            setAlert({ message, type: "info", isConfirm: true, isPrompt, resolve });
        });
    };

    const closeAlert = (result?: string | boolean) => {
        if (alert?.resolve) {
            alert.resolve(result ?? false);
        }
        setAlert(null); // Close the alert
    };

    return (
        <AlertContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {alert && (
                <Alert
                    message={alert.message}
                    type={alert.type}
                    isConfirm={alert.isConfirm}
                    isPrompt={alert.isPrompt} // Pass to alert
                    onClose={closeAlert}
                />
            )}
        </AlertContext.Provider>
    );
};

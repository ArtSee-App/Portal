"use client";

import React, { createContext, useContext, useState } from "react";
import Alert from "@/components/alert/alert";

interface AlertContextType {
    showAlert: (message: string, type?: "success" | "error" | "info" | "warning") => void;
    showConfirm: (message: string) => Promise<boolean>; // New method for confirmation dialogs
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
        isConfirm: boolean; // New flag to indicate confirmation dialog
        resolve?: (result: boolean) => void; // Resolve function for confirmation dialogs
    } | null>(null);

    const showAlert = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
        setAlert({ message, type, isConfirm: false });
    };

    const showConfirm = (message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setAlert({ message, type: "info", isConfirm: true, resolve });
        });
    };

    const closeAlert = (result?: boolean) => {
        if (alert?.isConfirm && alert.resolve) {
            alert.resolve(result || false); // Resolve the promise with the result
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
                    onClose={closeAlert}
                />
            )}
        </AlertContext.Provider>
    );
};

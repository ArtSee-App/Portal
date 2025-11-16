"use client";

import React, { useState } from "react";
import styles from "./alert.module.css";

interface AlertProps {
    message: string;
    onClose: (result?: boolean | string) => void;
    type?: "success" | "error" | "info" | "warning";
    isConfirm?: boolean;
    isPrompt?: boolean; // New prop for input-enabled alert
}

const Alert: React.FC<AlertProps> = ({
    message,
    onClose,
    type = "info",
    isConfirm = false,
    isPrompt = false, // Default to false
}) => {
    const [inputValue, setInputValue] = useState(""); // Input state

    const handleOkClick = () => {
        if (isPrompt) {
            onClose(inputValue.trim() || ""); // Return input or default message
        } else {
            onClose(true);
        }
    };

    return (
        <div className={`${styles.overlay}`}>
            <div className={`${styles.alertBox} ${styles[type]}`}>
                <div className={styles.alertContent}>
                    <div className={styles.alertText}>
                        <p>{message}</p>
                        {isPrompt && (
                            <input
                                type="text"
                                className={styles.inputField}
                                placeholder="Enter message..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                            />
                        )}
                    </div>
                </div>
                <div className={styles.buttonContainer}>
                    {isConfirm || isPrompt ? (
                        <>
                            <button
                                className={styles.cancelButton}
                                onClick={() => onClose(false)}
                            >
                                Cancel
                            </button>
                            <button className={styles.okButton} onClick={handleOkClick}>
                                OK
                            </button>
                        </>
                    ) : (
                        <button className={styles.okButton} onClick={() => onClose()}>
                            OK
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Alert;

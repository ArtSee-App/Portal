"use client";

import React from "react";
import styles from "./alert.module.css";

interface AlertProps {
    message: string;
    onClose: (result?: boolean) => void;
    type?: "success" | "error" | "info" | "warning";
    isConfirm?: boolean;
}

const Alert: React.FC<AlertProps> = ({
    message,
    onClose,
    type = "info",
    isConfirm = false,
}) => {
    return (
        <div className={`${styles.overlay}`}>
            <div className={`${styles.alertBox} ${styles[type]}`}>
                <div className={styles.alertText}>
                    <p>{message}</p>
                </div>
                <div className={styles.buttonContainer}>
                    {isConfirm ? (
                        <>
                            <button
                                className={styles.okButton}
                                onClick={() => onClose(true)}
                            >
                                OK
                            </button>
                            <button
                                className={styles.cancelButton}
                                onClick={() => onClose(false)}
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            className={styles.okButton}
                            onClick={() => onClose()}
                        >
                            OK
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Alert;

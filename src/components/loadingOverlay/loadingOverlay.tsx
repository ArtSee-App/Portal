import React from "react";
import styles from "./loadingOverlay.module.css";

interface LoadingOverlayProps {
    isVisible: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.loader}></div>
        </div>
    );
};

export default LoadingOverlay;

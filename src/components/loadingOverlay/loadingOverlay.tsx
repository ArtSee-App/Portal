import React from "react";
import styles from "./loadingOverlay.module.css";

interface LoadingOverlayProps {
    isVisible: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className={styles.overlay}>
            <Loader />
        </div>
    );
};

export const Loader: React.FC = () => (
    <div className={styles.loader}></div>
);

export default LoadingOverlay;

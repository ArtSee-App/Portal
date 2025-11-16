"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./InfoTooltip.module.css";

interface InfoTooltipProps {
    text: string;
}

const InfoTooltip = ({ text }: InfoTooltipProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [position, setPosition] = useState<"top" | "bottom">("bottom");
    const iconRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Detect if mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (isVisible && iconRef.current && tooltipRef.current) {
            // Calculate if tooltip would overflow and adjust position
            const iconRect = iconRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // Check if tooltip would overflow bottom of viewport
            if (iconRect.bottom + tooltipRect.height > viewportHeight - 20) {
                setPosition("top");
            } else {
                setPosition("bottom");
            }
        }
    }, [isVisible]);

    const handleMouseEnter = () => {
        if (!isMobile) {
            setIsVisible(true);
        }
    };

    const handleMouseLeave = () => {
        if (!isMobile) {
            setIsVisible(false);
        }
    };

    const handleClick = () => {
        if (isMobile) {
            setIsVisible(!isVisible);
        }
    };

    // Close tooltip when clicking outside on mobile
    useEffect(() => {
        if (isMobile && isVisible) {
            const handleClickOutside = (event: MouseEvent) => {
                if (
                    iconRef.current &&
                    tooltipRef.current &&
                    !iconRef.current.contains(event.target as Node) &&
                    !tooltipRef.current.contains(event.target as Node)
                ) {
                    setIsVisible(false);
                }
            };

            document.addEventListener("click", handleClickOutside);
            return () => document.removeEventListener("click", handleClickOutside);
        }
    }, [isMobile, isVisible]);

    return (
        <span className={styles.infoTooltipWrapper}>
            <span
                ref={iconRef}
                className={styles.infoIcon}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                aria-label="More information"
            >
                ⓘ
            </span>
            {isVisible && (
                <div
                    ref={tooltipRef}
                    className={`${styles.tooltip} ${styles[position]}`}
                >
                    {text}
                </div>
            )}
        </span>
    );
};

export default InfoTooltip;

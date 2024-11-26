"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./header.module.css";

const Header = () => {
    const [scrolled, setScrolled] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 0);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && sidebarOpen) {
                closeSidebar();
            }
        };

        window.addEventListener("scroll", handleScroll);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [sidebarOpen]);

    const toggleSidebar = () => {
        const sidebarElement = document.querySelector(`.${styles.sidebar}`);
        if (sidebarOpen && sidebarElement) {
            sidebarElement.classList.add(styles.sidebarClosing);
            setTimeout(() => {
                sidebarElement.classList.remove(styles.sidebarClosing); // Remove after animation
                setSidebarOpen(false);
                document.body.style.overflow = "";
            }, 300); // Match animation duration
        } else {
            setSidebarOpen(true);
            document.body.style.overflow = "hidden";
        }
    };

    const closeSidebar = () => {
        const sidebarElement = document.querySelector(`.${styles.sidebar}`);
        if (sidebarElement) {
            sidebarElement.classList.add(styles.sidebarClosing);
            setTimeout(() => {
                sidebarElement.classList.remove(styles.sidebarClosing); // Remove the class after animation completes
                setSidebarOpen(false);
                document.body.style.overflow = "";
            }, 300); // Match the animation duration (0.3s)
        }
    };

    return (
        <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
            <nav className={styles.nav}>
                <div className={styles.logoContainer}>
                    <img src="favicon.png" alt="ArtVista Logo" className={styles.logo} />
                    <span className={styles.logoText}>ArtVista</span>
                </div>
                <ul className={styles.navLinks}>
                    <li>
                        <Link href="/home" onClick={closeSidebar}>
                            Home
                        </Link>
                    </li>
                    <li>
                        <Link href="/home" onClick={closeSidebar}>
                            Account Settings
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="https://artvista.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={closeSidebar}
                        >
                            ArtVista Website
                        </Link>
                    </li>
                    <li>
                        <Link href="/login" onClick={closeSidebar}>
                            Sign Out
                        </Link>
                    </li>
                </ul>
                <button
                    className={`${styles.hamburger} ${sidebarOpen ? styles.active : ""}`}
                    onClick={toggleSidebar}
                    aria-label="Toggle navigation"
                    aria-expanded={sidebarOpen}
                >
                    <span className={`${styles.bar} ${styles.topBar}`}></span>
                    <span className={`${styles.bar} ${styles.middleBar}`}></span>
                    <span className={`${styles.bar} ${styles.bottomBar}`}></span>
                </button>
            </nav>
            {sidebarOpen && (
                <>
                    <div
                        className={`${styles.sidebar} ${sidebarOpen ? "" : styles.sidebarClosing}`}
                    >
                        <ul className={styles.sidebarLinks}>
                            <li>
                                <Link href="/home" onClick={closeSidebar}>
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link href="/home" onClick={closeSidebar}>
                                    Account Settings
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="https://artvista.app/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={closeSidebar}
                                >
                                    ArtVista Website
                                </Link>
                            </li>
                            <li>
                                <Link href="/login" onClick={closeSidebar}>
                                    Sign Out
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div className={styles.overlay} onClick={closeSidebar}></div>
                </>
            )}
        </header>
    );
};

export default Header;

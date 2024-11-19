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
        setSidebarOpen(!sidebarOpen);
        document.body.style.overflow = sidebarOpen ? "" : "hidden";
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
        document.body.style.overflow = "";
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
                        <Link href="https://artvista.app/" onClick={closeSidebar}>
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
                    <div className={styles.sidebar}>
                        <button className={styles.closeButton} onClick={closeSidebar} aria-label="Close sidebar">
                            &times;
                        </button>
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
                                <Link href="/home" onClick={closeSidebar}>
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

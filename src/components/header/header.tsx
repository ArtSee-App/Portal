"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./header.module.css";
import { signOut } from "firebase/auth";
import { auth } from "../../../firebase";
import { useUser } from "@/context/UserContext";

const Header = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, setUser } = useUser();

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error("Error during sign-out:", error);
        }
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && sidebarOpen) {
                closeSidebar();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [sidebarOpen]);

    const toggleSidebar = () => {
        const sidebarElement = document.querySelector(`.${styles.mobileSidebar}`);
        if (sidebarOpen && sidebarElement) {
            sidebarElement.classList.add(styles.sidebarClosing);
            setTimeout(() => {
                sidebarElement.classList.remove(styles.sidebarClosing);
                setSidebarOpen(false);
                document.body.style.overflow = "";
            }, 300);
        } else {
            setSidebarOpen(true);
            document.body.style.overflow = "hidden";
        }
    };

    const closeSidebar = () => {
        const sidebarElement = document.querySelector(`.${styles.mobileSidebar}`);
        if (sidebarElement) {
            sidebarElement.classList.add(styles.sidebarClosing);
            setTimeout(() => {
                sidebarElement.classList.remove(styles.sidebarClosing);
                setSidebarOpen(false);
                document.body.style.overflow = "";
            }, 300);
        }
    };

    return (
        <>
            <header className={styles.header}>
                <nav className={styles.nav}>
                    <div className={styles.logoContainer}>
                        <img src="/favicon.png" alt="ArtVista Logo" className={styles.logo} />
                        <span className={styles.logoText}>
                            ArtVista {user?.type && `(${user.type})`}
                        </span>
                    </div>
                    <ul className={styles.navLinks}>
                        <li>
                            <Link href="/home">
                                Home
                            </Link>
                        </li>
                        {user?.type !== "admin" && (
                            <li>
                                <Link
                                    href={
                                        user?.type === "museum"
                                            ? "/museum?edit=true"
                                            : user?.type === "artist"
                                                ? "/artist?edit=true"
                                                : "/home"
                                    }
                                >
                                    Account Settings
                                </Link>
                            </li>
                        )}
                        <li>
                            <Link
                                href="https://artvista.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ArtVista Website
                            </Link>
                        </li>
                    </ul>
                    <div className={styles.signOutContainer}>
                        <Link href="/login" onClick={handleSignOut} className={styles.signOutButton}>
                            &gt; Sign Out
                        </Link>
                    </div>
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
            </header>
            {sidebarOpen && (
                <>
                    <div className={`${styles.mobileSidebar} ${sidebarOpen ? "" : styles.sidebarClosing}`}>
                        <div className={styles.sidebarLogoContainer}>
                            <img src="/favicon.png" alt="ArtVista Logo" className={styles.sidebarLogo} />
                            <span className={styles.sidebarLogoText}>
                                ArtVista {user?.type && `(${user.type})`}
                            </span>
                        </div>
                        <ul className={styles.sidebarLinks}>
                            <li>
                                <Link href="/home" onClick={closeSidebar}>
                                    Home
                                </Link>
                            </li>
                            {user?.type !== "admin" && (
                                <li>
                                    <Link
                                        href={
                                            user?.type === "museum"
                                                ? "/museum?edit=true"
                                                : user?.type === "artist"
                                                    ? "/artist?edit=true"
                                                    : "/home"
                                        }
                                        onClick={closeSidebar}
                                    >
                                        Account Settings
                                    </Link>
                                </li>
                            )}
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
                        </ul>
                        <div className={styles.sidebarSignOutContainer}>
                            <Link href="/login" onClick={() => {
                                closeSidebar();
                                handleSignOut();
                            }} className={styles.sidebarSignOutButton}>
                                &gt; Sign Out
                            </Link>
                        </div>
                    </div>
                    <div className={styles.overlay} onClick={closeSidebar}></div>
                </>
            )}
        </>
    );
};

export default Header;

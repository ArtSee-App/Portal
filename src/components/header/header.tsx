"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    FiCpu, FiExternalLink, FiFileText, FiHome, FiLogOut, FiMapPin, FiMenu, FiShield, FiSmartphone,
    FiTarget, FiUser, FiX,
} from "react-icons/fi";
import styles from "./header.module.css";
import ThemeSwitch from "./ThemeSwitch";
import { signOut } from "firebase/auth";
import { auth } from "../../../firebase";
import { useUser } from "@/context/UserContext";

type NavItem = { href: string; label: string; icon: React.ReactNode; match: string; external?: boolean };

const Header = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, setUser } = useUser();
    const pathname = usePathname();

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error("Error during sign-out:", error);
        }
    };

    const closeSidebar = useCallback(() => {
        setSidebarOpen(false);
        document.body.style.overflow = "";
    }, []);

    const toggleSidebar = () => {
        if (sidebarOpen) {
            closeSidebar();
        } else {
            setSidebarOpen(true);
            document.body.style.overflow = "hidden";
        }
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && sidebarOpen) closeSidebar();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [sidebarOpen, closeSidebar]);

    const accountHref =
        user?.type === "museum" ? "/museum?edit=true" : user?.type === "artist" ? "/artist?edit=true" : "/home";

    const items: NavItem[] = [
        { href: "/home", label: "Home", icon: <FiHome aria-hidden />, match: "/home" },
        ...(user?.type === "admin"
            ? [
                { href: "/admin/bots", label: "Bots", icon: <FiCpu aria-hidden />, match: "/admin/bots" },
                { href: "/admin/indexing", label: "Indexing", icon: <FiTarget aria-hidden />, match: "/admin/indexing" },
                { href: "/admin/museums", label: "Museums", icon: <FiMapPin aria-hidden />, match: "/admin/museums" },
                { href: "/admin/rights", label: "Rights", icon: <FiShield aria-hidden />, match: "/admin/rights" },
                { href: "/admin/app-version", label: "App version", icon: <FiSmartphone aria-hidden />, match: "/admin/app-version" },
                { href: "/admin/news", label: "News", icon: <FiFileText aria-hidden />, match: "/admin/news" },
            ]
            : [{ href: accountHref, label: "Account settings", icon: <FiUser aria-hidden />, match: accountHref.split("?")[0] }]),
        { href: "https://artvista.app/", label: "ArtVista website", icon: <FiExternalLink aria-hidden />, match: "", external: true },
    ];

    const isCurrent = (item: NavItem) =>
        !item.external && item.match !== "/home"
            ? pathname === item.match || pathname.startsWith(item.match + "/")
            : !item.external && pathname === "/home";

    const links = (onNavigate?: () => void) =>
        items.map((item) => (
            <li key={item.label}>
                <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={isCurrent(item) ? styles.current : undefined}
                    aria-current={isCurrent(item) ? "page" : undefined}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                    {item.icon}
                    <span>{item.label}</span>
                </Link>
            </li>
        ));

    const brand = (
        <>
            <img src="/favicon.png" alt="" className={styles.logo} />
            <span className={styles.logoText}>
                ArtVista
                {user?.type && <span className={styles.role}>{user.type}</span>}
            </span>
        </>
    );

    return (
        <>
            <header className={styles.header}>
                <nav className={styles.nav} aria-label="Main">
                    <div className={styles.logoContainer}>{brand}</div>
                    <ul className={styles.navLinks}>{links()}</ul>
                    <div className={styles.signOutContainer}>
                        <ThemeSwitch />
                        <Link href="/login" onClick={handleSignOut} className={styles.signOutButton}>
                            <FiLogOut aria-hidden />
                            <span>Sign out</span>
                        </Link>
                    </div>
                    <button
                        className={styles.hamburger}
                        onClick={toggleSidebar}
                        aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
                        aria-expanded={sidebarOpen}
                    >
                        {sidebarOpen ? <FiX aria-hidden /> : <FiMenu aria-hidden />}
                    </button>
                </nav>
            </header>
            {sidebarOpen && (
                <>
                    <div className={styles.mobileSidebar}>
                        <div className={styles.sidebarLogoContainer}>{brand}</div>
                        <ul className={styles.sidebarLinks}>{links(closeSidebar)}</ul>
                        <div className={styles.sidebarSignOutContainer}>
                            <ThemeSwitch />
                            <Link
                                href="/login"
                                onClick={() => {
                                    closeSidebar();
                                    handleSignOut();
                                }}
                                className={styles.signOutButton}
                            >
                                <FiLogOut aria-hidden />
                                <span>Sign out</span>
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

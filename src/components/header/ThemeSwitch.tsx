"use client";

import { useEffect, useState } from "react";
import { FiMonitor, FiMoon, FiSun } from "react-icons/fi";
import styles from "./header.module.css";

type Choice = "system" | "light" | "dark";
const KEY = "artvista-theme";

const systemTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

const apply = (choice: Choice) => {
    document.documentElement.dataset.theme = choice === "system" ? systemTheme() : choice;
};

/** Light, dark, or whatever the device uses. The choice is kept in localStorage; the inline
 *  script in src/app/layout.tsx applies it before the first paint. */
const ThemeSwitch = () => {
    const [choice, setChoice] = useState<Choice>("system");

    useEffect(() => {
        const saved = localStorage.getItem(KEY);
        setChoice(saved === "light" || saved === "dark" ? saved : "system");
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => {
            const current = localStorage.getItem(KEY);
            if (current !== "light" && current !== "dark") apply("system");
        };
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, []);

    const choose = (next: Choice) => {
        setChoice(next);
        if (next === "system") localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, next);
        apply(next);
    };

    const options: { value: Choice; label: string; icon: React.ReactNode }[] = [
        { value: "light", label: "Light", icon: <FiSun aria-hidden /> },
        { value: "system", label: "Match device", icon: <FiMonitor aria-hidden /> },
        { value: "dark", label: "Dark", icon: <FiMoon aria-hidden /> },
    ];

    return (
        <div className={styles.themeSwitch} role="radiogroup" aria-label="Theme">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={choice === o.value}
                    aria-label={o.label}
                    title={o.label}
                    className={`${styles.themeOption} ${choice === o.value ? styles.themeOptionOn : ""}`}
                    onClick={() => choose(o.value)}
                >
                    {o.icon}
                </button>
            ))}
        </div>
    );
};

export default ThemeSwitch;

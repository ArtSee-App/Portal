"use client";

import Link from "next/link";
import styles from "./footer.module.css";

const Footer = () => {
    return (
        <footer className={styles.footer}>
            <p>&copy; 2024 Vista Technologies BV</p>
            <ul className={styles.navLinks}>
                <li>
                    <Link href="https://artvista.app/terms">
                        Terms and Conditions
                    </Link>
                </li>
                <li>
                    <a
                        href="https://artvista.app/contact"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Contact
                    </a>
                </li>
                <li>
                    <a
                        href="https://www.linkedin.com/company/artvista-app/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        LinkedIn
                    </a>
                </li>
                <li>
                    <a
                        href="https://www.instagram.com/artvista.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Instagram
                    </a>
                </li>
            </ul>
        </footer>
    );
};

export default Footer;

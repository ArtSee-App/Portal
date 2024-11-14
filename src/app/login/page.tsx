"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation"; // Import useRouter

export default function Login() {
  const router = useRouter(); // Initialize useRouter
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerAsArtist, setRegisterAsArtist] = useState(true);

  const handleToggleRegister = () => {
    setIsRegistering((prev) => !prev);
    setRegisterAsArtist(false);
  };

  const handleRegisterAsArtist = () => {
    setIsRegistering(true);
    setRegisterAsArtist(true);
  };

  const handleRegisterAsMuseum = () => {
    setIsRegistering(true);
    setRegisterAsArtist(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    router.push("/home"); // Navigate to /home on form submission
  };

  return (
    <div className={styles.page}>
      <div
        className={`${styles.mainWrapper} ${isRegistering ? styles.slide : ""}`}
      >
        <main className={styles.main}>
          <h1 className={styles.heading}>ArtVista Portal</h1>
          <form className={styles.form} onSubmit={handleSubmit}>
            {isRegistering ? (
              <>
                <input
                  type="text"
                  placeholder={registerAsArtist ? "Full Name" : "Museum's Name"}
                  className={styles.input}
                />
                <input
                  type="email"
                  placeholder="Email"
                  className={styles.input}
                />
                <input
                  type="password"
                  placeholder="Create Password"
                  className={styles.input}
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  className={styles.input}
                />
                <button type="submit" className={styles.button}>
                  Register
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Email"
                  className={styles.input}
                />
                <input
                  type="password"
                  placeholder="Password"
                  className={styles.input}
                />
                <button type="submit" className={styles.button}>
                  Log In
                </button>
                <a href="#" className={styles.forgotPassword}>
                  Forgot Password?
                </a>

              </>
            )}
          </form>

          <hr className={styles.separator} />

          <div className={styles.registerContainer}>
            {isRegistering ? (
              <div className={styles.buttonWrapper}>
                <button
                  className={styles.registerArtist}
                  onClick={handleToggleRegister}
                >
                  Already registered? Log in instead
                </button>
              </div>
            ) : (
              <>
                <div className={styles.buttonWrapper}>
                  <button
                    className={styles.registerArtist}
                    onClick={handleRegisterAsArtist}
                  >
                    🎨 Register as Artist
                  </button>
                </div>
                <div className={styles.buttonWrapper}>
                  <button
                    className={styles.registerMuseum}
                    onClick={handleRegisterAsMuseum}
                  >
                    🏛️ Register as Museum
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
        <div className={styles.imageContainer}>
          <img src="/logo.png" alt="ArtVista Logo" className={styles.image} />
          <p className={styles.welcomeText}>
            Welcome to the ArtVista Portal – empowering artists and museums to
            seamlessly manage and showcase their collections
          </p>
        </div>
      </div>
    </div>
  );
}

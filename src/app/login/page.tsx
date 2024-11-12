// app/login/page.tsx
import React from "react";
import styles from "./page.module.css";

export default function Login() {
  return (
    <div className={styles.page}>
      <div className={styles.mainWrapper}>
        <main className={styles.main}>
          <h1 className={styles.heading}>ArtVista Portal</h1>
          <form className={styles.form}>
            <input type="text" placeholder="Username" className={styles.input} />
            <input type="password" placeholder="Password" className={styles.input} />
            <button type="submit" className={styles.button}>Log In</button>
          </form>

          <hr className={styles.separator} />

          <div className={styles.registerContainer}>
            <div className={styles.buttonWrapper}>
              <button className={styles.registerArtist}>🎨 Register as Artist</button>
            </div>
            <div className={styles.buttonWrapper}>
              <button className={styles.registerMuseum}>🏛️ Register as Museum</button>
            </div>
          </div>
        </main>
      </div>

    </div>
  );
}

"use client";

import React from "react";
import styles from "./page.module.css";

export default function Login() {
  return (
    <div className={styles.page}>
      <div className={styles.headerList}>
        <div className={styles.shapeWhite}>Published:</div>
        <div className={styles.shapeWhite}>Pending:</div>
        <div className={styles.shapePrimary}>View All Artworks</div>
        <div className={styles.shapeSecondary}>Add Artwork(s)</div>
      </div>
      <div className={styles.listContainer}>
        <div className={styles.listHeader}>
          <span>Latest uploaded artworks</span>
          <button className={styles.refreshButton}>Refresh</button>
        </div>
        <div className={styles.artworkList}>
          <div className={styles.artworkItem}>
            <img src="/placeholder-image.jpg" alt="Artwork" className={styles.artworkImage} />
            <span className={styles.artworkTitle}>Title</span>
            <button className={styles.viewDetails}>View artwork's details</button>
          </div>
          <div className={styles.artworkItem}>
            <img src="/placeholder-image.jpg" alt="Artwork" className={styles.artworkImage} />
            <span className={styles.artworkTitle}>Title</span>
            <button className={styles.viewDetails}>View artwork's details</button>
          </div>
          <div className={styles.artworkItem}>
            <img src="/placeholder-image.jpg" alt="Artwork" className={styles.artworkImage} />
            <span className={styles.artworkTitle}>Title</span>
            <button className={styles.viewDetails}>View artwork's details</button>
          </div>
          <div className={styles.artworkItem}>
            <img src="/placeholder-image.jpg" alt="Artwork" className={styles.artworkImage} />
            <span className={styles.artworkTitle}>Title</span>
            <button className={styles.viewDetails}>View artwork's details</button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import styles from "./page.module.css";

export default function Login() {
  return (
    <div className={styles.page}>
      <div className={styles.headerList}>
        <div className={styles.headerLeft}>
          <div className={styles.shapeWhite}>Published:</div>
          <div className={styles.shapeWhite}>Pending:</div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.shapePrimary}>Add Artist</div>
          <div className={styles.shapeSecondary}>Add Artwork</div>
        </div>
      </div>
      <div className={styles.listContainer}>
        <div className={styles.listHeader}>
          <span>Latest uploaded artworks</span>
          <button className={styles.refreshButton}>Refresh</button>
        </div>
        <div className={styles.artworkList}>
          <div className={styles.artworkItem}>
            <img src="https://collectionapi.metmuseum.org/api/collection/v1/iiif/45434/134438/main-image" alt="Artwork" className={styles.artworkImage} />
            <span className={styles.artworkTitle}>Katsushika Hokusai | Under the Wave off Kanagawa (Kanagawa oki nami ura)</span>
            <button className={styles.viewDetails}>View artwork's details →</button>
          </div>
          <div className={styles.artworkItem}>
            <img src="https://collectionapi.metmuseum.org/api/collection/v1/iiif/45434/134438/main-image" alt="Artwork" className={styles.artworkImage} />
            <span className={styles.artworkTitle}>Katsushika Hokusai | Under the Wave off Kanagawa (Kanagawa oki nami ura)</span>
            <button className={styles.viewDetails}>View artwork's details →</button>
          </div>
          <div className={styles.artworkItem}>
            <img src="https://collectionapi.metmuseum.org/api/collection/v1/iiif/45434/134438/main-image" alt="Artwork" className={styles.artworkImage} />
            <span className={styles.artworkTitle}>Katsushika Hokusai | Under the Wave off Kanagawa (Kanagawa oki nami ura)</span>
            <button className={styles.viewDetails}>View artwork's details →</button>
          </div>
          <div className={styles.artworkItem}>
            <img src="https://collectionapi.metmuseum.org/api/collection/v1/iiif/45434/134438/main-image" alt="Artwork" className={styles.artworkImage} />
            <span className={styles.artworkTitle}>Katsushika Hokusai | Under the Wave off Kanagawa (Kanagawa oki nami ura)</span>
            <button className={styles.viewDetails}>View artwork's details →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

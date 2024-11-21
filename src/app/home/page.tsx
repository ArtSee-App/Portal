"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import Header from "../../components/header/header";
import { useRouter } from "next/navigation"; // Import useRouter
import Footer from "../../components/footer/footer";

export default function Home() {
  const router = useRouter(); // Initialize router

  const [activeTab, setActiveTab] = useState("artworks");
  const [searchText, setSearchText] = useState(""); // State to manage search input
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const [artworks, setArtworks] = useState([
    { id: 1, title: "Artwork 1 | Artist", image: "https://collectionapi.metmuseum.org/api/collection/v1/iiif/45434/134438/main-image" },
    { id: 2, title: "Artwork 2 | Artist", image: "https://collectionapi.metmuseum.org/api/collection/v1/iiif/45434/134438/main-image" },
    { id: 3, title: "Artwork 3 | Artist", image: "https://collectionapi.metmuseum.org/api/collection/v1/iiif/45434/134438/main-image" },
    { id: 4, title: "Artwork 4 | Artist", image: "https://collectionapi.metmuseum.org/api/collection/v1/iiif/45434/134438/main-image" },
    { id: 5, title: "Artwork 5 | Artist", image: "https://collectionapi.metmuseum.org/api/collection/v1/iiif/45434/134438/main-image" },
    { id: 6, title: "Artwork 6 | Artist", image: "https://collectionapi.metmuseum.org/api/collection/v1/iiif/45434/134438/main-image" },
    // Add as many artworks as needed
  ]);
  const [artists, setArtists] = useState([
    { id: 1, name: "Artist 1", image: "https://dutchmuseumgiftshop.nl/wp-content/uploads/2023/09/s0016V1962.jpg" },
    { id: 2, name: "Artist 2", image: "https://dutchmuseumgiftshop.nl/wp-content/uploads/2023/09/s0016V1962.jpg" },
    { id: 3, name: "Artist 3", image: "https://dutchmuseumgiftshop.nl/wp-content/uploads/2023/09/s0016V1962.jpg" },
    { id: 4, name: "Artist 4", image: "https://dutchmuseumgiftshop.nl/wp-content/uploads/2023/09/s0016V1962.jpg" },
    { id: 5, name: "Artist 5", image: "https://dutchmuseumgiftshop.nl/wp-content/uploads/2023/09/s0016V1962.jpg" },
    { id: 6, name: "Artist 6", image: "https://dutchmuseumgiftshop.nl/wp-content/uploads/2023/09/s0016V1962.jpg" },
    { id: 7, name: "Artist 7", image: "https://dutchmuseumgiftshop.nl/wp-content/uploads/2023/09/s0016V1962.jpg" },
    // Add as many artists as needed
  ]);


  const filteredArtworks = artworks.filter((artwork) =>
    artwork.title.toLowerCase().includes(searchText.toLowerCase())
  );
  const filteredArtists = artists.filter((artist) =>
    artist.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalArtworkPages = Math.ceil(filteredArtworks.length / itemsPerPage);
  const totalArtistPages = Math.ceil(filteredArtists.length / itemsPerPage);


  const paginatedArtworks = filteredArtworks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const paginatedArtists = filteredArtists.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );





  const handleToggle = (tab: string) => {
    setActiveTab(tab);
    setSearchText(""); // Clear search input when toggling
    setCurrentPage(1); // Reset to the first page
    console.log(`Switched to: ${tab}`);
  };

  const handlePageChange = (page: number) => {
    const maxPages =
      activeTab === "artworks" ? totalArtworkPages : totalArtistPages;
    if (page >= 1 && page <= maxPages) {
      setCurrentPage(page);
      console.log(`Navigated to page ${page}`);
    }
  };


  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.headerList}>
          <div className={styles.headerLeft}>
            <div className={styles.shapeWhite}>Published:</div>
            <div className={styles.shapeWhite}>Pending:</div>
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.shapePrimary}
              onClick={() => router.push("/addartist")} // Navigate to /addartist
            >
              Add Artist
            </button>
            <button
              className={styles.shapeSecondary}
              onClick={() => router.push("/addartwork")} // Navigate to /addartwork
            >
              Add Artwork
            </button>
          </div>
        </div>
        <div className={styles.listContainer}>
          <div className={styles.listHeader}>
            <div className={styles.toggleContainer}>
              <button
                className={`${styles.toggleButton} ${activeTab === "artworks" ? styles.active : ""
                  }`}
                onClick={() => handleToggle("artworks")}
              >
                Artworks
              </button>
              <button
                className={`${styles.toggleButton} ${activeTab === "artists" ? styles.active : ""
                  }`}
                onClick={() => handleToggle("artists")}
              >
                Artists
              </button>
            </div>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)} // Update search text
                className={styles.searchBar}
                placeholder={`Search for a specific ${activeTab === "artworks" ? "artwork" : "artist"
                  }...`}
              />
              <span className={styles.searchIcon}>🔍</span>
            </div>
            <button className={styles.refreshButton}>Refresh</button>
          </div>
          <div className={styles.artworkList}>
            {activeTab === "artworks" ? (
              <>
                <div className={styles.artworkList}>
                  {paginatedArtworks.map((artwork) => (
                    <div key={artwork.id} className={styles.artworkItem}>
                      <img src={artwork.image} alt={artwork.title} className={styles.artworkImage} />
                      <span className={styles.artworkTitle}>{artwork.title}</span>
                      <button className={styles.viewDetails}>View artwork's details →</button>
                    </div>
                  ))}
                </div>
                <div className={styles.pagination}>
                  {Array.from({ length: totalArtworkPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      className={`${styles.pageButton} ${page === currentPage ? styles.activePage : ""}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className={styles.artworkList}>
                  {paginatedArtists.map((artist) => (
                    <div key={artist.id} className={styles.artworkItem}>
                      <img src={artist.image} alt={artist.name} className={styles.artworkImage} />
                      <span className={styles.artworkTitle}>{artist.name}</span>
                      <button className={styles.viewDetails}>View artist's details →</button>
                    </div>
                  ))}
                </div>
                <div className={styles.pagination}>
                  {Array.from(
                    {
                      length: activeTab === "artworks" ? totalArtworkPages : totalArtistPages,
                    },
                    (_, index) => index + 1
                  ).map((page) => (
                    <button
                      key={page}
                      className={`${styles.pageButton} ${page === currentPage ? styles.activePage : ""
                        }`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

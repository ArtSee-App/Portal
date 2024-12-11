"use client";

import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import Header from "../../components/header/header";
import { useRouter } from "next/navigation"; // Import useRouter
import Footer from "../../components/footer/footer";
import { FiRefreshCw } from "react-icons/fi"; // Import a simple, symmetric refresh icon
import { useUser } from "@/context/UserContext";
import { FiCheck, FiX, FiEdit } from "react-icons/fi";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebase"; // Update this with your Firebase setup
import { doc, updateDoc, deleteDoc } from "firebase/firestore";

type AdminData = {
  id: string;
  name: string;
};

export default function Home() {
  const router = useRouter(); // Initialize router
  const { user } = useUser(); // Access user from context
  const [adminData, setAdminData] = useState<AdminData[]>([]);

  const [isClient, setIsClient] = useState(false); // Track if the component is client-side

  useEffect(() => {
    setIsClient(true); // Ensure we're on the client
  }, []);


  const [activeTab, setActiveTab] = useState<"artworks" | "artists" | "museums">("artworks");
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
    { id: 5, name: "Artist 5", imasge: "https://dutchmuseumgiftshop.nl/wp-content/uploads/2023/09/s0016V1962.jpg" },
    { id: 6, name: "Artist 6", image: "https://dutchmuseumgiftshop.nl/wp-content/uploads/2023/09/s0016V1962.jpg" },
    { id: 7, name: "Artist 7", image: "https://dutchmuseumgiftshop.nl/wp-content/uploads/2023/09/s0016V1962.jpg" },
    // Add as many artists as needed
  ]);

  const [museums, setMuseums] = useState([
    { id: 1, name: "Museum 1", location: "City 1", image: "https://images.adsttc.com/media/images/55e6/f619/e58e/ce03/1300/0374/large_jpg/PORTADA_06_VanGoghMuseum_EntranceBuilding_HansvanHeeswijkArchitects_photo_RonaldTilleman.jpg?1441199623" },
    { id: 2, name: "Museum 2", location: "City 2", image: "https://images.adsttc.com/media/images/55e6/f619/e58e/ce03/1300/0374/large_jpg/PORTADA_06_VanGoghMuseum_EntranceBuilding_HansvanHeeswijkArchitects_photo_RonaldTilleman.jpg?1441199623" },
    { id: 3, name: "Museum 3", location: "City 3", image: "https://images.adsttc.com/media/images/55e6/f619/e58e/ce03/1300/0374/large_jpg/PORTADA_06_VanGoghMuseum_EntranceBuilding_HansvanHeeswijkArchitects_photo_RonaldTilleman.jpg?1441199623" },
    { id: 4, name: "Museum 4", location: "City 4", image: "https://images.adsttc.com/media/images/55e6/f619/e58e/ce03/1300/0374/large_jpg/PORTADA_06_VanGoghMuseum_EntranceBuilding_HansvanHeeswijkArchitects_photo_RonaldTilleman.jpg?1441199623" },
    { id: 5, name: "Museum 5", location: "City 5", image: "https://images.adsttc.com/media/images/55e6/f619/e58e/ce03/1300/0374/large_jpg/PORTADA_06_VanGoghMuseum_EntranceBuilding_HansvanHeeswijkArchitects_photo_RonaldTilleman.jpg?1441199623" },
  ]);

  const fetchFirestoreData = async (type: "artist" | "museum") => {
    try {
      const q = query(
        collection(db, "users"),
        where("approved", "==", false),
        where("type", "==", type)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.id, // Use document name for now
      }));
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const docRef = doc(db, "users", id);
      await updateDoc(docRef, { approved: true });
      console.log(`Document ${id} approved.`);
      // Optionally, remove it from adminData for UI update
      setAdminData((prevData) => prevData.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error approving document:", error);
    }
  };

  // Reject action
  const handleReject = async (id: string) => {
    try {

      // Delete the document from Firestore
      const docRef = doc(db, "users", id);
      await deleteDoc(docRef);
      console.log(`Document ${id} deleted.`);

      // Optionally, update the UI to remove the document from adminData
      setAdminData((prevData) => prevData.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error rejecting document:", error);
    }
  };



  const filteredArtworks = artworks.filter((artwork) =>
    artwork.title.toLowerCase().includes(searchText.toLowerCase())
  );
  const filteredArtists = artists.filter((artist) =>
    artist.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredMuseums = museums.filter((museum) =>
    museum.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredAdminData = adminData.filter((item) =>
    item.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const totalArtworkPages = Math.ceil(filteredArtworks.length / itemsPerPage);
  const totalArtistPages = Math.ceil(filteredArtists.length / itemsPerPage);
  const totalMuseumPages = Math.ceil(adminData.length / itemsPerPage);


  const paginatedArtworks = filteredArtworks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const paginatedArtists = filteredArtists.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const paginatedMuseums = filteredMuseums.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );




  const handleToggle = (tab: "artworks" | "artists" | "museums") => {
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

  useEffect(() => {
    if (user?.type === "admin") {
      const type = activeTab === "artists" ? "artist" : activeTab === "museums" ? "museum" : null;
      if (type) {
        fetchFirestoreData(type).then((data) => setAdminData(data)); // No more type errors
      }
    }
  }, [activeTab, user?.type]);



  return (
    <>
      <Header />
      <div className={styles.page}>
        {user?.type !== "admin" && (
          <div className={styles.headerList}>
            <div className={styles.headerLeft}>
              <div className={styles.shapeWhite}>Published:</div>
              <div className={styles.shapeWhite}>Pending:</div>
            </div>
            <div className={styles.headerRight}>
              {user?.type === "museum" && (
                <button
                  className={styles.shapePrimary}
                  onClick={() => router.push("/artist")} // Navigate to /artist
                >
                  Add Artist
                </button>
              )}
              <button
                className={styles.shapeSecondary}
                onClick={() => router.push("/artwork")} // Navigate to /artwork
              >
                Add Artwork
              </button>
            </div>
          </div>
        )}
        <div
          className={`${styles.listContainer} ${user?.type === "admin" ? styles.adminBorderRadius : ""
            }`}
        >
          <div className={styles.listHeader}>
            <div className={styles.toggleContainer}>
              {user?.type === "admin" ? (
                <>
                  <button
                    className={`${styles.toggleButton} ${activeTab === "museums" ? styles.active : ""
                      }`}
                    onClick={() => handleToggle("museums")}
                  >
                    Museums
                  </button>
                  <button
                    className={`${styles.toggleButton} ${activeTab === "artists" ? styles.active : ""
                      }`}
                    onClick={() => handleToggle("artists")}
                  >
                    Artists
                  </button>

                  <button
                    className={`${styles.toggleButton} ${activeTab === "artworks" ? styles.active : ""
                      }`}
                    onClick={() => handleToggle("artworks")}
                  >
                    Artworks
                  </button>
                </>
              ) : user?.type === "museum" ? (
                <>
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
                </>
              ) : (
                user?.type === "artist" && (
                  <button
                    className={`${styles.toggleButton} ${activeTab === "artworks" ? styles.active : ""
                      }`}
                    onClick={() => handleToggle("artworks")}
                  >
                    Artworks
                  </button>
                )
              )}
            </div>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)} // Update search text
                className={styles.searchBar}
                placeholder={`Search for a specific ${activeTab === "artworks"
                  ? "artwork"
                  : activeTab === "artists"
                    ? "artist"
                    : "museum"
                  }...`}
              />
              <span className={styles.searchIcon}>🔍</span>
            </div>
            <div
              className={styles.refreshIcon}
            >
              <FiRefreshCw />
            </div>
          </div>
          <div className={styles.artworkList}>
            {activeTab === "artworks" ? (
              <>
                <div className={styles.artworkList}>
                  {paginatedArtworks.map((artwork) => (
                    <div key={artwork.id} className={styles.artworkItem}>
                      <img
                        src={artwork.image}
                        alt={artwork.title}
                        className={styles.artworkImage}
                      />
                      <span className={styles.artworkTitle}>{artwork.title}</span>
                      {user?.type === "admin" ? (
                        <div className={styles.adminButtons}>
                          <button className={styles.approveButton}>

                            <FiCheck />
                          </button>
                          <button className={styles.rejectButton}>
                            <FiX />
                          </button>
                          <button
                            className={styles.editButton}
                            onClick={() => {
                              if (activeTab === "artworks") {
                                router.push("/artwork?edit=true");
                              } else if (activeTab === "artists") {
                                router.push("/artist?edit=true");
                              } else if (activeTab === "museums") {
                                router.push("/museum");
                              }
                            }}
                          >
                            <FiEdit />
                          </button>
                        </div>
                      ) : (
                        <button
                          className={styles.viewDetails}
                          onClick={() => {
                            if (user?.type === "artist" || user?.type === "museum")
                              router.push(`/artwork?edit=true`);
                          }}
                        >
                          View artwork's details →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className={styles.pagination}>
                  {Array.from(
                    { length: totalArtworkPages },
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

            ) : activeTab === "artists" ? (
              <>
                <div className={styles.artworkList}>
                  {user?.type === "admin"
                    ? filteredAdminData
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((artist) => (
                        <div key={artist.id} className={styles.artworkItem}>
                          <span className={styles.artworkTitle}>{artist.name}</span>
                          <div className={styles.adminButtons}>
                            <button
                              className={styles.approveButton}
                              onClick={() => handleApprove(artist.id)} // Approve artist
                            >
                              <FiCheck />
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleReject(artist.id)} // Reject artist
                            >
                              <FiX />
                            </button>
                            <button
                              className={styles.editButton}
                              onClick={() => router.push("/artist?edit=true")}
                            >
                              <FiEdit />
                            </button>
                          </div>
                        </div>
                      ))
                    : filteredArtists
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((artist) => (
                        <div key={artist.id} className={styles.artworkItem}>
                          <img
                            src={artist.image}
                            alt={artist.name}
                            className={styles.artworkImage}
                          />
                          <span className={styles.artworkTitle}>{artist.name}</span>
                          <button
                            className={styles.viewDetails}
                            onClick={() => router.push(`/artist/${artist.id}`)}
                          >
                            View artist's details →
                          </button>
                        </div>
                      ))}
                </div>
                <div className={styles.pagination}>
                  {Array.from(
                    {
                      length:
                        user?.type === "admin"
                          ? Math.ceil(filteredAdminData.length / itemsPerPage)
                          : Math.ceil(filteredArtists.length / itemsPerPage),
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

            ) : activeTab === "museums" ? (
              <>
                <div className={styles.artworkList}>
                  {filteredAdminData
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((museum) => (
                      <div key={museum.id} className={styles.artworkItem}>
                        <span className={styles.artworkTitle}>{museum.name}</span>
                        {user?.type === "admin" ? (
                          <div className={styles.adminButtons}>
                            <button
                              className={styles.approveButton}
                              onClick={() => handleApprove(museum.id)}
                            >
                              <FiCheck />
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleReject(museum.id)}
                            >
                              <FiX />
                            </button>
                            <button
                              className={styles.editButton}
                              onClick={() => router.push("/museum")}
                            >
                              <FiEdit />
                            </button>
                          </div>
                        ) : (
                          <button className={styles.viewDetails}>
                            View museum's details →
                          </button>
                        )}
                      </div>
                    ))}
                </div>
                <div className={styles.pagination}>
                  {Array.from(
                    {
                      length:
                        Math.ceil(filteredAdminData.length / itemsPerPage),
                    },
                    (_, index) => index + 1
                  ).map((page) => (
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
            ) : null}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

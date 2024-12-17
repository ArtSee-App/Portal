"use client";

import React, { useEffect, useRef, useState } from "react";
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
import Link from "next/link";

type AdminData = {
  id: string;
  name: string;
};

type Artwork = {
  id: number;
  title: string;
  image: string;
};


export default function Home() {
  const router = useRouter(); // Initialize router
  const { user, getIdToken, isLoadingUser } = useUser(); // Access user from context
  const [adminData, setAdminData] = useState<AdminData[]>([]);
  const [isLoading, setIsLoading] = useState(false); //TODO set to true in the future

  const [isClient, setIsClient] = useState(false); // Track if the component is client-side

  useEffect(() => {
    setIsClient(true); // Ensure we're on the client
  }, []);


  const [activeTab, setActiveTab] = useState<"artworks" | "artists" | "museums">("artworks");
  const [searchText, setSearchText] = useState(""); // State to manage search input
  const [currentPage, setCurrentPage] = useState(1);

  const [pageCount, setPageCount] = useState(1);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Loader for "Load More"
  const [hasMoreData, setHasMoreData] = useState(true); // Tracks if there's more data to load
  const [isRefreshing, setIsRefreshing] = useState(false); // Track refresh state
  const [isSearchActive, setIsSearchActive] = useState(false);

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



  const filteredArtists = artists.filter((artist) =>
    artist.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredMuseums = museums.filter((museum) =>
    museum.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredAdminData = adminData.filter((item) =>
    item.name.toLowerCase().includes(searchText.toLowerCase())
  );






  const handleToggle = (tab: "artworks" | "artists" | "museums") => {
    setActiveTab(tab);
    setSearchText(""); // Clear search input when toggling
    setCurrentPage(1); // Reset to the first page
    console.log(`Switched to: ${tab}`);
  };

  const fetchArtworksFromAPI = async (page = 1) => {
    if (page === 1) setIsLoading(true); // Set loading to true initially
    try {
      if (user) {
        const token = await getIdToken();
        const response = await fetch(
          `https://api.artvista.app/get_artworks_to_portal/?artist_portal_token=${token}&page_count=${page}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: { artwork_id: number; title: string; spaces_dir: string }[] = await response.json();
        console.log(`API Response for Page ${page}:`, data);

        // Filter valid artworks
        const artworksData = data.filter((item) => item.artwork_id);

        if (artworksData.length === 0 && page > 1) {
          setHasMoreData(false); // No more data
          alert("No more artworks to load.");
        } else {
          setHasMoreData(true); // Data is available
        }

        const formattedArtworks: Artwork[] = artworksData.map((item) => ({
          id: item.artwork_id,
          title: item.title,
          image: item.spaces_dir,
        }));

        setArtworks((prev) => [...prev, ...formattedArtworks]);
      } else {
        console.error("User is not logged in.");
      }
    } catch (error) {
      console.error("Error fetching artworks:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const fetchArtworksFromSearchAPI = async (title: string) => {
    setIsLoading(true); // Start loading
    try {
      if (user) {
        const token = await getIdToken(); // Get token for authentication
        const response = await fetch(
          `https://api.artvista.app/search_for_artworks_to_portal/?artist_portal_token=${token}&title=${encodeURIComponent(
            title
          )}&return_count=4`,
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: { artwork_id: number; title: string; spaces_dir: string }[] = await response.json();
        console.log(`Search API Response:`, data);

        const formattedArtworks: Artwork[] = data.map((item) => ({
          id: item.artwork_id,
          title: item.title,
          image: item.spaces_dir,
        }));

        setArtworks(formattedArtworks); // Update artworks with search results
      } else {
        console.error("User is not logged in.");
      }
    } catch (error) {
      console.error("Error fetching artworks from search API:", error);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  // Debounce search effect
  useEffect(() => {
    const resetToPageOne = async () => {
      setPageCount(1); // Reset to page 1
      setArtworks([]); // Clear current artworks
      setHasMoreData(true); // Reset "has more data"
      await fetchArtworksFromAPI(1); // Fetch page 1 explicitly
    };

    if (searchText.length >= 1) {
      fetchArtworksFromSearchAPI(searchText); // Trigger search API call
      setIsSearchActive(true);
    } else if (searchText.length === 0 && !isRefreshing && isSearchActive) {
      resetToPageOne(); // Reset and fetch page 1 when search is cleared
    }
  }, [searchText]);

  const handleRefresh = () => {
    setPageCount(1); // Reset to page 1
    setArtworks([]); // Clear the current artworks
    setHasMoreData(true); // Reset "has more data"
    setSearchText(""); // Clear search text
    setIsRefreshing(true); // Indicate refresh state

    // Fetch data explicitly for page 1
    fetchArtworksFromAPI(1).finally(() => {
      setIsRefreshing(false); // Reset refreshing state after fetch
    });
  };


  const handleLoadMore = () => {
    setIsLoadingMore(true);
    const nextPage = pageCount + 1; // Calculate the next page
    setPageCount(nextPage); // Update the page count
    fetchArtworksFromAPI(nextPage); // Pass the next page explicitly
  };

  useEffect(() => {
    if (isRefreshing) {
      setIsRefreshing(false); // Reset refreshing state after the refresh logic is complete
    }
  }, [isRefreshing]);


  useEffect(() => {
    if (user?.type === "admin") {
      const type = activeTab === "artists" ? "artist" : activeTab === "museums" ? "museum" : null;
      if (type) {
        fetchFirestoreData(type).then((data) => setAdminData(data)); // No more type errors
      }
    }
  }, [activeTab, user?.type]);

  useEffect(() => {
    if (!isLoadingUser && (user === undefined || user?.type === undefined)) {
      router.push("/login"); // Redirect to login only after isLoadingUser is false
    }
  }, [user, isLoadingUser, router]);


  const fetchCalled = useRef(false); // Track if initial fetch has been called

  useEffect(() => {
    if (user?.type === "artist" && activeTab === "artworks" && !fetchCalled.current) {
      console.log("FETCHED HERE");
      fetchArtworksFromAPI();
      fetchCalled.current = true; // Mark as fetched
    }
  }, [user?.type, activeTab]); // Removed `pageCount` from dependency array





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
              onClick={handleRefresh}
            >
              <FiRefreshCw />
            </div>
          </div>
          <div className={styles.artworkList}>
            {activeTab === "artworks" ? (
              <>
                <div className={styles.artworkList}>
                  {isLoadingUser || isLoading ? (
                    <div className={styles.loaderWrapper}>
                      <div className={styles.loader}></div>
                    </div>
                  ) : (
                    artworks.map((artwork) => (
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
                          <Link href={`/artwork?edit=true&artworkId=${artwork.id}`}>
                            <span className={styles.viewDetails}>View artwork's details →</span>
                          </Link>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className={styles.pagination}>
                  {hasMoreData && !isLoading && !isLoadingUser && searchText.length === 0 && (
                    <button
                      className={styles.loadMoreButton}
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? "Loading..." : "Load More"}
                    </button>
                  )}
                </div>
              </>

            ) : activeTab === "artists" ? (
              <>
                <div className={styles.artworkList}>
                  {user?.type === "admin"
                    ? filteredAdminData
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
                            onClick={() => router.push("/artist?edit=true")}
                          >
                            View artist's details →
                          </button>
                        </div>
                      ))}
                </div>
                <div className={styles.pagination}>
                  <button
                    className={styles.loadMoreButton}
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? "Loading..." : "Load More"}
                  </button>
                </div>
              </>

            ) : activeTab === "museums" ? (
              <>
                <div className={styles.artworkList}>
                  {filteredAdminData
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
                  <button
                    className={styles.loadMoreButton}
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? "Loading..." : "Load More"}
                  </button>
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

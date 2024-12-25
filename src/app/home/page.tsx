"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import Header from "../../components/header/header";
import { useRouter } from "next/navigation"; // Import useRouter
import Footer from "../../components/footer/footer";
import { FiRefreshCw } from "react-icons/fi"; // Import a simple, symmetric refresh icon
import { useUser } from "@/context/UserContext";
import { FiCheck, FiX, FiEdit } from "react-icons/fi";
import Link from "next/link";
import LoadingOverlay from "@/components/loadingOverlay/loadingOverlay";

type AdminData = {
  id: string;
  name: string;
};

type Artwork = {
  id: number;
  title: string;
  artist: string;
  image: string;
  pending_situation: number; // New field
  removing?: boolean; // Optional flag for animation
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
  const [loadingArtworkId, setLoadingArtworkId] = useState<number | null>(null); // Tracks the ID of the artwork being processed
  const [hasMoreData, setHasMoreData] = useState(true); // Tracks if there's more data to load
  const [isRefreshing, setIsRefreshing] = useState(false); // Track refresh state
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [pendingSituationFilter, setPendingSituationFilter] = useState<number | null>(null);

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


  const approveArtwork = async (artworkId: number) => {
    const confirmApprove = window.confirm(
      "Are you sure you want to approve this artwork?"
    );
    if (!confirmApprove) return;

    setLoadingArtworkId(artworkId);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Admin token not found.");
      const response = await fetch(
        `https://api.artvista.app/accept_or_reject_artwork/?${new URLSearchParams({
          admin_portal_token: token,
          artwork_id: artworkId.toString(),
          accept: "true",
        })}`
      );
      if (!response.ok) throw new Error("Failed to approve artwork");

      const updatedArtworks = artworks.map((artwork) =>
        artwork.id === artworkId
          ? { ...artwork, removing: true }
          : artwork
      );
      setArtworks(updatedArtworks);
      setTimeout(() => {
        setArtworks((prev) => prev.filter((artwork) => artwork.id !== artworkId));
      }, 300);
    } catch (error) {
      console.error("Error approving artwork:", error);
      alert("An error occurred while approving the artwork.");
    } finally {
      setLoadingArtworkId(null);
    }
  };

  const rejectArtwork = async (artworkId: number) => {
    const confirmReject = window.confirm(
      "Are you sure you want to reject this artwork?"
    );
    if (!confirmReject) return;

    setLoadingArtworkId(artworkId);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Admin token not found.");
      const response = await fetch(
        `https://api.artvista.app/accept_or_reject_artwork/?${new URLSearchParams({
          admin_portal_token: token,
          artwork_id: artworkId.toString(),
          accept: "false",
        })}`
      );
      if (!response.ok) throw new Error("Failed to reject artwork");

      const updatedArtworks = artworks.map((artwork) =>
        artwork.id === artworkId
          ? { ...artwork, removing: true }
          : artwork
      );
      setArtworks(updatedArtworks);
      setTimeout(() => {
        setArtworks((prev) => prev.filter((artwork) => artwork.id !== artworkId));
      }, 300);
    } catch (error) {
      console.error("Error rejecting artwork:", error);
      alert("An error occurred while rejecting the artwork.");
    } finally {
      setLoadingArtworkId(null);
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

        // Determine endpoint and token parameter based on user type
        const endpoint =
          user?.type === "admin"
            ? `/get_pending_artworks/`
            : `/get_artworks_to_portal/`;

        const tokenParamName = user?.type === "admin"
          ? "admin_portal_token"
          : "artist_portal_token";

        // Build query parameters
        const params: Record<string, string> = {
          page_count: page.toString(),
        };

        if (token) {
          params[tokenParamName] = token;
        }

        // Include `filter_by_pending_situation` only for non-admin users
        if (user?.type !== "admin" && pendingSituationFilter !== null) {
          params["filter_by_pending_situation"] = pendingSituationFilter.toString();
        }

        const response = await fetch(
          `https://api.artvista.app${endpoint}?${new URLSearchParams(params).toString()}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: { artwork_id: number; title: string; artist: string; spaces_dir: string; pending_situation: number }[] = await response.json();

        const artworksData = data.filter((item) => item.artwork_id);
        if (artworksData.length === 0 && page > 1) {
          setHasMoreData(false);
          alert("No more artworks to load.");
        } else {
          setHasMoreData(true);
        }

        const formattedArtworks: Artwork[] = artworksData.map((item) => ({
          id: item.artwork_id,
          title: item.title,
          artist: item.artist,
          image: item.spaces_dir,
          pending_situation: item.pending_situation,
        }));

        setArtworks((prev) => (page === 1 ? formattedArtworks : [...prev, ...formattedArtworks]));
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

        const data: { artwork_id: number; title: string; artist: string; spaces_dir: string; pending_situation: number }[] = await response.json();
        console.log(`Search API Response:`, data);

        const formattedArtworks: Artwork[] = data.map((item) => ({
          id: item.artwork_id,
          title: item.title,
          artist: item.artist,
          image: item.spaces_dir,
          pending_situation: item.pending_situation, // Map the new field
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
    setPendingSituationFilter(null);
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

  const handleFilterClick = (filter: number | null) => {
    setPendingSituationFilter((currentFilter) => (currentFilter === filter ? null : filter));

  };

  useEffect(() => {
    if (!searchText) {
      handleRefresh(); // Refresh data when filter changes, only if search text is empty
    } else {
      setPendingSituationFilter(null); // Set the filter to null without triggering a refresh
    }
  }, [pendingSituationFilter, searchText]);


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
              <div
                className={`${styles.shapeWhite} ${pendingSituationFilter === 1 ? styles.selected : ""
                  }`}
                onClick={() => handleFilterClick(1)} // Filter for Published
                style={{ cursor: "pointer" }}
              >
                Published
              </div>
              <div
                className={`${styles.shapeWhite} ${pendingSituationFilter === 2 ? styles.selected : ""
                  }`}
                onClick={() => handleFilterClick(2)} // Filter for Pending
                style={{ cursor: "pointer" }}
              >
                Pending
              </div>
              <div
                className={`${styles.shapeWhite} ${pendingSituationFilter === 0 ? styles.selected : ""
                  }`}
                onClick={() => handleFilterClick(0)} // Filter for Rejected
                style={{ cursor: "pointer" }}
              >
                Rejected
              </div>
            </div>
            <div className={styles.headerRight}>
              {user?.type === "museum" && (
                <Link href="/artist">
                  <button className={styles.shapePrimary}>
                    Add Artist
                  </button>
                </Link>
              )}
              <Link href="/artwork">
                <button className={styles.shapeSecondary}>
                  Add Artwork
                </button>
              </Link>
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
              {searchText && (
                <span
                  className={styles.clearIcon}
                  onClick={() => setSearchText("")} // Clear search text on click
                >
                  ✖
                </span>
              )}
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
                      <div key={artwork.id} className={`${styles.artworkItem} ${artwork.removing ? styles.removing : ""}`}
                      >
                        {loadingArtworkId === artwork.id && (
                          <LoadingOverlay isVisible={true} />
                        )}

                        <img
                          src={artwork.image}
                          alt={artwork.title}
                          className={styles.artworkImage}
                        />
                        <span className={styles.artworkTitle}>
                          {artwork.title}
                          {user?.type === "admin" && artwork.artist ? ` | ${artwork.artist}` : ""}
                        </span>
                        {user?.type === "admin" ? (
                          <div className={styles.adminButtons}>
                            <button
                              className={styles.approveButton}
                              onClick={() => approveArtwork(artwork.id)} // Call approve function
                            >
                              <FiCheck />
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => rejectArtwork(artwork.id)} // Call reject function
                            >
                              <FiX />
                            </button>
                            <Link
                              href={
                                activeTab === "artworks"
                                  ? `/artwork?edit=true&artworkId=${artwork.id}`
                                  : activeTab === "artists"
                                    ? `/artist?edit=true`
                                    : `/museum?edit=true`
                              } // Dynamically set the path based on activeTab
                              className={styles.editButton} // Apply button styling
                            >
                              <FiEdit />
                            </Link>
                          </div>
                        ) : (
                          <Link href={`/artwork?edit=true&artworkId=${artwork.id}`}>
                            <span className={styles.viewDetails}>View artwork's details →</span>
                          </Link>
                        )}
                        <div
                          className={`${styles.pendingStatus} ${artwork.pending_situation === 0
                            ? styles.rejected
                            : artwork.pending_situation === 1
                              ? styles.accepted
                              : styles.pending
                            }`}
                        >
                          {artwork.pending_situation === 0
                            ? "Rejected"
                            : artwork.pending_situation === 1
                              ? "Published"
                              : "Pending"}
                        </div>
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
                            >
                              <FiCheck />
                            </button>
                            <button
                              className={styles.rejectButton}
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
                            >
                              <FiCheck />
                            </button>
                            <button
                              className={styles.rejectButton}
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

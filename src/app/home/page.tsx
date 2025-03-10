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
import { Loader } from "@/components/loadingOverlay/loadingOverlay";
import { useAlert } from "@/context/AlertContext";

type AdminData = {
  id: string;
  name: string;
};

type Artwork = {
  id: number;
  pending_id: number;
  title: string;
  artist: string;
  artist_id: number;
  image: string;
  pending_situation: number; // New field
  removing?: boolean; // Optional flag for animation
};

type Artist = {
  id: number;
  name: string;
  image: string;
  pending_situation: number; // New field
  removing?: boolean; // Optional flag for animation
};


type ArtworkStats = {
  rejected: number;
  approved: number;
  pending: number;
};


export default function Home() {
  const router = useRouter(); // Initialize router
  const { user, getIdToken, isLoadingUser } = useUser(); // Access user from context
  const [adminData, setAdminData] = useState<AdminData[]>([]);
  const [isLoading, setIsLoading] = useState(false); //TODO set to true in the future

  const { showAlert, showConfirm } = useAlert();

  const [isClient, setIsClient] = useState(false); // Track if the component is client-side

  useEffect(() => {
    setIsClient(true); // Ensure we're on the client
  }, []);


  const [activeTab, setActiveTab] = useState<"artworks" | "artists" | "museums">("artworks");
  const [searchText, setSearchText] = useState(""); // State to manage search input
  const [currentPage, setCurrentPage] = useState(1);

  const [pageCount, setPageCount] = useState(1);
  const [pageCountArtists, setPageCountArtists] = useState(1);

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [isLoadingMore, setIsLoadingMore] = useState(false); // Loader for "Load More"
  const [loadingArtworkId, setLoadingArtworkId] = useState<number | null>(null); // Tracks the ID of the artwork being processed
  const [loadingArtistId, setLoadingArtistId] = useState<number | null>(null); // Tracks the ID of the artwork being processed

  const [hasMoreData, setHasMoreData] = useState(true); // Tracks if there's more data to load
  const [hasMoreDataArtists, setHasMoreDataArtists] = useState(true); // Tracks if there's more data to load

  const [isRefreshing, setIsRefreshing] = useState(false); // Track refresh state
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [pendingSituationFilter, setPendingSituationFilter] = useState<"approved" | "rejected" | "pending">("pending");
  const [artworkStats, setArtworkStats] = useState<ArtworkStats | null>(null);
  const itemsPerPage = 4;


  const approveArtwork = async (pendingId: number) => {
    const confirmApprove = await showConfirm(
      "Are you sure you want to approve this artwork?"
    );
    if (!confirmApprove) return;

    setLoadingArtworkId(pendingId);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Admin token not found.");
      const response = await fetch(
        `https://api.artvista.app/accept_or_reject_artwork/?${new URLSearchParams({
          admin_portal_token: token,
          pending_id: pendingId.toString(),
          accept: "true",
        })}`
      );
      if (!response.ok) throw new Error("Failed to approve artwork");

      const updatedArtworks = artworks.map((artwork) =>
        artwork.pending_id === pendingId
          ? { ...artwork, removing: true }
          : artwork
      );
      setArtworks(updatedArtworks);
      setTimeout(() => {
        setArtworks((prev) => prev.filter((artwork) => artwork.pending_id !== pendingId));
      }, 300);
    } catch (error) {
      console.error("Error approving artwork:", error);
      showAlert("An error occurred while approving the artwork.", "error");
    } finally {
      setLoadingArtworkId(null);
    }
  };

  const rejectArtwork = async (pendingId: number) => {
    const confirmReject = await showConfirm(
      "Are you sure you want to reject this artwork?"
    );
    if (!confirmReject) return;

    setLoadingArtworkId(pendingId);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Admin token not found.");
      const response = await fetch(
        `https://api.artvista.app/accept_or_reject_artwork/?${new URLSearchParams({
          admin_portal_token: token,
          pending_id: pendingId.toString(),
          accept: "false",
        })}`
      );
      if (!response.ok) throw new Error("Failed to reject artwork");

      const updatedArtworks = artworks.map((artwork) =>
        artwork.pending_id === pendingId
          ? { ...artwork, removing: true }
          : artwork
      );
      setArtworks(updatedArtworks);
      setTimeout(() => {
        setArtworks((prev) => prev.filter((artwork) => artwork.pending_id !== pendingId));
      }, 300);
    } catch (error) {
      console.error("Error rejecting artwork:", error);
      showAlert("An error occurred while rejecting the artwork.", "error");
    } finally {
      setLoadingArtworkId(null);
    }
  };


  const approveArtist = async (artistId: number) => {
    const confirmMessage = await showConfirm(
      "Are you sure you want to approve this artist? Enter a message below (not necessary):",
      true // Enables input field
    );

    if (confirmMessage === false) return; // User canceled

    const finalMessage =
      confirmMessage === "" ? "Artist Approved" : confirmMessage; // Default message if empty

    setLoadingArtistId(artistId);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Admin token not found.");

      const response = await fetch(
        `https://api.artvista.app/accept_or_reject_artist/?${new URLSearchParams({
          admin_portal_token: token,
          artist_id: artistId.toString(),
          accept: "true",
        })}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message_to_be_emailed: finalMessage, // Use input value or default
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to approve artist");

      const updatedArtists = artists.map((artist) =>
        artist.id === artistId ? { ...artist, removing: true } : artist
      );
      setArtists(updatedArtists);
      setTimeout(() => {
        setArtists((prev) => prev.filter((artist) => artist.id !== artistId));
      }, 300);
    } catch (error) {
      console.error("Error approving artist:", error);
      showAlert("An error occurred while approving the artist.", "error");
    } finally {
      setLoadingArtistId(null);
    }
  };

  const rejectArtist = async (artistId: number) => {
    const confirmMessage = await showConfirm(
      "Are you sure you want to reject this artist? Enter a reason below (necessary):",
      true // Enables input field
    );

    if (confirmMessage === false) return; // User canceled

    const finalMessage =
      confirmMessage === "" ? "Unfortunately, your artist submission was not approved." : confirmMessage; // Default message if empty

    setLoadingArtistId(artistId);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Admin token not found.");

      const response = await fetch(
        `https://api.artvista.app/accept_or_reject_artist/?${new URLSearchParams({
          admin_portal_token: token,
          artist_id: artistId.toString(),
          accept: "false",
        })}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message_to_be_emailed: finalMessage, // Use input value or default
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to reject artist");

      const updatedArtists = artists.map((artist) =>
        artist.id === artistId ? { ...artist, removing: true } : artist
      );
      setArtists(updatedArtists);
      setTimeout(() => {
        setArtists((prev) => prev.filter((artist) => artist.id !== artistId));
      }, 300);
    } catch (error) {
      console.error("Error rejecting artist:", error);
      showAlert("An error occurred while rejecting the artist.", "error");
    } finally {
      setLoadingArtistId(null);
    }
  };



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
    if (page === 1) setIsLoading(true);
    try {
      if (user) {
        const token = await getIdToken();

        const endpoint =
          user?.type === "admin"
            ? `/get_pending_artworks/`
            : `/get_artworks_to_portal/`;

        const tokenParamName = user?.type === "admin"
          ? "admin_portal_token"
          : "artist_portal_token";

        const params: Record<string, string> = {
          page_count: page.toString(),
          artworks_per_page: itemsPerPage.toString(),
        };

        if (token) {
          params[tokenParamName] = token;
        }

        // Include `filter_by_pending_situation` only for non-admin users
        if (user?.type !== "admin" && pendingSituationFilter !== null) {
          params["filter_by_pending_situation"] = pendingSituationFilter;
        }

        const response = await fetch(
          `https://api.artvista.app${endpoint}?${new URLSearchParams(params).toString()}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: { artwork_id: number; pending_id: number; title: string; artist: string; artist_id: number; spaces_dir_low_resolution: string; pending_situation: number }[] = await response.json();

        const artworksData = data.filter((item) => item.artwork_id);
        if (artworksData.length === 0 && page > 1) {
          setHasMoreData(false);
          showAlert("No more artworks to load.", "info");
        } else {
          setHasMoreData(true);
        }

        const formattedArtworks: Artwork[] = artworksData.map((item) => ({
          id: item.artwork_id,
          pending_id: item.pending_id,
          title: item.title,
          artist: item.artist,
          artist_id: item.artist_id,
          image: item.spaces_dir_low_resolution,
          pending_situation: item.pending_situation,
        }));

        console.log(formattedArtworks);


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


  const fetchArtistsFromAPI = async (page = 1) => {
    if (page === 1) setIsLoading(true);
    try {
      if (user?.type === "admin") {
        const token = await getIdToken();
        if (!token) throw new Error("Admin token not found.");

        const response = await fetch(
          `https://api.artvista.app/get_pending_artists/?${new URLSearchParams({
            admin_portal_token: token,
            page_count: page.toString(),
            artists_per_page: itemsPerPage.toString(),
          })}`
        );

        if (!response.ok) throw new Error("Failed to fetch pending artists");

        const data: { artist_id: number; name: string; spaces_dir_low_resolution: string; pending_situation: number }[] = await response.json();
        const artistsData = data.filter((item) => item.artist_id);
        console.log(artistsData)

        if (artistsData.length === 0 && page > 1) {
          setHasMoreDataArtists(false);
          showAlert("No more artists to load.", "info");
        } else {
          setHasMoreDataArtists(true);
        }

        const formattedArtists: Artist[] = artistsData.map((item) => ({
          id: item.artist_id,
          name: item.name,
          image: item.spaces_dir_low_resolution,
          pending_situation: item.pending_situation, // Added field
        }));

        setArtists((prev) => (page === 1 ? formattedArtists : [...prev, ...formattedArtists]));
      } else {
        console.error("User is not an admin.");
      }
    } catch (error) {
      console.error("Error fetching artists:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };


  const statsFetched = useRef(false); // Ref to track if stats are fetched

  useEffect(() => {
    const fetchArtworkStats = async () => {
      try {
        if (user && !statsFetched.current) {
          statsFetched.current = true; // Set the flag to true
          console.log('bug');
          const token = await getIdToken();
          if (!token) throw new Error("Admin token not found.");

          const response = await fetch(
            `https://api.artvista.app/get_published_pending_rejected_counts/?artist_portal_token=${token}`
          );
          if (!response.ok) throw new Error("Failed to fetch artwork stats");

          const stats: ArtworkStats = await response.json();
          setArtworkStats(stats);
        }
      } catch (error) {
        console.error("Error fetching artwork stats:", error);
      }
    };

    fetchArtworkStats();
  }, [user]); // Only dependent on user and token


  const fetchArtworksFromSearchAPI = async (title: string) => {
    setIsLoading(true); // Start loading
    try {
      if (user) {
        const token = await getIdToken(); // Get token for authentication
        const response = await fetch(
          `https://api.artvista.app/search_artworks_of_artist/?artist_portal_token=${token}&title=${encodeURIComponent(
            title
          )}&limit_artworks=${itemsPerPage}`,
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: { artwork_id: number; pending_id: number; title: string; artist: string; artist_id: number; spaces_dir_low_resolution: string; pending_situation: number }[] = await response.json();

        const formattedArtworks: Artwork[] = data.map((item) => ({
          id: item.artwork_id,
          pending_id: item.pending_id,
          title: item.title,
          artist: item.artist,
          artist_id: item.artist_id,
          image: item.spaces_dir_low_resolution,
          pending_situation: item.pending_situation, // Map the new field
        }));
        console.log(`Search API Response:`, formattedArtworks);

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
    setPendingSituationFilter("pending");
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

  const handleRefreshArtists = () => {
    setPageCountArtists(1);
    setArtists([]); // Clear artists list
    setHasMoreDataArtists(true);
    setSearchText(""); // Reset search
    setIsRefreshing(true);
    fetchArtistsFromAPI(1).finally(() => setIsRefreshing(false));
  };



  const handleLoadMoreArtists = () => {
    setIsLoadingMore(true);
    const nextPage = pageCountArtists + 1;
    setPageCountArtists(nextPage);
    fetchArtistsFromAPI(nextPage);
  };





  const handleFilterClick = (filter: "approved" | "rejected" | "pending") => {
    setPendingSituationFilter(filter);
  };

  useEffect(() => {
    if (!searchText) {
      handleRefresh(); // Refresh data when filter changes, only if search text is empty
    } else {
      setPendingSituationFilter("pending"); // Set the filter to null without triggering a refresh
    }
  }, [pendingSituationFilter, searchText]);




  useEffect(() => {
    if (isRefreshing) {
      setIsRefreshing(false); // Reset refreshing state after the refresh logic is complete
    }
  }, [isRefreshing]);





  const fetchCalled = useRef(false); // Track if initial fetch has been called

  useEffect(() => {
    if (user?.type === "artist" && activeTab === "artworks" && !fetchCalled.current) {
      fetchArtworksFromAPI();
      fetchCalled.current = true; // Mark as fetched
    }
  }, [user?.type, activeTab]); // Removed `pageCount` from dependency array

  useEffect(() => {
    if (user?.type === "admin" && activeTab === "artists" && !fetchCalled.current) {
      console.log("Fetching artists...");
      fetchArtistsFromAPI();
      fetchCalled.current = true;
    }
  }, [user?.type, activeTab]);




  return (
    <>
      <Header />
      <div className={styles.page}>
        {user?.type !== "admin" && (
          <div className={styles.headerList}>
            <div className={styles.headerLeft}>
              <div
                className={`${styles.shapeWhite} ${searchText === "" && pendingSituationFilter === "approved" ? styles.selected : ""
                  }`}
                onClick={() => handleFilterClick("approved")}
                style={{ cursor: "pointer" }}
              >
                Published{artworkStats?.approved !== undefined ? ` (${artworkStats.approved})` : ""}
              </div>
              <div
                className={`${styles.shapeWhite} ${searchText === "" && pendingSituationFilter === "pending" ? styles.selected : ""
                  }`}
                onClick={() => handleFilterClick("pending")}
                style={{ cursor: "pointer" }}
              >
                Pending{artworkStats?.pending !== undefined ? ` (${artworkStats.pending})` : ""}
              </div>
              <div
                className={`${styles.shapeWhite} ${searchText === "" && pendingSituationFilter === "rejected" ? styles.selected : ""
                  }`}
                onClick={() => handleFilterClick("rejected")}
                style={{ cursor: "pointer" }}
              >
                Rejected{artworkStats?.rejected !== undefined ? ` (${artworkStats.rejected})` : ""}
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
              onClick={() => {
                if (activeTab === "artworks") {
                  handleRefresh();
                } else if (activeTab === "artists") {
                  handleRefreshArtists();
                }
              }}
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
                      <Loader />
                    </div>
                  ) : artworks.length === 0 ? (
                    <div className={styles.noArtworksMessage}>
                      No artworks found
                    </div>
                  ) : (
                    artworks.map((artwork, index) => (
                      <div
                        key={`${artwork.id}-${artwork.pending_situation}`} // Combine artwork.id and currentPage for a unique key
                        className={`${styles.artworkItem} ${artwork.removing ? styles.removing : ""}`}
                        style={{ animationDelay: `${(index % itemsPerPage) * 0.1}s` }} // Dynamic delay based on index
                      >

                        {loadingArtworkId === artwork.pending_id && (
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
                              onClick={() => approveArtwork(artwork.pending_id)} // Call approve function
                            >
                              <FiCheck />
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={() => rejectArtwork(artwork.pending_id)} // Call reject function
                            >
                              <FiX />
                            </button>
                            <Link
                              href={
                                `/artwork?edit=true&artworkId=${artwork.id}&artistId=${artwork.artist_id}&pendingId=${artwork.pending_id}&pending=${artwork.pending_situation === 2 || artwork.pending_situation === 0 ? 'true' : 'false'}`
                              }
                              className={styles.editButton} // Apply button styling
                            >
                              <FiEdit />
                            </Link>
                          </div>
                        ) : (
                          <Link
                            href={`/artwork?edit=true&artworkId=${artwork.id}&artistId=${artwork.artist_id}&pending=${artwork.pending_situation === 2 || artwork.pending_situation === 0 ? 'true' : 'false'}`}
                          >
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
                  {hasMoreData && !isLoading && !isLoadingUser && searchText.length === 0 && artworks.length > 3 && (
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
                  {isLoading ? (
                    <div className={styles.loaderWrapper}>
                      <Loader />
                    </div>
                  ) : artists.length === 0 ? (
                    <div className={styles.noArtworksMessage}>No artists found</div>
                  ) : (
                    artists.map((artist, index) => (
                      <div
                        key={`${artist.id}-${artist.pending_situation}`} // Combine artwork.id and currentPage for a unique key
                        className={`${styles.artworkItem} ${artist.removing ? styles.removing : ""}`}
                        style={{ animationDelay: `${(index % itemsPerPage) * 0.1}s` }}
                      >

                        {loadingArtistId === artist.id && (
                          <LoadingOverlay isVisible={true} />
                        )}

                        <img src={artist.image} alt={artist.name} className={styles.artworkImage} />
                        <span className={styles.artworkTitle}>{artist.name}</span>

                        {user?.type === "admin" ? (
                          <div className={styles.adminButtons}>
                            <button className={styles.approveButton} onClick={() => approveArtist(artist.id)}>
                              <FiCheck />
                            </button>
                            <button className={styles.rejectButton} onClick={() => rejectArtist(artist.id)}>
                              <FiX />
                            </button>
                            <Link href={`/artist?edit=true&artistId=${artist.id}&pending=${artist.pending_situation === 2 || artist.pending_situation === 0 ? 'true' : 'false'}`}
                              className={styles.editButton}>
                              <FiEdit />
                            </Link>
                          </div>
                        ) : (
                          /* Museum View: Only Show "View Details" */
                          user?.type === "museum" && (
                            <Link href={`/artist?edit=true&artistId=${artist.id}&pending=${artist.pending_situation === 2 || artist.pending_situation === 0 ? 'true' : 'false'}`}>
                              <span className={styles.viewDetails}>View artist's details →</span>
                            </Link>
                          )
                        )}
                        <div
                          className={`${styles.pendingStatus} ${artist.pending_situation === 0
                            ? styles.rejected
                            : artist.pending_situation === 1
                              ? styles.accepted
                              : styles.pending
                            }`}
                        >
                          {artist.pending_situation === 0
                            ? "Rejected"
                            : artist.pending_situation === 1
                              ? "Published"
                              : "Pending"}
                        </div>

                      </div>
                    ))
                  )}
                </div>

                <div className={styles.pagination}>
                  {hasMoreDataArtists && !isLoading && !isLoadingUser && searchText.length === 0 && artists.length > 3 && (
                    <button className={styles.loadMoreButton} onClick={handleLoadMoreArtists} disabled={isLoadingMore}>
                      {isLoadingMore ? "Loading..." : "Load More"}
                    </button>
                  )}
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

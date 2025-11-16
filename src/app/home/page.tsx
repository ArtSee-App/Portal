"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
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

type ArtworkDetails = {
  text_information?: {
    description?: string;
    creation_date?: string;
    genre?: string;
    media?: string;
    dimensions?: string;
    style?: string;
  };
};

type DuplicateCheckResult = {
  score: number;
  duplicate: {
    title: string;
    artwork_id: number;
    artist: string;
    spaces_dir?: string;
    spaces_dir_low_resolution?: string;
  } | null;
};


export default function Home() {
  const router = useRouter(); // Initialize router
  const { user, getIdToken, isLoadingUser } = useUser(); // Access user from context
  const [adminData] = useState<AdminData[]>([]);
  const [isLoading, setIsLoading] = useState(false); //TODO set to true in the future

  const { showAlert, showConfirm } = useAlert();

  const [activeTab, setActiveTab] = useState<"artworks" | "artists" | "museums">("artworks");
  const [searchText, setSearchText] = useState(""); // State to manage search input

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
  const [expandedArtworkId, setExpandedArtworkId] = useState<number | null>(null);
  const [expandedArtworkDetails, setExpandedArtworkDetails] = useState<ArtworkDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [duplicateCheckResults, setDuplicateCheckResults] = useState<Map<number, DuplicateCheckResult>>(new Map());
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [hoveredDuplicate, setHoveredDuplicate] = useState<{ artworkId: number; imageUrl: string; title: string; artist: string } | null>(null);
  const itemsPerPage = 8;
  const refreshedArtworkIds = useRef<Set<number>>(new Set());

  // Fun empty state messages
  const emptyMessages = {
    approved: [
      "Nothing published yet? Time to share your masterpiece! 🎨",
      "Your published gallery is lonely... Let's fill it up!",
      "Zero published artworks? That's about to change, right?",
      "The world is waiting to see your art! Nothing here yet.",
      "Published works: 0. Potential: Unlimited! ✨",
      "Empty canvas here. Ready to showcase your work?",
      "No published pieces yet. Your debut awaits!",
      "This space is reserved for your amazing art! 🖼️"
    ],
    pending: [
      "All clear! No artworks waiting for review.",
      "Nothing pending? Either you're quick or we are! ⚡",
      "Pending queue: Empty. Time to submit something new?",
      "No artworks in limbo. Everything's been reviewed!",
      "Pending list looking pretty empty right now...",
      "Zero pending submissions. Got something new to share?",
      "The review queue is empty. All caught up! ✓",
      "Nothing waiting for approval. Clean slate!"
    ],
    rejected: [
      "No rejections? Seems like you haven't tried enough yet... 🤔",
      "Empty here. Playing it too safe, perhaps?",
      "Zero rejections. Not sure if you're perfect or just not submitting! 😏",
      "Nothing rejected? You might want to take more risks!",
      "No failures yet? That's because you haven't pushed boundaries!",
      "The rejection list is empty. Too cautious, maybe?",
      "Not a single rejection... Are you even trying? 💭",
      "Rejections: 0. Submissions: Probably not enough! 📉"
    ]
  };

  const getRandomEmptyMessage = (filter: "approved" | "rejected" | "pending") => {
    const messages = emptyMessages[filter];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Refs for infinite scroll
  const artworksLoadMoreRef = useRef<HTMLDivElement>(null);
  const artistsLoadMoreRef = useRef<HTMLDivElement>(null);


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

        if (artistsData.length === 0 && page > 1) {
          setHasMoreDataArtists(false);
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

  const handleLoadMore = useCallback(() => {
    setIsLoadingMore(true);
    const nextPage = pageCount + 1; // Calculate the next page
    setPageCount(nextPage); // Update the page count
    fetchArtworksFromAPI(nextPage); // Pass the next page explicitly
  }, [pageCount]);

  const handleRefreshArtists = () => {
    setPageCountArtists(1);
    setArtists([]); // Clear artists list
    setHasMoreDataArtists(true);
    setSearchText(""); // Reset search
    setIsRefreshing(true);
    fetchArtistsFromAPI(1).finally(() => setIsRefreshing(false));
  };

  const handleFilterClick = (filter: "approved" | "rejected" | "pending") => {
    setPendingSituationFilter(filter);
    if (showWelcome) {
      setShowWelcome(false);
      fetchCalled.current = false; // Reset fetch flag so data loads
    }
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





  const checkForDuplicates = async (artworkId: number, imageUrl: string) => {
    // Check if we already have results for this artwork
    if (duplicateCheckResults.has(artworkId)) {
      return duplicateCheckResults.get(artworkId);
    }

    setCheckingDuplicate(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Token not found.");

      // Fetch the image from URL
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', imageBlob, 'artwork.jpg');

      const response = await fetch(
        `https://api.artvista.app/artwork_search_portal/?portal_token=${token}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Failed to check for duplicates");

      const data = await response.json();
      const result = {
        score: data.scores?.[0] || 0,
        duplicate: data.website_results?.[0] || null,
      };

      // Cache the result
      setDuplicateCheckResults(new Map(duplicateCheckResults.set(artworkId, result)));

      return result;
    } catch (error) {
      console.error("Error checking for duplicates:", error);
      return null;
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const toggleArtworkExpansion = async (artworkId: number, pendingSituation: number, imageUrl: string) => {
    if (expandedArtworkId === artworkId) {
      // Collapse if already expanded
      setExpandedArtworkId(null);
      setExpandedArtworkDetails(null);
    } else {
      // Expand and fetch details
      setExpandedArtworkId(artworkId);
      setLoadingDetails(true);
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Token not found.");

        const isPending = pendingSituation === 2 || pendingSituation === 0 ? "true" : "false";
        const url = user?.type === "admin"
          ? `https://api.artvista.app/get_artwork_details_to_admin_portal/?admin_portal_token=${token}&artwork_id=${artworkId}&is_pending=${isPending}`
          : `https://api.artvista.app/get_artwork_details_to_portal/?artist_portal_token=${token}&artwork_id=${artworkId}&is_pending=${isPending}`;

        const response = await fetch(url);

        if (!response.ok) throw new Error("Failed to fetch artwork details");

        const data = await response.json();
        setExpandedArtworkDetails(data);

        // Check for duplicates only for admin or non-published artworks (pending/rejected)
        if (user?.type === "admin" || pendingSituation !== 1) {
          checkForDuplicates(artworkId, imageUrl);
        }
      } catch (error) {
        console.error("Error fetching artwork details:", error);
        showAlert("Failed to load artwork details.", "error");
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  const refreshArtworkImage = useCallback(
    async (artworkId: number, pendingSituation: number) => {
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Token not found.");

        const isPending = pendingSituation === 2 || pendingSituation === 0 ? "true" : "false";

        const url =
          user?.type === "admin"
            ? `https://api.artvista.app/get_artwork_details_to_admin_portal/?admin_portal_token=${token}&artwork_id=${artworkId}&is_pending=${isPending}`
            : `https://api.artvista.app/get_artwork_details_to_portal/?artist_portal_token=${token}&artwork_id=${artworkId}&is_pending=${isPending}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to refresh artwork image");

        const data = await response.json();
        const newImageUrl = data?.image_links?.header_image as string | undefined;

        if (newImageUrl) {
          setArtworks((prev) =>
            prev.map((artwork) =>
              artwork.id === artworkId ? { ...artwork, image: newImageUrl } : artwork
            )
          );
        }
      } catch (error) {
        console.error("Error refreshing artwork image:", error);
      }
    },
    [getIdToken, user]
  );

  const handleArtworkImageError = (artwork: Artwork) => {
    if (refreshedArtworkIds.current.has(artwork.id)) return;
    refreshedArtworkIds.current.add(artwork.id);
    refreshArtworkImage(artwork.id, artwork.pending_situation);
  };

  const fetchCalled = useRef(false); // Track if initial fetch has been called

  useEffect(() => {
    if (user?.type === "artist" && activeTab === "artworks" && !fetchCalled.current && !showWelcome) {
      fetchArtworksFromAPI();
      fetchCalled.current = true; // Mark as fetched
    }
  }, [user?.type, activeTab, showWelcome]); // Removed `pageCount` from dependency array

  useEffect(() => {
    if (user?.type === "admin" && activeTab === "artists" && !fetchCalled.current) {
      fetchArtistsFromAPI();
      fetchCalled.current = true;
    }
  }, [user?.type, activeTab]);

  // Infinite scroll for artworks
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreData && !isLoadingMore && !isLoading && searchText.length === 0 && artworks.length > 0) {
          setIsLoadingMore(true);
          const nextPage = pageCount + 1;
          setPageCount(nextPage);
          fetchArtworksFromAPI(nextPage);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentRef = artworksLoadMoreRef.current;
    if (currentRef && activeTab === 'artworks') {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMoreData, isLoadingMore, isLoading, searchText, artworks.length, pageCount, activeTab]);

  // Infinite scroll for artists
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreDataArtists && !isLoadingMore && !isLoading && searchText.length === 0 && artists.length > 0) {
          setIsLoadingMore(true);
          const nextPage = pageCountArtists + 1;
          setPageCountArtists(nextPage);
          fetchArtistsFromAPI(nextPage);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentRef = artistsLoadMoreRef.current;
    if (currentRef && activeTab === 'artists') {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMoreDataArtists, isLoadingMore, isLoading, searchText, artists.length, pageCountArtists, activeTab]);




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
            {user?.type !== "artist" && (
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
                ) : null}
              </div>
            )}
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
                  {user?.type === "artist" && showWelcome && !isLoading ? (
                    <div className={styles.welcomeContent}>
                      <h2 className={styles.welcomeContentTitle}>Welcome to Your ArtVista Portal</h2>

                      <p className={styles.welcomeContentText}>
                        This is your personal dashboard for managing your artwork submissions. Here's how to get started:
                      </p>
                      <ul className={styles.welcomeContentList}>
                        <li>
                          <strong>Published</strong> - View your artworks that have been approved and are live on ArtVista
                        </li>
                        <li>
                          <strong>Pending</strong> - Check artworks currently under review by our team
                        </li>
                        <li>
                          <strong>Rejected</strong> - Review artworks that need revisions before resubmission
                        </li>
                        <li>
                          <strong>Add Artwork</strong> - Submit new pieces to your collection using the button above
                        </li>
                      </ul>
                      <p className={styles.welcomeContentFooter}>
                        Click on any category above to view your artworks, or add new artwork to get started.
                      </p>

                      <div className={styles.releaseNotes}>
                        <div className={styles.releaseNotesHeader}>
                          <h3 className={styles.releaseNotesTitle}>Release Notes</h3>
                          <span className={styles.releaseNotesDate}>16.11.2025</span>
                        </div>
                        <ul className={styles.releaseNotesList}>
                          <li>Renewed user interface with sleeker, modern design</li>
                          <li>Faster loading times for artwork browsing</li>
                          <li>Streamlined navigation and improved button styles</li>
                          <li>Smart duplicate detection for pending submissions</li>
                          <li>Enhanced empty state messages with personality</li>
                          <li>Optimized search and filter alignment</li>
                          <li>Quick access to artwork details and editing</li>
                        </ul>
                      </div>
                    </div>
                  ) : isLoadingUser || isLoading ? (
                    <div className={styles.loaderWrapper}>
                      <Loader />
                    </div>
                  ) : artworks.length === 0 ? (
                    <div className={styles.noArtworksMessage}>
                      {user?.type === "artist" && !searchText
                        ? getRandomEmptyMessage(pendingSituationFilter)
                        : "No artworks found"}
                    </div>
                  ) : (
                    artworks.map((artwork, index) => (
                      <React.Fragment key={`${artwork.id}-${artwork.pending_situation}`}>
                        <div
                          className={`${styles.artworkItem} ${artwork.removing ? styles.removing : ""} ${expandedArtworkId === artwork.id ? styles.expanded : ""}`}
                          style={{ animationDelay: `${(index % itemsPerPage) * 0.1}s` }} // Dynamic delay based on index
                          onClick={() => toggleArtworkExpansion(artwork.id, artwork.pending_situation, artwork.image)}
                        >

                        {loadingArtworkId === artwork.pending_id && (
                          <LoadingOverlay isVisible={true} />
                        )}

                        <div className={styles.imageContainer}>
                          <img
                            src={artwork.image}
                            alt={artwork.title}
                            className={styles.artworkImage}
                            onError={() => handleArtworkImageError(artwork)}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className={styles.artworkTitle}>
                              {artwork.title}
                            </span>
                            <span
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
                            </span>
                          </div>
                          {user?.type === "admin" && artwork.artist && (
                            <span className={styles.artworkMetadata}>
                              {artwork.artist}
                            </span>
                          )}
                        </div>
                        {user?.type === "admin" ? (
                          <div className={styles.adminButtons} onClick={(e) => e.stopPropagation()}>
                            <button
                              className={styles.approveButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                approveArtwork(artwork.pending_id);
                              }}
                            >
                              <FiCheck />
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                rejectArtwork(artwork.pending_id);
                              }}
                            >
                              <FiX />
                            </button>
                            <Link
                              href={
                                `/artwork?edit=true&artworkId=${artwork.id}&artistId=${artwork.artist_id}&pendingId=${artwork.pending_id}&pending=${artwork.pending_situation === 2 || artwork.pending_situation === 0 ? 'true' : 'false'}`
                              }
                              className={styles.editButton} // Apply button styling
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FiEdit />
                            </Link>
                          </div>
                        ) : (
                          <Link
                            href={`/artwork?edit=true&artworkId=${artwork.id}&artistId=${artwork.artist_id}&pendingId=${artwork.pending_id}&pending=${artwork.pending_situation === 2 || artwork.pending_situation === 0 ? 'true' : 'false'}`}
                            className={styles.viewDetails}
                            onClick={(e) => e.stopPropagation()}
                          >
                            View details →
                          </Link>
                        )}
                      </div>
                      {expandedArtworkId === artwork.id && (
                        <div className={styles.artworkExpandedDetails}>
                          {loadingDetails ? (
                            <div className={styles.detailsLoader}>
                              <Loader />
                              <span>Loading details...</span>
                            </div>
                          ) : expandedArtworkDetails?.text_information ? (
                            <div className={styles.detailsContent}>
                              {/* Duplicate Check Status - Only show for admin or non-published artworks */}
                              {(user?.type === "admin" || artwork.pending_situation !== 1) && (
                                <>
                                  {checkingDuplicate ? (
                                    <div className={styles.duplicateCheck}>
                                      <div className={styles.duplicateCheckLoading}>
                                        <Loader />
                                        <span>Analyzing artwork...</span>
                                      </div>
                                    </div>
                                  ) : duplicateCheckResults.get(artwork.id) ? (
                                (() => {
                                  const result = duplicateCheckResults.get(artwork.id);
                                  if (!result) return null;
                                  const score = result.score;

                                  if (score < 50) {
                                    return (
                                      <div className={`${styles.duplicateCheck} ${styles.duplicateCheckSuccess}`}>
                                        <div className={styles.duplicateCheckIcon}>✓</div>
                                        <div className={styles.duplicateCheckContent}>
                                          <div className={styles.duplicateCheckTitle}>No Duplicate Detected</div>
                                          <div className={styles.duplicateCheckMeta}>
                                            <span className={styles.duplicateCheckScore}>{score.toFixed(1)}%</span>
                                            <span className={styles.duplicateCheckLabel}>similarity</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  } else if (score < 95) {
                                    return (
                                      <div className={`${styles.duplicateCheck} ${styles.duplicateCheckWarning}`}>
                                        <div className={styles.duplicateCheckIcon}>⚠</div>
                                        <div className={styles.duplicateCheckContent}>
                                          <div className={styles.duplicateCheckTitle}>Possible Similarity</div>
                                          <div className={styles.duplicateCheckMeta}>
                                            <span className={styles.duplicateCheckScore}>{score.toFixed(1)}%</span>
                                            <span className={styles.duplicateCheckLabel}>match</span>
                                          </div>
                                          {result.duplicate && (
                                            <div className={styles.duplicateCheckDetails}>
                                              Similar to: <strong
                                                className={styles.duplicateTitle}
                                                onMouseEnter={() => setHoveredDuplicate({
                                                  artworkId: result.duplicate!.artwork_id,
                                                  imageUrl: result.duplicate!.spaces_dir_low_resolution || result.duplicate!.spaces_dir || '',
                                                  title: result.duplicate!.title,
                                                  artist: result.duplicate!.artist
                                                })}
                                                onMouseLeave={() => setHoveredDuplicate(null)}
                                              >{result.duplicate.title}</strong> <span className={styles.duplicateCheckId}>(#{result.duplicate.artwork_id})</span>
                                            </div>
                                          )}
                                          {artwork.pending_situation === 2 && (
                                            <div className={styles.duplicateCheckNote}>
                                              If you have made an update to your artwork, ignore this warning
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className={`${styles.duplicateCheck} ${styles.duplicateCheckError}`}>
                                        <div className={styles.duplicateCheckIcon}>⚠</div>
                                        <div className={styles.duplicateCheckContent}>
                                          <div className={styles.duplicateCheckTitle}>Duplicate Detected</div>
                                          <div className={styles.duplicateCheckMeta}>
                                            <span className={styles.duplicateCheckScore}>{score.toFixed(1)}%</span>
                                            <span className={styles.duplicateCheckLabel}>match</span>
                                          </div>
                                          {result.duplicate && (
                                            <div className={styles.duplicateCheckDetails}>
                                              Matches: <strong
                                                className={styles.duplicateTitle}
                                                onMouseEnter={() => setHoveredDuplicate({
                                                  artworkId: result.duplicate!.artwork_id,
                                                  imageUrl: result.duplicate!.spaces_dir_low_resolution || result.duplicate!.spaces_dir || '',
                                                  title: result.duplicate!.title,
                                                  artist: result.duplicate!.artist
                                                })}
                                                onMouseLeave={() => setHoveredDuplicate(null)}
                                              >{result.duplicate.title}</strong> <span className={styles.duplicateCheckId}>(#{result.duplicate.artwork_id})</span>
                                            </div>
                                          )}
                                          {artwork.pending_situation === 2 && (
                                            <div className={styles.duplicateCheckNote}>
                                              If you have made an update to your artwork, ignore this warning
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                })()
                              ) : null}
                                </>
                              )}

                              {expandedArtworkDetails.text_information.description && (
                                <div className={styles.detailSection}>
                                  <h3>About</h3>
                                  <p>{expandedArtworkDetails.text_information.description}</p>
                                </div>
                              )}
                              <div className={styles.detailsGrid}>
                                {expandedArtworkDetails.text_information.creation_date && (
                                  <div className={styles.detailSection}>
                                    <h3>Creation Date</h3>
                                    <p>{expandedArtworkDetails.text_information.creation_date}</p>
                                  </div>
                                )}
                                {expandedArtworkDetails.text_information.genre && (
                                  <div className={styles.detailSection}>
                                    <h3>Genre</h3>
                                    <p>{expandedArtworkDetails.text_information.genre}</p>
                                  </div>
                                )}
                                {expandedArtworkDetails.text_information.media && (
                                  <div className={styles.detailSection}>
                                    <h3>Media</h3>
                                    <p>{expandedArtworkDetails.text_information.media}</p>
                                  </div>
                                )}
                                {expandedArtworkDetails.text_information.dimensions && (
                                  <div className={styles.detailSection}>
                                    <h3>Dimensions</h3>
                                    <p>{expandedArtworkDetails.text_information.dimensions}</p>
                                  </div>
                                )}
                                {expandedArtworkDetails.text_information.style && (
                                  <div className={styles.detailSection}>
                                    <h3>Style/Era</h3>
                                    <p>{expandedArtworkDetails.text_information.style}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className={styles.detailsError}>Failed to load details</div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                    ))
                  )}
                </div>
                <div className={styles.pagination}>
                  {!isLoading && !isLoadingUser && searchText.length === 0 && artworks.length > 0 && (
                    <div ref={artworksLoadMoreRef} style={{ minHeight: '20px', padding: '20px 0' }}>
                      {isLoadingMore && hasMoreData && (
                        <div className={styles.loaderWrapper}>
                          <Loader />
                        </div>
                      )}
                    </div>
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
                        onClick={() => {
                          router.push(`/artist?edit=true&artistId=${artist.id}&pending=${artist.pending_situation === 2 || artist.pending_situation === 0 ? 'true' : 'false'}`);
                        }}
                      >

                        {loadingArtistId === artist.id && (
                          <LoadingOverlay isVisible={true} />
                        )}

                        <div className={styles.imageContainer}>
                          <img src={artist.image} alt={artist.name} className={styles.artworkImage} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 0, gap: '12px', paddingTop: '4px' }}>
                          <span className={styles.artworkTitle}>{artist.name}</span>
                          <span
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
                          </span>
                        </div>

                        {user?.type === "admin" ? (
                          <div className={styles.adminButtons} onClick={(e) => e.stopPropagation()}>
                            <button
                              className={styles.approveButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                approveArtist(artist.id);
                              }}
                            >
                              <FiCheck />
                            </button>
                            <button
                              className={styles.rejectButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                rejectArtist(artist.id);
                              }}
                            >
                              <FiX />
                            </button>
                            <Link
                              href={`/artist?edit=true&artistId=${artist.id}&pending=${artist.pending_situation === 2 || artist.pending_situation === 0 ? 'true' : 'false'}`}
                              className={styles.editButton}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FiEdit />
                            </Link>
                          </div>
                        ) : (
                          /* Museum View: Only Show "View Details" */
                          user?.type === "museum" && (
                            <span
                              className={styles.viewDetails}
                              onClick={(e) => e.stopPropagation()}
                            >
                              View artist's details →
                            </span>
                          )
                        )}

                      </div>
                    ))
                  )}
                </div>

                <div className={styles.pagination}>
                  {!isLoading && !isLoadingUser && searchText.length === 0 && artists.length > 0 && (
                    <div ref={artistsLoadMoreRef} style={{ minHeight: '20px', padding: '20px 0' }}>
                      {isLoadingMore && hasMoreDataArtists && (
                        <div className={styles.loaderWrapper}>
                          <Loader />
                        </div>
                      )}
                    </div>
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

      {/* Duplicate Image Tooltip */}
      {hoveredDuplicate && hoveredDuplicate.imageUrl && (
        <div className={styles.duplicateTooltip}>
          <div className={styles.duplicateTooltipContent}>
            <img
              src={hoveredDuplicate.imageUrl}
              alt={hoveredDuplicate.title}
              className={styles.duplicateTooltipImage}
            />
            <div className={styles.duplicateTooltipInfo}>
              <div className={styles.duplicateTooltipTitle}>{hoveredDuplicate.title}</div>
              <div className={styles.duplicateTooltipArtist}>{hoveredDuplicate.artist}</div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

"use client";

import React, { useEffect, useState, Suspense } from "react";
import styles from "./page.module.css";
import Header from "../../components/header/header";
import Footer from "@/components/footer/footer";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/context/UserContext";
import LoadingOverlay from "@/components/loadingOverlay/loadingOverlay";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase"; // Adjust this path to match your project structure
import { useAlert } from "@/context/AlertContext";
import SearchableDropdown from "@/components/searchableDropdown/searchableDropdown";

function SearchParamsHandler({
  setIsEditMode,
  setArtworkId,
  setIsPending,
  setPendingId,
  setArtistId, // Added setter for artistId
}: {
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setArtworkId: React.Dispatch<React.SetStateAction<number | null>>;
  setIsPending: React.Dispatch<React.SetStateAction<boolean | null>>;
  setPendingId: React.Dispatch<React.SetStateAction<number | null>>;
  setArtistId: React.Dispatch<React.SetStateAction<number | null>>; // Add type for artistId
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const editMode = searchParams.get("edit") === "true";
    const artworkId = searchParams.get("artworkId")
      ? parseInt(searchParams.get("artworkId")!, 10)
      : null;
    const pendingId = searchParams.get("pendingId")
      ? parseInt(searchParams.get("pendingId")!, 10)
      : null;
    const pending = searchParams.get("pending") === "true";
    const artistId = searchParams.get("artistId")
      ? parseInt(searchParams.get("artistId")!, 10)
      : null;

    setIsEditMode(editMode);
    setArtworkId(artworkId);
    setPendingId(pendingId);
    setIsPending(pending);
    setArtistId(artistId); // Set artistId
  }, [searchParams, setIsEditMode, setArtworkId, setPendingId, setIsPending, setArtistId]);

  return null;
}

interface Era {
  era_name: string;
  era_id: number;
}

interface VectorImage {
  presigned_url: string; // Adjust this based on the actual structure
}



export default function Artwork() {
  const [formData, setFormData] = useState<{
    artworkTitle: string;
    artistName: string;
    artistID: string;
    artworkYear: string;
    timelineLeft: string;
    timelineCenter: string;
    customTimelineCenter: string;
    timelineRight: string;
    artworkGenre: string;
    artworkMedia: string;
    artworkDimensions: string;
    artworkAbout: string;
    artworkArtistPicture: string;
    museumID: string;
    artistBornYear: string;
    artistDiedYear: string;
    artworkImage: string | File | null;
    additionalImages: (string | File | null)[];
    nsfw: boolean | null;
    priority: boolean | null;
  }>({
    artworkTitle: "",
    artistName: "",
    artistID: "",
    artworkYear: "",
    timelineLeft: "",
    timelineCenter: "",
    customTimelineCenter: "",
    timelineRight: "",
    artworkGenre: "",
    artworkMedia: "",
    artworkDimensions: "",
    artworkAbout: "",
    artworkArtistPicture: "",
    museumID: "",
    artistBornYear: "",
    artistDiedYear: "",
    artworkImage: null,
    additionalImages: [null, null, null], // Start with 3 empty slots
    nsfw: null, // Default to "No Option Selected"
    priority: null, // Default to "No Option Selected"
  });

  const resetForm = () => {
    setFormData({
      artworkTitle: "",
      artistName: "",
      artistID: "",
      artworkYear: "",
      timelineLeft: "",
      timelineCenter: "",
      customTimelineCenter: "",
      timelineRight: "",
      artworkGenre: "",
      artworkMedia: "",
      artworkDimensions: "",
      artworkAbout: "",
      artworkArtistPicture: "",
      museumID: "",
      artistBornYear: "",
      artistDiedYear: "",
      artworkImage: null,
      additionalImages: [null, null, null], // Start with 3 empty slots
      nsfw: null, // Default to "No Option Selected"
      priority: null, // Default to "No Option Selected"    
    });
    setIsSubmitted(false);
  };


  const router = useRouter();

  const { showAlert, showConfirm } = useAlert();

  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);
  const [eraOptions, setEraOptions] = useState<{ id: number; name: string }[]>([]);
  const [genreOptions, setGenreOptions] = useState<string[]>([]);

  const { user, getIdToken, isLoadingUser } = useUser(); // Access setUser from the UserContext
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Track if currently editing in edit mode
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [artworkId, setArtworkId] = useState<number | null>(null); // Define artworkId state
  const [artworkStatus, setArtworkStatus] = useState<"Rejected" | "Accepted" | "Pending" | null>(null);
  const [isPending, setIsPending] = useState<boolean | null>(null); // Track the pending status
  const [pendingId, setPendingId] = useState<number | null>(null); // Add pendingId state
  const [artistId, setArtistId] = useState<number | null>(null); // Added artistId state

  const [loadingEras, setLoadingEras] = useState(true);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [loadingFormData, setLoadingFormData] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingApproval, setLoadingApproval] = useState(false);

  const statusMap: { 0: "Rejected"; 1: "Accepted"; 2: "Pending" } = {
    0: "Rejected",
    1: "Accepted",
    2: "Pending",
  };


  const handleEditClick = () => {
    setIsEditing(true); // Enable editing
  };

  const handleCancelEdit = async () => {
    const confirmCancel = await showConfirm(
      "Are you sure you want to cancel changes? Any unsaved changes will be lost."
    );
    if (confirmCancel) {
      if (initialFormData) {
        setFormData(initialFormData); // Reset form data to the initial state
      }
      setIsEditing(false); // Exit editing mode
    }
  };

  const handleSaveChanges = async () => {
    if (!isFormValid) {
      showAlert("Please ensure all required fields are filled in correctly before saving changes.", "warning");
      return;
    }

    const confirmSave = await showConfirm(
      "Do you want to save the changes to this artwork? The existing artwork will be replaced with your updated submission."
    );

    if (confirmSave && artworkId) {

      if (artistId) {
        try {
          setLoadingSubmit(true); // Start loading state for submission

          // Submit the updated artwork with the optional artworkId
          await submitArtworkForApproval(artistId, artworkId);
          await submitAdditionalImages(artistId, artworkId);
          showAlert("Changes saved successfully!", "success");
          setInitialFormData(formData);
          setIsEditing(false); // Exit editing mode
          router.replace("/home"); // Redirect to /home after successful update
        } catch (error) {
          console.error("Error saving changes:", error);
          showAlert("An error occurred while saving changes.", "error");
        } finally {
          setLoadingSubmit(false); // Stop loading state
        }
      }
    }
  };

  const handleApprove = async () => {
    try {
      const confirmApprove = await showConfirm(
        "Are you sure you want to approve this artwork?"
      );
      if (confirmApprove && pendingId) {
        setLoadingApproval(true); // Start loading state
        const token = await getIdToken();
        const params = new URLSearchParams({
          admin_portal_token: token ?? "",
          pending_id: pendingId.toString(),
          accept: "true",
        });

        const response = await fetch(
          `https://api.artvista.app/accept_or_reject_artwork/?${params.toString()}`,
          { method: "GET" }
        );

        if (!response.ok) {
          throw new Error(`Failed to approve artwork: ${response.statusText}`);
        }

        showAlert("Artwork approved successfully.", "success");
        router.replace("/home"); // Redirect to /home
      }
    } catch (error) {
      console.error("Error approving artwork:", error);
      showAlert("An error occurred while approving the artwork.", "error");
    } finally {
      setLoadingApproval(false); // Stop loading state
    }
  };

  const handleReject = async () => {
    try {
      const confirmReject = await showConfirm(
        "Are you sure you want to reject this artwork?"
      );
      if (confirmReject && pendingId) {
        setLoadingApproval(true); // Start loading state
        const token = await getIdToken();
        const params = new URLSearchParams({
          admin_portal_token: token ?? "",
          pending_id: pendingId.toString(),
          accept: "false",
        });

        const response = await fetch(
          `https://api.artvista.app/accept_or_reject_artwork/?${params.toString()}`,
          { method: "GET" }
        );

        if (!response.ok) {
          throw new Error(`Failed to reject artwork: ${response.statusText}`);
        }
        showAlert("Artwork rejected successfully.", "success");

        router.replace("/home"); // Redirect to /home
      }
    } catch (error) {
      console.error("Error rejecting artwork:", error);
      showAlert("An error occurred while rejecting the artwork.", "error");
    } finally {
      setLoadingApproval(false); // Stop loading state
    }
  };


  const deleteArtwork = async (artistId: number, artworkId: number, isPending: boolean) => {
    try {
      const token = await getIdToken();
      const params = new URLSearchParams({
        artist_portal_token: token ?? "",
        artist_id: artistId.toString(),
        artwork_id: artworkId.toString(),
        is_pending: isPending.toString(), // Include the is_pending parameter
      });

      const response = await fetch(
        `https://api.artvista.app/delete_artwork/?${params.toString()}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete artwork: ${response.statusText}`);
      }

    } catch (error) {
      console.error("Error deleting artwork:", error);
      showAlert(error instanceof Error ? error.message : "An error occurred.", "error");
    }
  };

  const handleDelete = async () => {
    const confirmDelete = await showConfirm(
      "Are you sure you want to delete this artwork? This action cannot be undone."
    );
    if (confirmDelete && artworkId) {
      if (artistId) {
        try {
          setLoadingDelete(true); // Start loading state
          await deleteArtwork(artistId, artworkId, isPending ?? false); // Pass isPending state
          router.replace("/home"); // Redirect to /home after successful deletion
        } catch (error) {
          console.error("Error deleting artwork:", error);
          showAlert("An error occurred while deleting the artwork.", "error");
        } finally {
          setLoadingDelete(false); // Stop loading state
        }
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, files } = e.target as HTMLInputElement & {
      files: FileList;
    };

    if (name === "artworkImage" && files && files[0]) {
      const file = files[0];
      const validTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        showAlert("Invalid file type. Please upload a JPEG or PNG image.", "warning");
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: files && files.length > 0 ? files[0] : value,
    }));
  };

  const handleAdditionalImageChange = (index: number, file: File | null) => {
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        showAlert("Invalid file type. Please upload a JPEG or PNG image.", "warning");
        return;
      }
    }

    if (!formData.artworkImage) {
      showAlert("Please upload the main artwork image first before adding additional images.", "warning");
      return; // Prevent changes to additional images if artworkImage is not filled
    }

    setFormData((prev) => {
      const updatedImages = [...prev.additionalImages];
      updatedImages[index] = file;

      // Only add a new slot if the last slot is filled and it's not already at the array limit
      if (updatedImages[updatedImages.length - 1] !== null) {
        updatedImages.push(null);
      }

      return { ...prev, additionalImages: updatedImages };
    });
  };

  const handleRemoveAdditionalImage = (index: number) => {
    setFormData((prev) => {
      const updatedImages = [...prev.additionalImages];
      updatedImages.splice(index, 1); // Remove the specific image
      // Ensure at least 3 boxes are present
      while (updatedImages.length < 3) {
        updatedImages.push(null); // Add empty slots if necessary
      }
      return { ...prev, additionalImages: updatedImages };
    });
  };


  const isFormValid =
    formData.artworkTitle &&
    (user?.type === "artist" || (formData.artistName && formData.artistName !== "No Option Selected")) && // Only require artistName if user is not an artist
    formData.artworkAbout &&
    formData.artworkImage &&
    formData.timelineCenter &&
    formData.timelineCenter !== "No Option Selected" && // Exclude the placeholder option
    (formData.timelineCenter !== "custom" || (formData.timelineCenter === "custom" && formData.customTimelineCenter && formData.customTimelineCenter.trim() !== ""));

  // Function to fetch artist ID from Firestore
  const fetchArtistId = async (): Promise<number | null> => {
    try {
      if (!user || !user.email) {
        throw new Error("User email not found. Please log in again.");
      }

      const userDocRef = doc(db, "users", user.email);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        throw new Error("User document not found in Firestore.");
      }

      const artistIds = userDocSnap.data()?.artist_ids || [];
      if (artistIds.length === 0) {
        throw new Error("No artist IDs found for this user.");
      }
      return artistIds[0]; // Return the first artist ID
    } catch (error) {
      console.error("Error fetching artist ID:", error);
      showAlert(error instanceof Error ? error.message : "Unknown error occurred.", "error");
      return null;
    }
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isFormValid) {
      try {
        let currentArtistId = artistId;

        if (!currentArtistId) {
          currentArtistId = await fetchArtistId(); // Fetch artist ID if it's null
        }

        if (currentArtistId) {
          setLoadingSubmit(true);
          const artworkId = await submitArtworkForApproval(currentArtistId);
          if (artworkId) {
            await submitAdditionalImages(currentArtistId, artworkId);
            setLoadingSubmit(false);
            setIsSubmitted(true);
          }
        } else {
          showAlert("Artist ID could not be retrieved.", "error");
        }
      } catch (error) {
        console.error("Error submitting artwork:", error);
        showAlert("An error occurred while submitting your artwork.", "error");
        setLoadingSubmit(false);
      }
    } else {
      showAlert("Please fill in all required fields.", "warning");
    }
  };

  const fetchImageWithProxy = async (url: string, filename: string): Promise<File | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch image via proxy");

      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type });
    } catch (error) {
      console.error("Error fetching image via proxy:", error);
      return null;
    }
  };


  useEffect(() => {
    const fetchEraOptions = async () => {
      try {
        if (user) {
          const token = await getIdToken();
          const response = await fetch(
            `https://api.artvista.app/get_list_of_eras/?artist_portal_token=${token}`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data: Era[] = await response.json();
          // Store both era_id and era_name
          const eraOptions = data.map((item) => ({
            id: item.era_id,
            name: item.era_name,
          }));
          setEraOptions(eraOptions);
        } else {
          console.error("User is not logged in.");
        }
      } catch (error) {
        console.error("Error fetching era options:", error);
      } finally {
        setLoadingEras(false);
      }
    };

    fetchEraOptions();
  }, [user]);

  useEffect(() => {
    const fetchGenreOptions = async () => {
      try {
        if (user) {
          const token = await getIdToken();
          const response = await fetch(
            `https://api.artvista.app/get_list_of_genres/?artist_portal_token=${token}`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const genres: string[] = await response.json(); // Directly use the response as an array of strings
          setGenreOptions(genres);
        } else {
          console.error("User is not logged in.");
        }
      } catch (error) {
        console.error("Error fetching genre options:", error);
      } finally {
        setLoadingGenres(false);
      }
    };

    fetchGenreOptions();
  }, [user]);



  useEffect(() => {
    const fetchArtworkDetails = async () => {
      try {
        if (user && artworkId !== null && isPending !== null && !loadingEras && !loadingGenres) {
          const token = await getIdToken();

          // Determine the endpoint based on the user type
          const endpoint = user.type === "admin"
            ? `https://api.artvista.app/get_artwork_details_to_admin_portal/?admin_portal_token=${token}&artwork_id=${artworkId}&is_pending=${isPending}`
            : `https://api.artvista.app/get_artwork_details_to_portal/?artist_portal_token=${token}&artwork_id=${artworkId}&is_pending=${isPending}`;

          const response = await fetch(endpoint);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const artworkDetails = await response.json();

          const { image_links, text_information } = artworkDetails;

          const headerImageFile = image_links?.header_image
            ? await fetchImageWithProxy(image_links.header_image, "header_image.jpg")
            : null;

          const fetchedVectorImages = await Promise.all(
            image_links?.vector_images?.map(async (img: VectorImage, index: number) => {
              return await fetchImageWithProxy(img.presigned_url, `vector_image_${index + 1}.jpg`);
            }) || []
          );

          // Calculate the number of null slots to add
          const nullSlots =
            fetchedVectorImages.length === 0
              ? 3
              : fetchedVectorImages.length === 1
                ? 2
                : 1;

          const vectorImageFiles = [...fetchedVectorImages, ...Array(nullSlots).fill(null)];

          // Explicitly type pendingSituation
          const pendingSituation = text_information.pending_situation as 0 | 1 | 2;

          // Assert the returned type when setting artworkStatus
          setArtworkStatus(statusMap[pendingSituation] || null);

          const matchedEra = eraOptions.find((era) => era.name === text_information.style);
          const fetchedData = {
            artworkTitle: text_information.title || "",
            artistName: text_information.artist || "",
            artistID: text_information.artist_id?.toString() || "",
            artworkYear: text_information.creation_date || "",
            timelineLeft: text_information.pre_style || "",
            timelineCenter: matchedEra ? matchedEra.id.toString() : "", // Set the matched ID or leave blank
            customTimelineCenter: "",
            timelineRight: text_information.post_style || "",
            artworkGenre: text_information.genre || "",
            artworkMedia: text_information.media || "",
            artworkDimensions: text_information.dimensions || "",
            artworkAbout: text_information.description || "",
            artworkArtistPicture: "",
            museumID: text_information.museum_id?.toString() || "",
            artistBornYear: "", // Populate if available in the API response
            artistDiedYear: "", // Populate if available in the API response
            artworkImage: headerImageFile,
            additionalImages: vectorImageFiles,
            nsfw: text_information.is_nsfw,
            priority: text_information.importance_factor === 10, // Convert to boolean
          };
          setFormData(fetchedData);
          setInitialFormData(fetchedData); // Store the fetched data as the initial state
        }
      } catch (error) {
        console.error("Error fetching artwork details:", error);
      } finally {
        setLoadingFormData(false);
      }
    };
    fetchArtworkDetails();
  }, [eraOptions, genreOptions]);


  const submitArtworkForApproval = async (
    artistId: number,
    artworkId?: number // Optional parameter
  ): Promise<number | null> => {
    try {
      const params = new URLSearchParams({
        artist_portal_token: (await getIdToken()) ?? "",
        artist_id: artistId.toString(),
        artwork_title: formData.artworkTitle,
        about_description: formData.artworkAbout,
        year_created: formData.artworkYear,
        era_id: formData.timelineCenter,
        genre: formData.artworkGenre,
        media: formData.artworkMedia,
        dimensions: formData.artworkDimensions,
        is_nsfw: formData.nsfw ? "true" : "false",
        importance_factor: formData.priority ? "10" : "0", // Send 10 for true, 0 for false
      });

      // Add the optional artwork_id if provided
      if (artworkId) {
        params.append("artwork_id", artworkId.toString());
      }

      const formDataToSend = new FormData();
      if (formData.artworkImage instanceof File) {
        formDataToSend.append("header_image", formData.artworkImage);
      } else {
        throw new Error("Artwork image is required.");
      }

      const response = await fetch(
        `https://api.artvista.app/submit_artwork_for_approval/?${params.toString()}`,
        {
          method: "POST",
          body: formDataToSend,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to submit artwork: ${response.statusText}`);
      }

      const result = await response.json();
      return result.artwork_id; // Return artwork_id for the next step
    } catch (error) {
      console.error("Error submitting artwork:", error);
      showAlert(error instanceof Error ? error.message : "An error occurred.", "error");
      return null;
    }
  };

  const submitAdditionalImages = async (artistId: number, artworkId: number) => {
    try {
      for (const image of formData.additionalImages) {
        if (image instanceof File) {
          const formDataToSend = new FormData();
          formDataToSend.append("additional_image", image);
          const params = new URLSearchParams({
            artist_portal_token: (await getIdToken()) ?? "",
            artist_id: artistId.toString(),
            artwork_id: artworkId.toString(),
          });

          const response = await fetch(
            `https://api.artvista.app/submit_additional_image_of_given_artwork/?${params.toString()}`,
            {
              method: "POST",
              body: formDataToSend,
            }
          );

          if (!response.ok) {
            throw new Error(
              `Failed to submit additional image: ${response.statusText}`
            );
          }

          // Additional image uploaded successfully
        }
      }
    } catch (error) {
      console.error("Error submitting additional images:", error);
      showAlert("An error occurred while uploading additional images.", "error");
    }
  };






  return (
    <>
      <Header />
      <div className={styles.page}>
        <Suspense fallback={<div>Loading search params...</div>}>
          <SearchParamsHandler
            setIsEditMode={setIsEditMode}
            setArtworkId={setArtworkId}
            setIsPending={setIsPending}
            setPendingId={setPendingId}
            setArtistId={setArtistId} // Pass the setter for artistId
          />
        </Suspense>
        {isSubmitted ? (
          <div className={styles.thankYouMessage}>
            <h1>Thank You for Submitting a New Artwork!</h1>
            <p>
              Your submission has been received. This artwork will be pending until your submission is verified and accepted.
            </p>
            <button className={styles.resetButton} onClick={resetForm}>
              Add Another Artwork
            </button>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <h1 className={styles.headerTitle}>
                {isEditMode ? "Edit Artwork" : "Add a New Artwork"}
              </h1>
              {isEditMode && (
                <>
                  <span className={styles.divider}></span>
                  {!loadingFormData ? (
                    artworkStatus ? (
                      <p
                        className={`${styles.headerHelp} ${artworkStatus === "Pending"
                          ? styles.pendingStatus
                          : artworkStatus === "Accepted"
                            ? styles.publishedStatus
                            : styles.rejectedStatus
                          }`}
                      >
                        {artworkStatus === "Pending"
                          ? "This artwork is pending approval."
                          : artworkStatus === "Accepted"
                            ? "This artwork has been accepted and published."
                            : "This artwork has been rejected."}
                      </p>
                    ) : null
                  ) : null}
                </>
              )}
              {!isEditMode && (
                <>
                  <span className={styles.divider}></span>
                  <p className={styles.headerHelp}>
                    Need help? Check our guide on how to add artworks{" "}
                    <a href="/guide" className={`${styles.link} ${styles.gradientText}`}>
                      here!
                    </a>
                  </p>
                </>
              )}
            </div>
            <form
              id="artwork-register-form"
              className={`${styles.form} ${styles.registeringForm}`}
              onSubmit={handleSubmit}
            >

              <LoadingOverlay isVisible={loadingEras || loadingFormData || isLoadingUser || loadingSubmit || loadingDelete || loadingGenres || loadingApproval} />

              {loadingSubmit && (
                <div className={styles.uploadingText}>
                  Uploading images...
                </div>
              )}

              <div className={styles.formRow}>
                <div className={styles.leftColumn}>
                  <div className={styles.inputWrapperRequired}>
                    <p>Upload an artwork profile image</p>
                    <div
                      className={`${styles.imageUploadWrapper} ${isEditMode ? styles.overlay : ""
                        }`}
                    >
                      {formData.artworkImage && (!isEditMode) && (
                        <button
                          type="button"
                          className={styles.closeButton}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              artworkImage: null, // Set the header image to null
                            }))
                          }
                        >
                          &times;
                        </button>
                      )}
                      <input
                        type="file"
                        id="artworkImageInput"
                        name="artworkImage"
                        accept="image/jpeg, image/png, image/jpg" // Restrict to allowed formats
                        className={styles.hiddenInput}
                        onChange={handleInputChange}
                        disabled={isEditMode} // Disable input when isEditMode is true
                      />
                      <label htmlFor="artworkImageInput" className={styles.imageUploadBox}>
                        {formData.artworkImage ? (
                          <img
                            src={
                              formData.artworkImage instanceof File
                                ? URL.createObjectURL(formData.artworkImage)
                                : formData.artworkImage // Use the URL string if it's not a File
                            }
                            alt="Artwork Profile"
                            className={styles.uploadedImage}
                            onClick={() => {
                              if (isEditMode && isEditing) {
                                showAlert(
                                  "This field cannot be modified. If you need to change this image, delete the artwork and create a new one.",
                                  "warning"
                                );
                              }
                            }}
                          />
                        ) : (
                          <span className={styles.plusIcon}>+</span>
                        )}
                      </label>
                    </div>
                  </div>
                  <div className={styles.additionalInfo}>
                    <p>
                      In case you are uploading a 3D artwork (anything that can be scanned from various angles),
                      you probably want to provide us more images for scanning purposes. This is not mandatory and not needed if you are uploading a 2D art.
                    </p>
                    <div className={styles.extraImagesContainer}>
                      {formData.additionalImages.map((image, index) => (
                        <div
                          key={index}
                          className={`${styles.additionalImageUploadWrapper} ${isEditMode && !isEditing ? styles.overlay : ""
                            }`}
                        >
                          <div className={styles.imageBox}>
                            {image && (!isEditMode || isEditing) && (
                              <button
                                type="button"
                                className={styles.closeButton}
                                onClick={() => handleRemoveAdditionalImage(index)}
                              >
                                &times;
                              </button>
                            )}
                            <input
                              type="file"
                              id={`additionalImage${index}`}
                              name={`additionalImage${index}`}
                              accept="image/jpeg, image/png, image/jpg" // Restrict to allowed formats
                              className={styles.hiddenInput}
                              onChange={(e) => handleAdditionalImageChange(index, e.target.files?.[0] || null)}
                              disabled={isEditMode && !isEditing} // Allow editing only when in edit mode and editing is enabled
                            />
                            <label
                              htmlFor={`additionalImage${index}`}
                              className={`${styles.imageUploadBox} ${styles.smallImageUploadBox}`}
                            >
                              {image ? (
                                <img
                                  src={image instanceof File ? URL.createObjectURL(image) : (image as string)}
                                  alt={`Additional Image ${index + 1}`}
                                  className={styles.uploadedImage}
                                />
                              ) : (
                                <span className={styles.plusIcon}>+</span>
                              )}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
                <div className={styles.rightColumn}>
                  <div
                    className={styles.inputWrapperRequired}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent the event from bubbling further
                      if (isEditMode && isEditing) {
                        showAlert(
                          "This field cannot be modified. If you need to change the artwork title, delete the artwork and create a new one.",
                          "warning"
                        );
                      }
                    }}
                  >
                    <p>Artwork Title</p>
                    <input
                      type="text"
                      name="artworkTitle"
                      className={styles.input}
                      value={formData.artworkTitle}
                      onChange={handleInputChange}
                      disabled={isEditMode}
                      style={isEditMode ? { pointerEvents: "none" } : {}} // Apply pointerEvents only when isEditMode is true
                    />
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>About</p>
                    <textarea
                      name="artworkAbout"
                      className={`${styles.input} ${styles.textarea}`}
                      value={formData.artworkAbout}
                      onChange={(e) => {
                        handleInputChange(e);
                        e.target.style.height = "auto";
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      rows={1}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>Era of Origin</p>
                    <SearchableDropdown
                      options={eraOptions}
                      value={
                        formData.timelineCenter
                          ? eraOptions.find((era) => era.id === parseInt(formData.timelineCenter))?.name || ""
                          : "" // Ensure it shows "No Option Selected" when empty
                      }
                      onChange={(selectedName) => {
                        if (selectedName === "") {
                          // Clear state when "Clear" is clicked
                          setFormData((prev) => ({
                            ...prev,
                            timelineCenter: "",
                          }));
                        } else {
                          const selectedEra = eraOptions.find((era) => era.name === selectedName);
                          if (selectedEra) {
                            setFormData((prev) => ({
                              ...prev,
                              timelineCenter: selectedEra.id.toString(), // Store the ID as a string
                            }));
                          }
                        }
                      }}
                      placeholder="No Option Selected"
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  {user?.type == "museum" && (
                    <div className={styles.inputWrapperRequired}>
                      <p>Select An Existing Artist</p>
                      <select
                        name="artistName"
                        className={`${styles.input} ${styles.select}`}
                        value={formData.artistName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            artistName: e.target.value,
                          }))
                        }
                        disabled={isEditMode && !isEditing}
                      >
                        <option value="">No Option Selected</option>
                        <option value="Leonardo da Vinci">Leonardo da Vinci</option>
                        <option value="Vincent van Gogh">Vincent van Gogh</option>
                        <option value="Pablo Picasso">Pablo Picasso</option>
                        <option value="Claude Monet">Claude Monet</option>
                        <option value="Salvador Dalí">Salvador Dalí</option>
                      </select>
                    </div>
                  )}

                  <div className={styles.inputWrapper}>
                    <p>Year the Artwork Was Created</p>
                    <input
                      type="number"
                      name="artworkYear"
                      className={styles.input}
                      value={formData.artworkYear}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Artwork's Genre</p>
                    <SearchableDropdown
                      options={genreOptions} // Pass the genre options (array of strings)
                      value={formData.artworkGenre}
                      onChange={(selectedGenre) =>
                        setFormData((prev) => ({
                          ...prev,
                          artworkGenre: selectedGenre, // Update the selected genre
                        }))
                      }
                      placeholder="No Option Selected"
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>What Materials or Mediums Were Used to Create the Artwork?</p>
                    <input
                      type="text"
                      name="artworkMedia"
                      placeholder="Examples: oil, canvas | photo print | engraving etc."
                      className={styles.input}
                      value={formData.artworkMedia}
                      onChange={handleInputChange}
                      maxLength={25}
                      disabled={isEditMode && !isEditing}
                    />
                    <span
                      className={`${styles.charCounter} ${formData.artworkMedia.length === 25 ? styles.charCounterLimit : ""
                        }`}
                    >
                      {formData.artworkMedia.length} / 25 characters
                    </span>
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Artwork's Dimensions</p>
                    <input
                      type="text"
                      name="artworkDimensions"
                      placeholder="Example: 10 x 10 cm"
                      className={styles.input}
                      value={formData.artworkDimensions}
                      onChange={handleInputChange}
                      maxLength={25}
                      disabled={isEditMode && !isEditing}
                    />
                    <span
                      className={`${styles.charCounter} ${formData.artworkDimensions.length === 25 ? styles.charCounterLimit : ""
                        }`}
                    >
                      {formData.artworkDimensions.length} / 25 characters
                    </span>
                  </div>
                  <div
                    className={styles.inputWrapper}
                    onClick={(e) => {
                      if (isEditMode && isEditing) {
                        e.stopPropagation(); // Prevent further propagation
                        showAlert(
                          "This field cannot be modified. If you need to change the NSFW status, delete the artwork and create a new one.",
                          "warning"
                        );
                      }
                    }}
                  >
                    <p>Is the Artwork NSFW?</p>
                    <select
                      name="nsfw"
                      className={`${styles.input} ${styles.select}`}
                      value={formData.nsfw === null ? "" : formData.nsfw.toString()}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          nsfw: e.target.value === "true" ? true : e.target.value === "false" ? false : null,
                        }))
                      }
                      disabled={isEditMode}
                      style={isEditMode ? { pointerEvents: "none" } : {}} // Disable pointer events only when in edit mode
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Prioritize This Artwork Over Other Artworks From the Same Artist? (it will appear on the artist's profile page and be suggested more overall)</p>
                    <select
                      name="priority"
                      className={`${styles.input} ${styles.select}`}
                      value={formData.priority === null ? "" : formData.priority.toString()}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          priority: e.target.value === "true" ? true : e.target.value === "false" ? false : null,
                        }))
                      }
                      disabled={isEditMode && !isEditing}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className={`${styles.buttonRow} ${styles.registerButtonWrapper}`}>
                {isEditMode ? (
                  isEditing ? (
                    <>
                      <button
                        type="button"
                        className={styles.button}
                        onClick={handleSaveChanges}
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.cancelButton}`}
                        onClick={handleCancelEdit}
                      >
                        Cancel Changes
                      </button>
                    </>
                  ) : user?.type === "admin" ? (
                    <>
                      <button
                        type="button"
                        className={styles.button}
                        onClick={handleEditClick}
                      >
                        Edit Artwork
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approveButton}`}
                        onClick={handleApprove} // You will need to implement this function
                      >
                        Approve Artwork
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.rejectButton}`}
                        onClick={handleReject} // You will need to implement this function
                      >
                        Reject Artwork
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.button}
                        onClick={handleEditClick}
                      >
                        Edit Artwork
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.deleteButton}`}
                        onClick={handleDelete}
                      >
                        Delete Artwork
                      </button>
                    </>
                  )
                ) : (
                  <button type="submit" form="artwork-register-form" className={styles.button}>
                    Submit Artwork For Approval
                  </button>
                )}
              </div>
            </form>

            <div className={styles.guideContainer}>
              <p className={styles.guideText}>
                <strong>Do you want to upload multiple artworks at a time using Excel?</strong>
              </p>
              <div className={styles.guideActions}>
                <p className={styles.guideLink}>
                  <span className={styles.italicText}>Check our 'how to' guide here!</span>
                </p>
                <button className={styles.soonButton}>Soon!</button>
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}

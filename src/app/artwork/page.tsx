"use client";

import React, { useEffect, useState, Suspense } from "react";
import styles from "./page.module.css";
import Header from "../../components/header/header";
import Footer from "@/components/footer/footer";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/context/UserContext";
import LoadingOverlay from "@/components/loadingOverlay/loadingOverlay";
import router from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase"; // Adjust this path to match your project structure

function SearchParamsHandler({
  setIsEditMode,
  setArtworkId,
}: {
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setArtworkId: React.Dispatch<React.SetStateAction<number | null>>;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const editMode = searchParams.get("edit") === "true";
    const artworkId = searchParams.get("artworkId")
      ? parseInt(searchParams.get("artworkId")!, 10)
      : null;
    setIsEditMode(editMode);
    setArtworkId(artworkId);
  }, [searchParams, setIsEditMode, setArtworkId]);

  return null; // This component only handles state updates
}

interface Era {
  era_name: string;
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

  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);
  const [eraOptions, setEraOptions] = useState<string[]>([]);

  const { user, getIdToken, isLoadingUser } = useUser(); // Access setUser from the UserContext
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Track if currently editing in edit mode
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [artworkId, setArtworkId] = useState<number | null>(null); // Define artworkId state
  const [artworkStatus, setArtworkStatus] = useState<"pending" | "published" | null>(null);

  const [loadingEras, setLoadingEras] = useState(true);
  const [loadingFormData, setLoadingFormData] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true); // Enable editing
  };

  const handleCancelEdit = () => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel changes? Any unsaved changes will be lost."
    );
    if (confirmCancel) {
      if (initialFormData) {
        setFormData(initialFormData); // Reset form data to the initial state
      }
      setIsEditing(false); // Exit editing mode
    }
  };

  const handleSaveChanges = () => {
    const confirmSave = window.confirm(
      "Do you want to save the changes to this artwork? Saved changes will be pending and will have to be verified."
    );
    if (confirmSave) {
      // Implement logic to save changes here
      setInitialFormData(formData); // Update initial state to match current form data
      alert("Changes saved successfully!");
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this artwork? This action cannot be undone."
    );
    if (confirmDelete) {
      // Implement logic to delete the artwork here
      alert("Artwork deleted!");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, files } = e.target as HTMLInputElement & {
      files: FileList;
    };

    setFormData((prev) => ({
      ...prev,
      [name]: files && files.length > 0 ? files[0] : value,
    }));
  };

  const handleAdditionalImageChange = (index: number, file: File | null) => {
    if (!formData.artworkImage) {
      alert("Please upload the main artwork image first before adding additional images.");
      return; // Prevent changes to additional images if artworkImage is not filled
    }

    setFormData((prev) => {
      const updatedImages = [...prev.additionalImages];
      updatedImages[index] = file;

      // Only add a new slot if the last slot is filled and it's not already at the array limit
      if (
        updatedImages[updatedImages.length - 1] !== null
      ) {
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
  const fetchArtistId = async (): Promise<string | null> => {
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
      alert(error instanceof Error ? error.message : "Unknown error occurred.");
      return null;
    }
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isFormValid) {
      try {
        const artistId = await fetchArtistId(); // Fetch artist ID once
        if (artistId) {
          console.log('artist id ' + artistId);
          setLoadingSubmit(true);
          const artworkId = await submitArtworkForApproval(artistId);
          if (artworkId) {
            await submitAdditionalImages(artistId, artworkId);
            setLoadingSubmit(false);
            setIsSubmitted(true);
          }
        }
      } catch (error) {
        console.error("Error submitting artwork:", error);
        alert("An error occurred while submitting your artwork.");
      }
    } else {
      alert("Please fill in all required fields.");
    }
  };

  useEffect(() => {
    const fetchEraOptions = async () => {
      try {
        if (user) {
          const token = await getIdToken();
          const response = await fetch(`https://api.artvista.app/get_list_of_eras/?artist_portal_token=${token}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data: Era[] = await response.json();
          const eraNames = data.map((item) => item.era_name);
          setEraOptions(eraNames);
        } else {
          console.error("User is not logged in.");
        }
      } catch (error) {
        console.error("Error fetching era options:", error);
      } finally {
        setLoadingEras(false); // Set loading to false regardless of success or error
      }
    };

    fetchEraOptions();
  }, [user]);


  useEffect(() => {
    const fetchArtworkDetails = async () => {
      try {
        if (user && artworkId !== null) {
          const token = await getIdToken();
          const response = await fetch(
            `https://api.artvista.app/get_artwork_details_to_portal/?artist_portal_token=${token}&artwork_id=${artworkId}`
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const artworkDetails = await response.json();
          const { image_links, text_information } = artworkDetails;
          const fetchedData = {
            artworkTitle: text_information.title || "",
            artistName: text_information.artist || "",
            artistID: text_information.artist_id?.toString() || "",
            artworkYear: text_information.creation_date || "",
            timelineLeft: text_information.pre_style || "",
            timelineCenter: text_information.style || "",
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
            artworkImage: image_links?.header_image || null,
            additionalImages: (() => {
              const vectorImages =
                image_links?.vector_images?.map((img: VectorImage) => img.presigned_url) || [];
              const numVectorImages = vectorImages.length;

              if (numVectorImages >= 3) {
                // If there are 3 or more vector images, add exactly one null at the end
                return [...vectorImages, null];
              } else {
                // Otherwise, ensure the total length is 3 by adding enough nulls
                return [...vectorImages, ...Array(3 - numVectorImages).fill(null)];
              }
            })(),
            nsfw: text_information.is_nsfw || false,
            priority: text_information.importance_factor || false,
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
  }, [artworkId, user, getIdToken]);


  const submitArtworkForApproval = async (artistId: string): Promise<number | null> => {
    try {
      const params = new URLSearchParams({
        artist_portal_token: (await getIdToken()) ?? "",
        artist_id: artistId,
        artwork_title: formData.artworkTitle,
        about_description: formData.artworkAbout,
        year_created: formData.artworkYear,
        era_id: "2",
        genre: formData.artworkGenre,
        media: formData.artworkMedia,
        dimensions: formData.artworkDimensions,
        is_nsfw: formData.nsfw ? "true" : "false",
        importance_factor: formData.priority ? "true" : "false",
      });

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
      console.log("First Endpoint Response:", result);
      return result.artwork_id; // Return artwork_id for the next step
    } catch (error) {
      console.error("Error submitting artwork:", error);
      alert(error instanceof Error ? error.message : "An error occurred.");
      return null;
    } finally {
    }
  };

  const submitAdditionalImages = async (artistId: string, artworkId: number) => {
    try {
      for (const image of formData.additionalImages) {
        if (image instanceof File) {
          const formDataToSend = new FormData();
          formDataToSend.append("additional_image", image);

          const params = new URLSearchParams({
            artist_portal_token: (await getIdToken()) ?? "",
            artist_id: artistId,
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

          console.log(`Uploaded additional image for artwork ID ${artworkId}`);
        }
      }
      alert("Artwork submitted successfully!");
    } catch (error) {
      console.error("Error submitting additional images:", error);
      alert("An error occurred while uploading additional images.");
    }
  };



  useEffect(() => {
    if (!isLoadingUser && (user === undefined || user?.type === undefined)) {
      router.push("/login"); // Redirect to login if user type is not determined
    }
  }, [user, router]);



  return (
    <>
      <Header />
      <div className={styles.page}>
        <Suspense fallback={<div>Loading search params...</div>}>
          <SearchParamsHandler setIsEditMode={setIsEditMode} setArtworkId={setArtworkId} />
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
                  <p
                    className={`${styles.headerHelp} ${artworkStatus === "pending" ? styles.pendingStatus : styles.publishedStatus
                      }`}
                  >
                    {artworkStatus === "pending"
                      ? "There are pending changes to the artwork"
                      : "This artwork has been published"}
                  </p>
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

              <LoadingOverlay isVisible={loadingEras || loadingFormData || isLoadingUser || loadingSubmit} />

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
                      className={`${styles.imageUploadWrapper} ${isEditMode && !isEditing ? styles.overlay : ""
                        }`}
                    >
                      {formData.artworkImage && (!isEditMode || isEditing) && (
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
                        accept="image/*"
                        className={styles.hiddenInput}
                        onChange={handleInputChange}
                        disabled={isEditMode && !isEditing}
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
                              accept="image/*"
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
                  <div className={styles.inputWrapperRequired}>
                    <p>Artwork Title</p>
                    <input
                      type="text"
                      name="artworkTitle"
                      className={styles.input}
                      value={formData.artworkTitle}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
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
                    <p>Select Era of Origin</p>
                    <select
                      name="timelineCenter"
                      className={`${styles.input} ${styles.select}`}
                      value={formData.timelineCenter}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          timelineCenter: value,
                          customTimelineCenter: value !== "custom" ? "" : prev.customTimelineCenter, // Reset customTimelineCenter if not "custom"
                        }));
                      }}
                      disabled={isEditMode && !isEditing}
                    >
                      <option value="">No Option Selected</option>
                      {eraOptions.map((era, index) => (
                        <option key={index} value={era}>
                          {era}
                        </option>
                      ))}
                      <option value="custom">Other (Specify below)</option>
                    </select>

                    {formData.timelineCenter === "custom" && (
                      <input
                        type="text"
                        name="customTimelineCenter"
                        placeholder=""
                        className={`${styles.input} ${styles.customInput}`}
                        value={formData.customTimelineCenter || ""} // Default to an empty string
                        disabled={isEditMode && !isEditing}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customTimelineCenter: e.target.value,
                          }))
                        }
                      />
                    )}
                  </div>

                  {user?.type !== "artist" && (
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
                    <select
                      name="artworkGenre"
                      className={`${styles.input} ${styles.select}`}
                      value={formData.artworkGenre}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          artworkGenre: e.target.value,
                        }))
                      }
                      disabled={isEditMode && !isEditing}
                    >
                      <option value="">No Option Selected</option>
                      <option value="Photo">Photo</option>
                      <option value="Sculpture">Sculpture</option>
                      <option value="Painting">Painting</option>
                      <option value="Digital Art">Digital Art</option>
                      <option value="Installation">Installation</option>
                      <option value="Mixed Media">Mixed Media</option>
                    </select>
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
                      disabled={isEditMode && !isEditing}
                    />
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
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
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
                      disabled={isEditMode && !isEditing}
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

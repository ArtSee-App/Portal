"use client";

import React, { useEffect, useState, Suspense } from "react";
import styles from "./page.module.css";
import Header from "../../components/header/header";
import Footer from "@/components/footer/footer";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/context/UserContext";
import LoadingOverlay from "@/components/loadingOverlay/loadingOverlay";
import router from "next/router";

function SearchParamsHandler({ setIsEditMode }: { setIsEditMode: React.Dispatch<React.SetStateAction<boolean>> }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const editMode = searchParams.get("edit") === "true";
    setIsEditMode(editMode);
  }, [searchParams, setIsEditMode]);

  return null; // This component only handles state updates
}

interface Era {
  era_name: string;
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
    artworkImage: File | null;
    additionalImage1: File | null;
    additionalImage2: File | null;
    additionalImage3: File | null;
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
    additionalImage1: null,
    additionalImage2: null,
    additionalImage3: null,
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
      additionalImage1: null,
      additionalImage2: null,
      additionalImage3: null,
      nsfw: null, // Default to "No Option Selected"
      priority: null, // Default to "No Option Selected"    
    });
    setIsSubmitted(false);
  };


  const [isSubmitted, setIsSubmitted] = useState(false);
  const [eraOptions, setEraOptions] = useState<string[]>([]);
  const { user, getIdToken } = useUser(); // Access setUser from the UserContext
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Track if currently editing in edit mode
  const [artworkStatus, setArtworkStatus] = useState<"pending" | "published" | null>(null);
  const [loading, setLoading] = useState(true);
  const handleEditClick = () => {
    setIsEditing(true); // Enable editing
  };

  const handleCancelEdit = () => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel changes? Any unsaved changes will be lost."
    );
    if (confirmCancel) {
      setIsEditing(false); // Cancel editing
    }
  };

  const handleSaveChanges = () => {
    const confirmSave = window.confirm(
      "Do you want to save the changes to this artwork? Saved changes will be pending and will have to be verified."
    );
    if (confirmSave) {
      // Implement logic to save changes here
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

  const isFormValid =
    formData.artworkTitle &&
    formData.artistName &&
    formData.artistName !== "No Option Selected" && // Exclude the placeholder option
    formData.artworkAbout &&
    formData.artworkImage &&
    formData.timelineCenter &&
    formData.timelineCenter !== "No Option Selected" && // Exclude the placeholder option
    (formData.timelineCenter !== "custom" || (formData.timelineCenter === "custom" && formData.customTimelineCenter && formData.customTimelineCenter.trim() !== ""));



  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isFormValid) {
      setIsSubmitted(true); // Set submission status to true
    } else {
      alert("Please fill in all required fields.");
    }
  };

  useEffect(() => {
    const fetchEraOptions = async () => {
      try {
        if (user) {
          const token = await getIdToken();
          console.log('aici: ' + token);
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
        setLoading(false); // Set loading to false regardless of success or error
      }
    };

    fetchEraOptions();
  }, [user]);

  useEffect(() => {
    if (user === undefined || user?.type === undefined) {
      router.push("/login"); // Redirect to login if user type is not determined
    }
  }, [user, router]);



  return (
    <>
      <Header />
      <div className={styles.page}>
        <Suspense fallback={<div>Loading search params...</div>}>
          <SearchParamsHandler setIsEditMode={setIsEditMode} />
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

              <LoadingOverlay isVisible={loading} />

              <div className={styles.formRow}>
                <div className={styles.leftColumn}>
                  <div className={styles.inputWrapperRequired}>
                    <p>Upload an artwork profile image</p>
                    <div className={styles.imageUploadWrapper}>
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
                            src={formData.artworkImage instanceof File ? URL.createObjectURL(formData.artworkImage) : ""}
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
                    <div className={styles.extraImagesRow}>
                      <div className={styles.imageUploadWrapper}>
                        <input
                          type="file"
                          id="additionalImage1"
                          name="additionalImage1"
                          accept="image/*"
                          className={styles.hiddenInput}
                          onChange={handleInputChange}
                          disabled={isEditMode && !isEditing}
                        />
                        <label
                          htmlFor="additionalImage1"
                          className={`${styles.imageUploadBox} ${styles.smallImageUploadBox}`}
                        >
                          {formData.additionalImage1 && formData.additionalImage1 instanceof File ? (
                            <img
                              src={URL.createObjectURL(formData.additionalImage1)}
                              alt="Additional Image 1"
                              className={styles.uploadedImage}
                            />
                          ) : (
                            <span className={styles.plusIcon}>+</span>
                          )}
                        </label>
                      </div>
                      <div className={styles.imageUploadWrapper}>
                        <input
                          type="file"
                          id="additionalImage2"
                          name="additionalImage2"
                          accept="image/*"
                          className={styles.hiddenInput}
                          onChange={handleInputChange}
                          disabled={isEditMode && !isEditing}
                        />
                        <label
                          htmlFor="additionalImage2"
                          className={`${styles.imageUploadBox} ${styles.smallImageUploadBox}`}
                        >
                          {formData.additionalImage2 && formData.additionalImage2 instanceof File ? (
                            <img
                              src={URL.createObjectURL(formData.additionalImage2)}
                              alt="Additional Image 2"
                              className={styles.uploadedImage}
                            />
                          ) : (
                            <span className={styles.plusIcon}>+</span>
                          )}
                        </label>
                      </div>
                      <div className={styles.imageUploadWrapper}>
                        <input
                          type="file"
                          id="additionalImage3"
                          name="additionalImage3"
                          accept="image/*"
                          className={styles.hiddenInput}
                          onChange={handleInputChange}
                          disabled={isEditMode && !isEditing}
                        />
                        <label
                          htmlFor="additionalImage3"
                          className={`${styles.imageUploadBox} ${styles.smallImageUploadBox}`}
                        >
                          {formData.additionalImage3 && formData.additionalImage3 instanceof File ? (
                            <img
                              src={URL.createObjectURL(formData.additionalImage3)}
                              alt="Additional Image 3"
                              className={styles.uploadedImage}
                            />
                          ) : (
                            <span className={styles.plusIcon}>+</span>
                          )}
                        </label>
                      </div>
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

"use client";

import React, { useEffect, useState, Suspense, useRef } from "react";
import styles from "./page.module.css";
import Header from "../../components/header/header";
import Footer from "@/components/footer/footer";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { useAlert } from "@/context/AlertContext";
import LoadingOverlay from "@/components/loadingOverlay/loadingOverlay";

function SearchParamsHandler({
  setIsEditMode,
  setIsPending,
  setArtistId, // Keep artistId setter
}: {
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPending: React.Dispatch<React.SetStateAction<boolean | null>>;
  setArtistId: React.Dispatch<React.SetStateAction<number | null>>; // Keep artistId
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const editMode = searchParams.get("edit") === "true";
    const artistId = searchParams.get("artistId")
      ? parseInt(searchParams.get("artistId")!, 10)
      : null;
    const pending = searchParams.get("pending") === "true";

    setIsEditMode(editMode);
    setArtistId(artistId);
    setIsPending(pending);
  }, [searchParams, setIsEditMode, setArtistId, setIsPending]);

  return null; // This component only handles state updates
}


export default function Artist() {
  const [formData, setFormData] = useState<{
    image: File | null;
    name: string;
    fullName: string;
    about: string;
    dateOfBirth: string;
    nationality: string;
    artMovement: string[]; // Changed from string to array
    artMovementTemp: string; // Temporary input field
    dateOfDeath: string;
    influencedBy: string[];
    influencedByTemp: string; // Temporary input field
    influencedOn: string[];
    influencedOnTemp: string; // Temporary input field
    artInstitution: string[];
    artInstitutionTemp: string; // Temporary input field
    friendsOrCoworkers: string[];
    friendsOrCoworkersTemp: string; // Temporary input field
    wikipediaLink: string;
    officialSiteLink: string;
  }>({
    image: null,
    name: "",
    fullName: "",
    about: "",
    dateOfBirth: "",
    nationality: "",
    artMovement: [],
    artMovementTemp: "",
    dateOfDeath: "",
    influencedBy: [],
    influencedByTemp: "",
    influencedOn: [],
    influencedOnTemp: "",
    artInstitution: [],
    artInstitutionTemp: "",
    friendsOrCoworkers: [],
    friendsOrCoworkersTemp: "",
    wikipediaLink: "",
    officialSiteLink: "",
  });

  const resetForm = () => {
    setFormData({
      image: null,
      name: "",
      fullName: "",
      about: "",
      dateOfBirth: "",
      nationality: "",
      artMovement: [],
      artMovementTemp: "", // Reset temporary input field
      dateOfDeath: "",
      influencedBy: [],
      influencedByTemp: "", // Reset temporary input field
      influencedOn: [],
      influencedOnTemp: "", // Reset temporary input field
      artInstitution: [],
      artInstitutionTemp: "", // Reset temporary input field
      friendsOrCoworkers: [],
      friendsOrCoworkersTemp: "", // Reset temporary input field
      wikipediaLink: "",
      officialSiteLink: "",
    });
    setIsSubmitted(false); // Reset the submission status
  };


  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, files } = e.target as HTMLInputElement & {
      files: FileList;
    };
    setFormData((prev) => ({
      ...prev,
      [name]: name === "image" ? files?.[0] : value,
    }));
  };

  const isFormValid =
    formData.image &&
    formData.name &&
    formData.fullName &&
    formData.about &&
    formData.dateOfBirth &&
    formData.nationality;

  const [isSubmitted, setIsSubmitted] = useState(false);

  const { showAlert, showConfirm } = useAlert();

  const router = useRouter();


  const [isEditMode, setIsEditMode] = useState(false);
  const [isPending, setIsPending] = useState<boolean | null>(null);
  const [artistId, setArtistId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false); // Track if currently editing in edit mode
  const { user, getIdToken, isLoadingUser } = useUser(); // Access setUser from the UserContext
  const [loadingFormData, setLoadingFormData] = useState(true);
  const [loadingApproval, setLoadingApproval] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const hasFetchedArtistDetails = useRef(false); // Prevent multiple API calls for artist details
  const hasFetchedArtworkStatus = useRef(false); // Prevent multiple API calls for artwork status


  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);
  const [artworkStatus, setArtworkStatus] = useState<"Rejected" | "Accepted" | "Pending" | null>(null);

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
      "Do you want to save the changes to this artist? Saved changes will be pending and will have to be verified."
    );

    if (confirmSave) {
      try {
        setLoadingSubmit(true); // Start loading state for submission

        let idToSubmit = null;

        if (user?.type === "artist" && user.artistId) {
          idToSubmit = user.artistId;
        } else if (artistId !== null) {
          idToSubmit = artistId;
        }

        if (idToSubmit !== null) {
          await submitArtistForApproval(idToSubmit);
        }
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
  };

  const handleDelete = async () => {
    const confirmDelete = await showConfirm(
      "Are you sure you want to delete this artist? This action cannot be undone."
    );
    if (confirmDelete) {
      // Implement logic to delete the artist here
      showAlert("Artist deleted!", "success");
    }
  };

  const submitArtistForApproval = async (
    artistId?: number // Optional parameter
  ): Promise<number | null> => {
    try {
      const token = await getIdToken(); // Get authentication token

      if (!token) {
        throw new Error("Failed to retrieve authentication token.");
      }

      if (!user?.email) {
        throw new Error("Failed to retrieve user's email.");
      }


      // Prepare API request for artist approval
      let apiUrl = `https://api.artvista.app/submit_artist_for_approval/?artist_portal_token=${encodeURIComponent(token)}&artist_name=${encodeURIComponent(formData.name)}&artist_full_name=${encodeURIComponent(formData.fullName)}&born_date=${encodeURIComponent(formData.dateOfBirth)}&nationality=${encodeURIComponent(formData.nationality)}&active_years=${1}&artist_bio_text=${encodeURIComponent(formData.about)}&user_email=${encodeURIComponent(user.email)}`
        + (formData.wikipediaLink ? `&wikipedia_link=${encodeURIComponent(formData.wikipediaLink)}` : "")
        + (formData.officialSiteLink ? `&official_website=${encodeURIComponent(formData.officialSiteLink)}` : "");

      if (artistId) {
        apiUrl += `&artist_id=${artistId}`; // Include artist_id if provided
      }


      const formDataToSend = new FormData();
      if (formData.image) {
        formDataToSend.append("profile_image", formData.image);
      }

      if (Array.isArray(formData.artMovement)) {

        formData.artMovement.forEach(item => {
          formDataToSend.append("art_movement", item);
        });
      }

      if (Array.isArray(formData.influencedBy)) {
        formData.influencedBy.forEach(item => {
          formDataToSend.append("influenced_by", item);
        });
      }

      if (Array.isArray(formData.influencedOn)) {
        formData.influencedOn.forEach(item => {
          formDataToSend.append("influenced_on", item);
        });
      }

      if (Array.isArray(formData.artInstitution)) {
        formData.artInstitution.forEach(item => {
          formDataToSend.append("art_institutions", item);
        });
      }

      if (Array.isArray(formData.friendsOrCoworkers)) {
        formData.friendsOrCoworkers.forEach(item => {
          formDataToSend.append("friends_co_workers", item);
        });
      }

      // Send API request
      const response = await fetch(apiUrl, {
        method: "POST",
        body: formDataToSend,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.detail || "Failed to submit artist.");
      }

      showAlert("Artist submitted successfully!", "success");
      return responseData.artist_id; // Return artist ID if available
    } catch (error) {
      console.error("Error submitting artist:", error);
      showAlert(`Error: ${(error as Error).message}`, "error");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormValid) {
      showAlert("Please fill in all required fields.", "warning");
      return;
    }

    try {
      setLoadingSubmit(true);
      await submitArtistForApproval();
      setLoadingSubmit(false);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error during submission:", error);
      showAlert("An error occurred while submitting the artist.", "error");
    }
  };



  const handleApprove = async () => {
    try {
      if (!artistId) {
        showAlert("Artist ID is missing. Please try again.", "error");
        return;
      }

      const confirmMessage = await showConfirm(
        "Are you sure you want to approve this artist? Enter a message below (not necessary):",
        true // Enables input field
      );

      if (confirmMessage === false) return; // User canceled

      const finalMessage = confirmMessage === "" ? "Artist Approved" : confirmMessage;


      setLoadingApproval(true); // Start loading state
      const token = await getIdToken();
      if (!token) throw new Error("Admin token not found.");

      const params = new URLSearchParams({
        admin_portal_token: token,
        artist_id: artistId.toString(),
        accept: "true",
      });

      const response = await fetch(
        `https://api.artvista.app/accept_or_reject_artist/?${params.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message_to_be_emailed: finalMessage, // Use default if empty
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to approve artist: ${response.statusText}`);
      }

      showAlert("Artist approved successfully.", "success");
      router.replace("/home"); // Redirect to /home
    } catch (error) {
      console.error("Error approving artist:", error);
      showAlert("An error occurred while approving the artist.", "error");
    } finally {
      setLoadingApproval(false); // Stop loading state
    }
  };

  const handleReject = async () => {
    try {
      if (!artistId) {
        showAlert("Artist ID is missing. Please try again.", "error");
        return;
      }

      const confirmMessage = await showConfirm(
        "Are you sure you want to reject this artist? Enter a reason below (necessary):",
        true // Enables input field
      );

      if (confirmMessage === false) return; // User canceled

      // Default to rejection message if input is empty
      const finalMessage =
        confirmMessage === "" ? "Unfortunately, your artist submission was not approved." : confirmMessage;

      setLoadingApproval(true); // Start loading state
      const token = await getIdToken();
      if (!token) throw new Error("Admin token not found.");

      const params = new URLSearchParams({
        admin_portal_token: token,
        artist_id: artistId.toString(),
        accept: "false",
      });

      const response = await fetch(
        `https://api.artvista.app/accept_or_reject_artist/?${params.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message_to_be_emailed: finalMessage, // Use default if empty
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to reject artist: ${response.statusText}`);
      }

      showAlert("Artist rejected successfully.", "success");
      router.replace("/home"); // Redirect to /home
    } catch (error) {
      console.error("Error rejecting artist:", error);
      showAlert("An error occurred while rejecting the artist.", "error");
    } finally {
      setLoadingApproval(false); // Stop loading state
    }
  };


  const validateDateFormat = (dateString: string, fieldName: string) => {

    if (!dateString.trim()) return true;

    const datePattern = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/; // dd-mm-yyyy

    if (!datePattern.test(dateString)) {
      showAlert(`Invalid date format. Please enter ${fieldName} as dd-mm-yyyy`, "error");

      if (fieldName === "dateOfBirth") {
        setFormData((prev) => ({ ...prev, dateOfBirth: "" }));
      } else if (fieldName === "dateOfDeath") {
        setFormData((prev) => ({ ...prev, dateOfDeath: "" }));
      }
    }
  };

  const handleArrayInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof typeof formData
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value, // Store temporary value
    }));
  };

  const handleRemoveItem = (field: keyof typeof formData, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index), // Remove item from array
    }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: keyof typeof formData
  ) => {
    if (e.key === "Enter" || e.key === "Done" || e.key === "Next") { // Capture mobile "Next" button
      e.preventDefault(); // Prevent form submission

      if (formData[`${field}Temp` as keyof typeof formData]) {
        setFormData((prev) => ({
          ...prev,
          [field]: [...(prev[field] as string[]), prev[`${field}Temp` as keyof typeof formData] as string],
          [`${field}Temp`]: "", // Clear input
        }));
      }
    }
  };

  const handleAddItem = (field: keyof typeof formData) => {
    if (formData[`${field}Temp` as keyof typeof formData]) {
      setFormData((prev) => ({
        ...prev,
        [field]: [
          ...(prev[field] as string[]),
          prev[`${field}Temp` as keyof typeof formData] as string
        ],
        [`${field}Temp`]: "", // Clear input after adding
      }));
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




  /**
   * Fetch artist details for ARTISTS (Runs only once)
   */
  useEffect(() => {
    const fetchArtistDetailsForArtist = async () => {
      try {
        if (user?.type !== "artist" || hasFetchedArtistDetails.current) return;

        const token = await getIdToken();
        const endpoint = `https://api.artvista.app/get_artist_details_to_portal/?artist_portal_token=${token}&artist_id=${user.artistId}`;

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const artistDetails = await response.json();
        const { text_information } = artistDetails;
        console.log(text_information)

        const profileImageFile = text_information?.spaces_dir
          ? await fetchImageWithProxy(text_information.spaces_dir, "profile_image.jpg")
          : null;

        const parseStringToArray = (str: string | null): string[] => {
          if (!str) return [];
          str = str.replace(/^{|}$/g, "");
          const matches = str.match(/"[^"]+"|[^,]+/g) || [];
          return matches.map((item) => item.replace(/^"|"$/g, "").trim());
        };

        const formatDate = (dateString: string | null): string => {
          if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString || "";
          const [year, month, day] = dateString.split("-");
          return `${day}-${month}-${year}`;
        };

        const fetchedData = {
          image: profileImageFile,
          name: text_information.name || "",
          fullName: text_information.full_name || "",
          about: text_information.about || "",
          dateOfBirth: formatDate(text_information.born),
          nationality: text_information.nationality || "",
          artMovement: parseStringToArray(text_information.art_movement),
          artMovementTemp: "",
          dateOfDeath: formatDate(text_information.died),
          influencedBy: parseStringToArray(text_information.influenced_by),
          influencedByTemp: "",
          influencedOn: parseStringToArray(text_information.influenced_on),
          influencedOnTemp: "",
          artInstitution: parseStringToArray(text_information.art_institution),
          artInstitutionTemp: "",
          friendsOrCoworkers: parseStringToArray(text_information.friends_co_workers),
          friendsOrCoworkersTemp: "",
          wikipediaLink: text_information.wikipedia_link || "",
          officialSiteLink: text_information.official_site_link || "",
        };

        setFormData(fetchedData);
        setInitialFormData(fetchedData);

        hasFetchedArtistDetails.current = true; // Prevent multiple calls
      } catch (error) {
        console.error("Error fetching artist details:", error);
      } finally {
        setLoadingFormData(false);
      }
    };

    fetchArtistDetailsForArtist();
  }, [user]); // Runs only when user object changes

  /**
   * Fetch artwork status for ARTISTS (Runs only once)
   */
  useEffect(() => {
    const fetchArtworkStatusForArtist = async () => {
      try {
        if (user?.type !== "artist" || hasFetchedArtworkStatus.current) return;

        const token = await getIdToken();
        const endpoint = `https://api.artvista.app/get_artist_account_status/?artist_portal_token=${token}&artist_id=${user.artistId}`;

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`Failed to fetch artwork status: ${response.statusText}`);
        }

        const statusData = await response.json();
        if (statusData.account_status) {
          setArtworkStatus(
            statusData.account_status === "pending"
              ? "Pending"
              : statusData.account_status === "approved"
                ? "Accepted"
                : "Rejected"
          );
        }

        hasFetchedArtworkStatus.current = true; // Prevent multiple calls
      } catch (error) {
        console.error("Error fetching artwork status:", error);
      }
    };

    fetchArtworkStatusForArtist();
  }, [user]); // Runs only when user object changes

  /**
   * Fetch artist details for ADMINS (Runs when artistId or isPending changes)
   */
  useEffect(() => {
    const fetchArtistDetailsForAdmin = async () => {
      try {
        if (user?.type !== "admin" || artistId === null || isPending === null) return;

        const token = await getIdToken();
        const endpoint = `https://api.artvista.app/get_artist_details_to_admin_portal/?admin_portal_token=${token}&artist_id=${artistId}&is_pending=${isPending}`;

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const artistDetails = await response.json();
        const { text_information } = artistDetails;

        console.log(text_information)

        const profileImageFile = text_information?.spaces_dir
          ? await fetchImageWithProxy(text_information.spaces_dir, "profile_image.jpg")
          : null;

        const parseStringToArray = (str: string | null): string[] => {
          if (!str) return [];
          str = str.replace(/^{|}$/g, "");
          const matches = str.match(/"[^"]+"|[^,]+/g) || [];
          return matches.map((item) => item.replace(/^"|"$/g, "").trim());
        };

        const formatDate = (dateString: string | null): string => {
          if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString || "";
          const [year, month, day] = dateString.split("-");
          return `${day}-${month}-${year}`;
        };

        const fetchedData = {
          image: profileImageFile,
          name: text_information.name || "",
          fullName: text_information.full_name || "",
          about: text_information.about || "",
          dateOfBirth: formatDate(text_information.born),
          nationality: text_information.nationality || "",
          artMovement: parseStringToArray(text_information.art_movement),
          artMovementTemp: "",
          dateOfDeath: formatDate(text_information.died),
          influencedBy: parseStringToArray(text_information.influenced_by),
          influencedByTemp: "",
          influencedOn: parseStringToArray(text_information.influenced_on),
          influencedOnTemp: "",
          artInstitution: parseStringToArray(text_information.art_institution),
          artInstitutionTemp: "",
          friendsOrCoworkers: parseStringToArray(text_information.friends_co_workers),
          friendsOrCoworkersTemp: "",
          wikipediaLink: text_information.wikipedia_link || "",
          officialSiteLink: text_information.official_site_link || "",
        };

        setFormData(fetchedData);
        setInitialFormData(fetchedData);

        // Set artwork status based on pending_situation
        if (text_information.pending_situation !== undefined) {
          const statusMap: { 0: "Rejected"; 1: "Accepted"; 2: "Pending" } = {
            0: "Rejected",
            1: "Accepted",
            2: "Pending",
          };
          setArtworkStatus(statusMap[text_information.pending_situation as 0 | 1 | 2] || null);
        }
      } catch (error) {
        console.error("Error fetching artist details:", error);
      } finally {
        setLoadingFormData(false);
      }
    };

    fetchArtistDetailsForAdmin();
  }, [user, artistId, isPending]); // Runs only when user is admin and values change




  return (
    <>
      <Header />
      <div className={styles.page}>
        <Suspense fallback={<div>Loading search params...</div>}>
          <SearchParamsHandler
            setIsEditMode={setIsEditMode}
            setIsPending={setIsPending}
            setArtistId={setArtistId}
          />
        </Suspense>
        {isSubmitted ? (
          <div className={styles.thankYouMessage}>
            <h1>Thank You for Submitting a New Artist!</h1>
            <p>
              Your submission has been received. This artist will be pending until your submission is verified and accepted.
            </p>
            <button className={styles.resetButton} onClick={resetForm}>
              Add Another Artist
            </button>
          </div>
        ) : (
          <>

            <div className={styles.header}>
              <h1 className={styles.headerTitle}>
                {isEditMode ? "Edit Artist" : "Add a New Artist"}
              </h1>

              {isEditMode && !loadingFormData && artworkStatus && (
                <>
                  <span className={styles.divider}></span>
                  <p
                    className={`${styles.headerHelp} ${artworkStatus === "Pending"
                      ? styles.pendingStatus
                      : artworkStatus === "Accepted"
                        ? styles.publishedStatus
                        : styles.rejectedStatus
                      }`}
                  >
                    {artworkStatus === "Pending"
                      ? "This artist is pending approval."
                      : artworkStatus === "Accepted"
                        ? "This artist has been accepted and published."
                        : "This artist has been rejected."}
                  </p>
                </>
              )}



              {!isEditMode && (
                <>
                  <span className={styles.divider}></span>
                  <p className={styles.headerHelp}>
                    Need help? Check our guide on how to add artists{" "}
                    <a href="/guide" className={`${styles.link} ${styles.gradientText}`}>
                      here!
                    </a>
                  </p>
                </>
              )}
            </div>

            {isEditMode && user?.type === "artist" && (
              <p className={styles.editNotice}>
                Any submitted changes need to be approved before your profile updates.
              </p>
            )}

            <form
              id="artist-register-form"
              className={`${styles.form} ${styles.registeringForm}`}
              onSubmit={handleSubmit}
            >

              <LoadingOverlay isVisible={loadingFormData || isLoadingUser || loadingApproval || loadingSubmit} />

              <div className={styles.formRow}>
                <div className={styles.leftColumn}>
                  <div className={styles.inputWrapperRequired}>
                    <p>Upload an artist profile image</p>
                    <div
                      className={`${styles.imageUploadWrapper} ${isEditMode && !isEditing ? styles.overlay : ""
                        }`}
                    >
                      <input
                        type="file"
                        id="artistImageInput"
                        name="image"
                        accept="image/jpeg, image/png, image/jpg" // Restrict to allowed formats
                        className={styles.hiddenInput}
                        onChange={handleInputChange}
                        disabled={isEditMode && !isEditing}
                      />
                      <label htmlFor="artistImageInput" className={styles.imageUploadBox}>
                        {formData.image ? (
                          <img
                            src={URL.createObjectURL(formData.image)}
                            alt="Artist Profile"
                            className={styles.uploadedImage}
                          />
                        ) : (
                          <span className={styles.plusIcon}>+</span>
                        )}
                      </label>
                    </div>
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>Name (First + Last, e.g., John Doe)</p>
                    <input
                      type="text"
                      name="name"
                      className={styles.input}
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>Full Name (All names, e.g., John Michael Doe)</p>
                    <input
                      type="text"
                      name="fullName"
                      className={styles.input}
                      value={formData.fullName}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>About</p>
                    <textarea
                      name="about"
                      className={`${styles.input} ${styles.textarea}`}
                      value={formData.about}
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
                    <p>Date of Birth</p>
                    <input
                      type="text"
                      name="dateOfBirth"
                      placeholder="dd-mm-yyyy"
                      className={styles.input}
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      onBlur={(e) => validateDateFormat(e.target.value, "dateOfBirth")}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                </div>
                <div className={styles.rightColumn}>
                  <div className={styles.inputWrapperRequired}>
                    <p>Nationality</p>
                    <input
                      type="text"
                      name="nationality"
                      className={styles.input}
                      value={formData.nationality}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Date Of Death</p>
                    <input
                      type="text"
                      name="dateOfDeath"
                      placeholder="dd-mm-yyyy"
                      className={styles.input}
                      value={formData.dateOfDeath}
                      onChange={handleInputChange}
                      onBlur={(e) => validateDateFormat(e.target.value, "dateOfDeath")}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Art Movement (multiple)</p>
                    <div className={`${styles.inputWithBubbles} ${isEditMode && !isEditing ? styles.overlay : ""
                      }`}
                    >
                      {formData.artMovement.map((item, index) => (
                        <span key={index} className={styles.bubble}>
                          <span className={styles.bubbleText}>{item}</span>
                          {isEditMode && isEditing && (
                            <button
                              type="button"
                              className={styles.removeBubble}
                              onClick={() => handleRemoveItem("artMovement", index)}
                            >
                              ❌
                            </button>
                          )}
                        </span>
                      ))}
                      {isEditing && (
                        <input
                          type="text"
                          name="artMovementTemp"
                          placeholder="Press Enter for each..."
                          className={styles.input}
                          value={formData.artMovementTemp || ""}
                          onChange={(e) => handleArrayInputChange(e, "artMovementTemp")}
                          onKeyDown={(e) => handleKeyDown(e, "artMovement")}
                          style={{ display: "block", width: "100%" }} // Ensure full width when typing
                          disabled={isEditMode && !isEditing}
                        />
                      )}
                      {formData.artMovementTemp && (
                        <button
                          type="button"
                          className={styles.addBubbleButton}
                          onClick={() => handleAddItem("artMovement")}
                        >
                          +
                        </button>
                      )}

                    </div>
                  </div>

                  <div className={styles.inputWrapper}>
                    <p>Influenced By (multiple)</p>
                    <div className={`${styles.inputWithBubbles} ${isEditMode && !isEditing ? styles.overlay : ""
                      }`}
                    >
                      {formData.influencedBy.map((item, index) => (
                        <span key={index} className={styles.bubble}>
                          <span className={styles.bubbleText}>{item}</span>
                          {isEditMode && isEditing && (
                            <button
                              type="button"
                              className={styles.removeBubble}
                              onClick={() => handleRemoveItem("influencedBy", index)}
                            >
                              ❌
                            </button>
                          )}
                        </span>
                      ))}

                      {isEditing && (
                        <input
                          type="text"
                          name="influencedByTemp"
                          placeholder="Press Enter for each..."
                          className={styles.input}
                          value={formData.influencedByTemp || ""}
                          onChange={(e) => handleArrayInputChange(e, "influencedByTemp")}
                          onKeyDown={(e) => handleKeyDown(e, "influencedBy")}
                          style={{ display: "block", width: "100%" }} // Ensure full width when typing
                          disabled={isEditMode && !isEditing}
                        />
                      )}
                      {formData.influencedByTemp && (
                        <button
                          type="button"
                          className={styles.addBubbleButton}
                          onClick={() => handleAddItem("influencedBy")}
                        >
                          +
                        </button>
                      )}

                    </div>
                  </div>

                  <div className={styles.inputWrapper}>
                    <p>Had An Impact On (multiple)</p>
                    <div className={`${styles.inputWithBubbles} ${isEditMode && !isEditing ? styles.overlay : ""
                      }`}
                    >
                      {formData.influencedOn.map((item, index) => (
                        <span key={index} className={styles.bubble}>
                          <span className={styles.bubbleText}>{item}</span>
                          {isEditMode && isEditing && (
                            <button
                              type="button"
                              className={styles.removeBubble}
                              onClick={() => handleRemoveItem("influencedOn", index)}
                            >
                              ❌
                            </button>
                          )}
                        </span>
                      ))}

                      {isEditing && (
                        <input
                          type="text"
                          name="influencedOnTemp"
                          placeholder="Press Enter for each..."
                          className={styles.input}
                          value={formData.influencedOnTemp || ""}
                          onChange={(e) => handleArrayInputChange(e, "influencedOnTemp")}
                          onKeyDown={(e) => handleKeyDown(e, "influencedOn")}
                          style={{ display: "block", width: "100%" }} // Ensure full width when typing
                          disabled={isEditMode && !isEditing}
                        />
                      )}
                      {formData.influencedOnTemp && (
                        <button
                          type="button"
                          className={styles.addBubbleButton}
                          onClick={() => handleAddItem("influencedOn")}
                        >
                          +
                        </button>
                      )}

                    </div>
                  </div>

                  <div className={styles.inputWrapper}>
                    <p>Art Institution Attended by the Individual (multiple)</p>
                    <div className={`${styles.inputWithBubbles} ${isEditMode && !isEditing ? styles.overlay : ""
                      }`}
                    >
                      {formData.artInstitution.map((item, index) => (
                        <span key={index} className={styles.bubble}>
                          <span className={styles.bubbleText}>{item}</span>
                          {isEditMode && isEditing && (
                            <button
                              type="button"
                              className={styles.removeBubble}
                              onClick={() => handleRemoveItem("artInstitution", index)}
                            >
                              ❌
                            </button>
                          )}
                        </span>
                      ))}

                      {isEditing && (
                        <input
                          type="text"
                          name="artInstitutionTemp"
                          placeholder="Press Enter for each..."
                          className={styles.input}
                          value={formData.artInstitutionTemp || ""}
                          onChange={(e) => handleArrayInputChange(e, "artInstitutionTemp")}
                          onKeyDown={(e) => handleKeyDown(e, "artInstitution")}
                          style={{ display: "block", width: "100%" }} // Ensure full width when typing
                          disabled={isEditMode && !isEditing}
                        />
                      )}
                      {formData.artInstitutionTemp && (
                        <button
                          type="button"
                          className={styles.addBubbleButton}
                          onClick={() => handleAddItem("artInstitution")}
                        >
                          +
                        </button>
                      )}

                    </div>
                  </div>

                  <div className={styles.inputWrapper}>
                    <p>Friends/ Co-workers (multiple)</p>
                    <div className={`${styles.inputWithBubbles} ${isEditMode && !isEditing ? styles.overlay : ""
                      }`}
                    >
                      {formData.friendsOrCoworkers.map((item, index) => (
                        <span key={index} className={styles.bubble}>
                          <span className={styles.bubbleText}>{item}</span>
                          {isEditMode && isEditing && (
                            <button
                              type="button"
                              className={styles.removeBubble}
                              onClick={() => handleRemoveItem("friendsOrCoworkers", index)}
                            >
                              ❌
                            </button>
                          )}
                        </span>
                      ))}

                      {isEditing && (
                        <input
                          type="text"
                          name="friendsOrCoworkersTemp"
                          placeholder="Press Enter for each..."
                          className={styles.input}
                          value={formData.friendsOrCoworkersTemp || ""}
                          onChange={(e) => handleArrayInputChange(e, "friendsOrCoworkersTemp")}
                          onKeyDown={(e) => handleKeyDown(e, "friendsOrCoworkers")}
                          style={{ display: "block", width: "100%" }} // Ensure full width when typing
                          disabled={isEditMode && !isEditing}
                        />
                      )}
                      {formData.friendsOrCoworkersTemp && (
                        <button
                          type="button"
                          className={styles.addBubbleButton}
                          onClick={() => handleAddItem("friendsOrCoworkers")}
                        >
                          +
                        </button>
                      )}

                    </div>
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Wikipedia Link</p>
                    <input
                      type="url"
                      name="wikipediaLink"
                      placeholder="Example: https://artvista.app/"
                      className={styles.input}
                      value={formData.wikipediaLink}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Official Site Link</p>
                    <input
                      type="url"
                      name="officialSiteLink"
                      placeholder="Example: https://artvista.app/"
                      className={styles.input}
                      value={formData.officialSiteLink}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
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
                        Edit Artist
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approveButton}`}
                        onClick={handleApprove} // You will need to implement this function
                      >
                        Approve Artist
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.rejectButton}`}
                        onClick={handleReject} // You will need to implement this function
                      >
                        Reject Artist
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.button}
                        onClick={handleEditClick}
                      >
                        Edit Artist
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.deleteButton}`}
                        onClick={handleDelete}
                      >
                        Delete Artist
                      </button>
                    </>
                  )
                ) : (
                  <button type="submit" form="artist-register-form" className={styles.button}>
                    Submit Artist For Approval
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}

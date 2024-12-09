"use client";

import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import Header from "../../components/header/header";
import Footer from "@/components/footer/footer";
import { useRouter } from "next/router";
import { useSearchParams } from "next/navigation";

export default function Artist() {
  const [formData, setFormData] = useState<{
    image: File | null;
    name: string;
    fullName: string;
    about: string;
    dateOfBirth: string;
    birthYear: string;
    nationality: string;
    artMovement: string;
    dateOfDeath: string;
    deathYear: string;
    influencedBy: string;
    influencedOn: string;
    artInstitution: string;
    friendsOrCoworkers: string;
    wikipediaLink: string;
    officialSiteLink: string;
  }>({
    image: null,
    name: "",
    fullName: "",
    about: "",
    dateOfBirth: "",
    birthYear: "",
    nationality: "",
    artMovement: "",
    dateOfDeath: "",
    deathYear: "",
    influencedBy: "",
    influencedOn: "",
    artInstitution: "",
    friendsOrCoworkers: "",
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
      birthYear: "",
      nationality: "",
      artMovement: "",
      dateOfDeath: "",
      deathYear: "",
      influencedBy: "",
      influencedOn: "",
      artInstitution: "",
      friendsOrCoworkers: "",
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
    formData.birthYear &&
    formData.nationality &&
    formData.artMovement;

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form Submitted");
    if (isFormValid) {
      setIsSubmitted(true); // Set submission status to true
      console.log("Form is valid, submission successful.");
    } else {
      alert("Please fill in all required fields.");
      console.log("Form is not valid, submission failed.");
    }
  };

  const searchParams = useSearchParams(); // Safer way to access query params
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Track if currently editing in edit mode
  const [artistStatus, setArtistStatus] = useState<"pending" | "published" | null>(null);

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
      "Do you want to save the changes to this artist? Saved changes will be pending and will have to be verified."
    );
    if (confirmSave) {
      // Implement logic to save changes here
      alert("Changes saved successfully!");
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this artist? This action cannot be undone."
    );
    if (confirmDelete) {
      // Implement logic to delete the artist here
      alert("Artist deleted!");
    }
  };

  useEffect(() => {
    const editMode = searchParams.get("edit") === "true";
    setIsEditMode(editMode);
  }, [searchParams]);


  return (
    <>
      <Header />
      <div className={styles.page}>
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
              {isEditMode && (
                <>
                  <span className={styles.divider}></span>
                  <p
                    className={`${styles.headerHelp} ${artistStatus === "pending" ? styles.pendingStatus : styles.publishedStatus
                      }`}
                  >
                    {artistStatus === "pending"
                      ? "There are pending changes to the artist"
                      : "This artist has been published"}
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
            <form
              id="artist-register-form"
              className={`${styles.form} ${styles.registeringForm}`}
              onSubmit={handleSubmit}
            >
              <div className={styles.formRow}>
                <div className={styles.leftColumn}>
                  <div className={styles.inputWrapperRequired}>
                    <p>Upload an artist profile image</p>
                    <div className={styles.imageUploadWrapper}>
                      <input
                        type="file"
                        id="artistImageInput"
                        name="image"
                        accept="image/*"
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
                    <p>Name (short version or nickname)</p>
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
                    <p>Full Name (can be the same as name)</p>
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
                      placeholder="Example: January 1, 1990"
                      className={styles.input}
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>Year of Birth</p>
                    <input
                      type="number"
                      name="birthYear"
                      className={styles.input}
                      value={formData.birthYear}
                      onChange={handleInputChange}
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
                  <div className={styles.inputWrapperRequired}>
                    <p>Art Movement</p>
                    <input
                      type="text"
                      name="artMovement"
                      placeholder="Example: Realism"
                      className={styles.input}
                      value={formData.artMovement}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>

                  <div className={styles.inputWrapper}>
                    <p>Date Of Death</p>
                    <input
                      type="text"
                      name="dateOfDeath"
                      placeholder="Example: January 1, 1990"
                      className={styles.input}
                      value={formData.dateOfDeath}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Year Of Death</p>
                    <input
                      type="number"
                      name="deathYear"
                      className={styles.input}
                      value={formData.deathYear}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Influenced By (multiple possible)</p>
                    <input
                      type="text"
                      name="influencedBy"
                      placeholder="Example: Leonardo DaVinci, Michael Jackson"
                      className={styles.input}
                      value={formData.influencedBy}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Had An Impact On (multiple possible)</p>
                    <input
                      type="text"
                      name="influencedOn"
                      placeholder="Example: Leonardo DaVinci, Michael Jackson"
                      className={styles.input}
                      value={formData.influencedOn}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    Art Institution Attended by the Individual
                    <input
                      type="text"
                      name="artInstitution"
                      className={styles.input}
                      value={formData.artInstitution}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Friends/ Co-workers (multiple possible)</p>
                    <input
                      type="text"
                      name="friendsOrCoworkers"
                      placeholder="Example: Leonardo DaVinci, Michael Jackson"
                      className={styles.input}
                      value={formData.friendsOrCoworkers}
                      onChange={handleInputChange}
                      disabled={isEditMode && !isEditing}
                    />
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

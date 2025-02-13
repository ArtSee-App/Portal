"use client";

import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import Header from "../../components/header/header";
import Footer from "@/components/footer/footer";
import router from "next/router";
import { useUser } from "@/context/UserContext";
import { useAlert } from "@/context/AlertContext";

export default function Museum() {
  const [formData, setFormData] = useState<{
    image: File | null;
    name: string;
    latitude: string;
    longitude: string;
    about: string;
    city: string;
    province: string;
    country: string;
    type: string;
    visitorsPerYear: string;
    websiteLink: string;
    wikipediaLink: string;
  }>({
    image: null,
    name: "",
    latitude: "",
    longitude: "",
    about: "",
    city: "",
    province: "",
    country: "",
    type: "",
    visitorsPerYear: "",
    websiteLink: "",
    wikipediaLink: "",
  });

  const resetForm = () => {
    setFormData({
      image: null,
      name: "",
      latitude: "",
      longitude: "",
      about: "",
      city: "",
      province: "",
      country: "",
      type: "",
      visitorsPerYear: "",
      websiteLink: "",
      wikipediaLink: "",
    });
    setIsSubmitted(false);
  };


  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Track if currently editing in edit mode
  const [museumStatus, setMuseumStatus] = useState<"pending" | "published" | null>(null);
  const { user, isLoadingUser } = useUser();

  const { showAlert, showConfirm } = useAlert();

  const handleEditClick = () => {
    setIsEditing(true); // Enable editing
  };

  const handleCancelEdit = async () => {
    const confirmCancel = await showConfirm(
      "Are you sure you want to cancel changes? Any unsaved changes will be lost."
    );
    if (confirmCancel) {
      setIsEditing(false); // Cancel editing
    }
  };

  const handleSaveChanges = async () => {
    const confirmSave = await showConfirm(
      "Do you want to save the changes to this museum? Saved changes will be pending and will have to be verified."
    );
    if (confirmSave) {
      // Implement logic to save changes here
      showAlert("Changes saved successfully!", "success");
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = await showConfirm(
      "Are you sure you want to delete this museum? This action cannot be undone."
    );
    if (confirmDelete) {
      // Implement logic to delete the museum here
      showAlert("Museum deleted!", "success");

    }
  };



  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, files } = e.target as HTMLInputElement & { files: FileList };
    setFormData((prev) => ({
      ...prev,
      [name]: name === "image" ? files?.[0] : value,
    }));
  };

  const isFormValid =
    formData.image &&
    formData.name &&
    formData.latitude &&
    formData.longitude &&
    formData.about &&
    formData.city &&
    formData.province &&
    formData.country &&
    formData.type;



  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isFormValid) {
      setIsSubmitted(true); // Set submission status to true
    } else {
      showAlert("Please fill in all required fields.", "error");
    }
  };




  return (
    <>
      <Header />
      <div className={styles.page}>
        {isSubmitted ? (
          <div className={styles.thankYouMessage}>
            <h1>Thank You for Submitting a New Museum!</h1>
            <p>
              Your submission has been received. This museum will be pending until your submission is verified and accepted.
            </p>
            <button className={styles.resetButton} onClick={resetForm}>
              Add Another Museum
            </button>
          </div>
        ) : (
          <>

            <div className={styles.header}>
              <h1 className={styles.headerTitle}>
                Edit Museum
              </h1>
              <>
                <span className={styles.divider}></span>
                <p
                  className={`${styles.headerHelp} ${museumStatus === "pending" ? styles.pendingStatus : styles.publishedStatus
                    }`}
                >
                  {museumStatus === "pending"
                    ? "There are pending changes to the museum"
                    : "This museum has been published"}
                </p>
              </>
            </div>
            <form
              id="museum-register-form"
              className={`${styles.form} ${styles.registeringForm}`}
              onSubmit={handleSubmit}
            >
              <div className={styles.formRow}>
                <div className={styles.leftColumn}>
                  <div className={styles.inputWrapperRequired}>
                    <p>Upload a museum profile image</p>
                    <div className={styles.imageUploadWrapper}>
                      <input
                        type="file"
                        id="museumImageInput"
                        name="image"
                        accept="image/*"
                        className={styles.hiddenInput}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                      <label htmlFor="museumImageInput" className={styles.imageUploadBox}>
                        {formData.image ? (
                          <img
                            src={URL.createObjectURL(formData.image)}
                            alt="Museum Profile"
                            className={styles.uploadedImage}
                          />
                        ) : (
                          <span className={styles.plusIcon}>+</span>
                        )}
                      </label>
                    </div>
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>Museum's Name</p>
                    <input
                      type="text"
                      name="name"
                      placeholder="Example: DAF Museum"
                      className={styles.input}
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>Latitude</p>
                    <input
                      type="number"
                      name="latitude"
                      placeholder="Example: 40.7128"
                      className={styles.input}
                      value={formData.latitude}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>Longitude</p>
                    <input
                      type="number"
                      name="longitude"
                      placeholder="Example: -74.0060"
                      className={styles.input}
                      value={formData.longitude}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className={styles.rightColumn}>
                  <div className={styles.inputWrapperRequired}>
                    <p>About</p>
                    <textarea
                      name="about"
                      className={`${styles.input} ${styles.textarea}`}
                      value={formData.about}
                      onChange={(e) => {
                        handleInputChange(e);
                        e.target.style.height = "auto"; // Reset height to auto
                        e.target.style.height = `${e.target.scrollHeight}px`; // Adjust height based on scroll height
                      }}
                      rows={1} // Initial height of 1 row
                      disabled={!isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>City</p>
                    <input
                      type="text"
                      name="city"
                      className={styles.input}
                      value={formData.city}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>Province</p>
                    <input
                      type="text"
                      name="province"
                      className={styles.input}
                      value={formData.province}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>Country</p>
                    <input
                      type="text"
                      name="country"
                      className={styles.input}
                      value={formData.country}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapperRequired}>
                    <p>Type</p>
                    <input
                      type="text"
                      name="type"
                      placeholder="Example: Museum"
                      className={styles.input}
                      value={formData.type}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Number Of Visitors Per Year</p>
                    <input
                      type="number"
                      name="visitorsPerYear"
                      className={styles.input}
                      value={formData.visitorsPerYear}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className={styles.inputWrapper}>
                    <p>Website Link</p>
                    <input
                      type="url"
                      name="websiteLink"
                      placeholder="Example: https://artvista.app/"
                      className={styles.input}
                      value={formData.websiteLink}
                      onChange={handleInputChange}
                      disabled={!isEditing}
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
                      disabled={!isEditing}
                    />
                  </div>
                </div>

              </div>

              <div className={`${styles.buttonRow} ${styles.registerButtonWrapper}`}>
                {isEditing ? (
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
                      Edit Museum
                    </button>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.deleteButton}`}
                      onClick={handleDelete}
                    >
                      Delete Museum
                    </button>
                  </>

                )}
              </div>
            </form>
          </>
        )}

      </div >
      <Footer />
    </>
  );
}

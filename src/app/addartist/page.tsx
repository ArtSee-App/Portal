"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import Header from "../../components/header/header";

export default function AddArtist() {
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isFormValid) {
      alert("Artist registered successfully!");
    } else {
      alert("Please fill in all required fields.");
    }
  };

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Add a New Artist</h1>
          <span className={styles.divider}></span>
          <p className={styles.headerHelp}>
            Need help? Check our guide on how to add artists{" "}
            <a href="/guide" className={`${styles.link} ${styles.gradientText}`}>
              here!
            </a>
          </p>
        </div>
        <form
          id="artist-register-form"
          className={`${styles.form} ${styles.registeringForm}`}
          onSubmit={handleSubmit}
        >
          <div className={styles.formRow}>
            <div className={styles.leftColumn}>
              <div className={styles.inputWrapper}>
                <p>Required: Upload an artist profile image</p>
                <div className={styles.imageUploadWrapper}>
                  <input
                    type="file"
                    id="artistImageInput"
                    name="image"
                    accept="image/*"
                    className={styles.hiddenInput}
                    onChange={handleInputChange}
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
              <div className={styles.inputWrapper}>
                <p>Required</p>
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  className={styles.input}
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <p>Required</p>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name"
                  className={styles.input}
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <p>Required</p>
                <textarea
                  name="about"
                  placeholder="About"
                  className={`${styles.input} ${styles.textarea}`}
                  value={formData.about}
                  onChange={(e) => {
                    handleInputChange(e);
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  rows={1}
                />
              </div>
              <div className={styles.inputWrapper}>
                <p>Required</p>
                <input
                  type="text"
                  name="dateOfBirth"
                  placeholder="Date of Birth"
                  className={styles.input}
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                />
              </div>

            </div>
            <div className={styles.rightColumn}>
              <div className={styles.inputWrapper}>
                <p>Required</p>
                <input
                  type="number"
                  name="birthYear"
                  placeholder="Year of Birth"
                  className={styles.input}
                  value={formData.birthYear}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <p>Required</p>
                <input
                  type="text"
                  name="nationality"
                  placeholder="Nationality"
                  className={styles.input}
                  value={formData.nationality}
                  onChange={handleInputChange}
                />
              </div>

              <div className={styles.inputWrapper}>
                <p>Required</p>
                <input
                  type="text"
                  name="artMovement"
                  placeholder="Art Movement"
                  className={styles.input}
                  value={formData.artMovement}
                  onChange={handleInputChange}
                />
              </div>

              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  name="dateOfDeath"
                  placeholder="Date Of Death"
                  className={styles.input}
                  value={formData.dateOfDeath}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="number"
                  name="deathYear"
                  placeholder="Year Of Death"
                  className={styles.input}
                  value={formData.deathYear}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  name="influencedBy"
                  placeholder="Influenced By"
                  className={styles.input}
                  value={formData.influencedBy}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  name="influencedOn"
                  placeholder="Influenced On"
                  className={styles.input}
                  value={formData.influencedOn}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  name="artInstitution"
                  placeholder="Art Institution"
                  className={styles.input}
                  value={formData.artInstitution}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  name="friendsOrCoworkers"
                  placeholder="Friends/Co-workers"
                  className={styles.input}
                  value={formData.friendsOrCoworkers}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="url"
                  name="wikipediaLink"
                  placeholder="Wikipedia Link"
                  className={styles.input}
                  value={formData.wikipediaLink}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="url"
                  name="officialSiteLink"
                  placeholder="Official Site Link"
                  className={styles.input}
                  value={formData.officialSiteLink}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
          <div className={styles.registerButtonWrapper}>
            <button type="submit" form="artist-register-form" className={styles.button}>
              Submit Artist For Approval
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

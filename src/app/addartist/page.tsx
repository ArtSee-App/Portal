"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import Header from "../../components/header/header";
import Footer from "@/components/footer/footer";

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
                />
              </div>

            </div>
            <div className={styles.rightColumn}>
              <div className={styles.inputWrapperRequired}>
                <p>Year of Birth</p>
                <input
                  type="number"
                  name="birthYear"
                  className={styles.input}
                  value={formData.birthYear}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapperRequired}>
                <p>Nationality</p>
                <input
                  type="text"
                  name="nationality"
                  className={styles.input}
                  value={formData.nationality}
                  onChange={handleInputChange}
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
      <Footer />
    </>
  );
}

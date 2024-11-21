"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import Header from "../../components/header/header";

export default function AddArtwork() {
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
  });

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
    formData.artistName !== "Select An Existing Artist" && // Exclude the placeholder option
    formData.artworkAbout &&
    formData.artworkImage &&
    formData.timelineCenter &&
    formData.timelineCenter !== "Select Era of Origin" && // Exclude the placeholder option
    (formData.timelineCenter !== "custom" || (formData.timelineCenter === "custom" && formData.customTimelineCenter && formData.customTimelineCenter.trim() !== ""));



  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isFormValid) {
      alert("Artwork registered successfully!");
    } else {
      alert("Please fill in all required fields.");
    }
  };

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Add a New Artwork</h1>
          <span className={styles.divider}></span>
          <p className={styles.headerHelp}>
            Need help? Check our guide on how to add artworks{" "}
            <a href="/guide" className={`${styles.link} ${styles.gradientText}`}>
              here!
            </a>
          </p>
        </div>
        <form
          id="artwork-register-form"
          className={`${styles.form} ${styles.registeringForm}`}
          onSubmit={handleSubmit}
        >
          <div className={styles.formRow}>
            <div className={styles.leftColumn}>
              <div className={styles.inputWrapper}>
                <p>Required: Upload an artwork profile image</p>
                <div className={styles.imageUploadWrapper}>
                  <input
                    type="file"
                    id="artworkImageInput"
                    name="artworkImage"
                    accept="image/*"
                    className={styles.hiddenInput}
                    onChange={handleInputChange}
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
                  To see an example, <a href="/example" className={styles.link}>click here</a>.
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
              <div className={styles.inputWrapper}>
                <p>Required</p>
                <input
                  type="text"
                  name="artworkTitle"
                  placeholder="Artwork Title"
                  className={styles.input}
                  value={formData.artworkTitle}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <p>Required</p>
                <textarea
                  name="artworkAbout"
                  placeholder="About"
                  className={`${styles.input} ${styles.textarea}`}
                  value={formData.artworkAbout}
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
                >
                  <option value="">Select Era of Origin</option>
                  <option value="Renaissance">Renaissance</option>
                  <option value="Baroque">Baroque</option>
                  <option value="Modernism">Modernism</option>
                  <option value="Postmodernism">Postmodernism</option>
                  <option value="Contemporary">Contemporary</option>
                  <option value="custom">Other (Specify below)</option>
                </select>

                {formData.timelineCenter === "custom" && (
                  <input
                    type="text"
                    name="customTimelineCenter"
                    placeholder="Specify Era of Origin"
                    className={`${styles.input} ${styles.customInput}`}
                    value={formData.customTimelineCenter || ""} // Default to an empty string
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customTimelineCenter: e.target.value,
                      }))
                    }
                  />
                )}
              </div>

              <div className={styles.inputWrapper}>
                <p>Required</p>
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
                >
                  <option value="">Select An Existing Artist</option>
                  <option value="Leonardo da Vinci">Leonardo da Vinci</option>
                  <option value="Vincent van Gogh">Vincent van Gogh</option>
                  <option value="Pablo Picasso">Pablo Picasso</option>
                  <option value="Claude Monet">Claude Monet</option>
                  <option value="Salvador Dalí">Salvador Dalí</option>
                </select>
              </div>

              <div className={styles.inputWrapper}>
                <input
                  type="number"
                  name="artworkYear"
                  placeholder="Year the Artwork Was Created"
                  className={styles.input}
                  value={formData.artworkYear}
                  onChange={handleInputChange}
                />
              </div>

              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  name="timelineLeft"
                  placeholder="Era Prior to the Artwork's Creation"
                  className={styles.input}
                  value={formData.timelineLeft}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  name="timelineRight"
                  placeholder="Era After the Artwork's Creation"
                  className={styles.input}
                  value={formData.timelineRight}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  name="artworkGenre"
                  placeholder="Artwork's Genre"
                  className={styles.input}
                  value={formData.artworkGenre}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  name="artworkMedia"
                  placeholder="What Is The Artwork Created With/Of/On"
                  className={styles.input}
                  value={formData.artworkMedia}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  name="artworkDimensions"
                  placeholder="Artwork's Dimensions"
                  className={styles.input}
                  value={formData.artworkDimensions}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
          <div className={styles.registerButtonWrapper}>
            <button type="submit" form="artwork-register-form" className={styles.button}>
              Submit Artwork For Approval
            </button>
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

      </div>
    </>
  );
}

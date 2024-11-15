"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation"; // Import useRouter

export default function Login() {
  const router = useRouter(); // Initialize useRouter
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerAsArtist, setRegisterAsArtist] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [usedEmail, setUsedEmail] = useState(""); // Store the email used during registration

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const [formData, setFormData] = useState<{
    image: File | null;
    name: string;
    fullName: string;
    about: string;
    dateOfBirth: string;
    birthYear: string;
    nationality: string;
    artMovement: string;
    email: string;
    password: string;
    confirmPassword: string;
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
    email: "",
    password: "",
    confirmPassword: "",
    dateOfDeath: "",
    deathYear: "",
    influencedBy: "",
    influencedOn: "",
    artInstitution: "",
    friendsOrCoworkers: "",
    wikipediaLink: "",
    officialSiteLink: "",
  });

  const [museumFormData, setMuseumFormData] = useState<{
    image: File | null;
    name: string;
    latitude: string;
    longitude: string;
    about: string;
    city: string;
    province: string;
    country: string;
    type: string;
    email: string;
    password: string;
    confirmPassword: string;
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
    email: "",
    password: "",
    confirmPassword: "",
    visitorsPerYear: "",
    websiteLink: "",
    wikipediaLink: "",
  });


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as HTMLInputElement & { files: FileList };
    setFormData((prev) => ({
      ...prev,
      [name]: name === "image" ? files?.[0] : value, // Set file for image input
    }));
  };

  const handleMuseumInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as HTMLInputElement & { files: FileList };
    setMuseumFormData((prev) => ({
      ...prev,
      [name]: name === "image" ? files?.[0] : value, // Set file for image input
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
    formData.artMovement &&
    formData.email &&
    formData.password &&
    formData.confirmPassword;

  const isMuseumFormValid =
    museumFormData.image &&
    museumFormData.name &&
    museumFormData.latitude &&
    museumFormData.longitude &&
    museumFormData.about &&
    museumFormData.city &&
    museumFormData.province &&
    museumFormData.country &&
    museumFormData.type &&
    museumFormData.email &&
    museumFormData.password &&
    museumFormData.confirmPassword;

  const handleToggleRegister = () => {
    setIsRegistering((prev) => !prev);
    setRegisterAsArtist(false);
  };

  const handleRegisterAsArtist = () => {
    setIsRegistering(true);
    setRegisterAsArtist(true);
  };

  const handleRegisterAsMuseum = () => {
    setIsRegistering(true);
    setRegisterAsArtist(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isRegistering) {
      if (loginData.email && loginData.password) {
        router.push("/home");
      } else {
        alert("Please fill in both email and password.");
      }
    } else {
      const currentEmail = registerAsArtist
        ? formData.email
        : museumFormData.email;

      if (
        (registerAsArtist && isFormValid) ||
        (!registerAsArtist && isMuseumFormValid)
      ) {
        setUsedEmail(currentEmail); // Save the email for display
        setShowConfirmation(true); // Show the confirmation message
      } else {
        alert(
          `Please fill in all required fields for ${registerAsArtist ? "artist" : "museum"
          } registration.`
        );
      }
    }
  };

  const handleBackToLogin = () => {
    setFormData({
      image: null,
      name: "",
      fullName: "",
      about: "",
      dateOfBirth: "",
      birthYear: "",
      nationality: "",
      artMovement: "",
      email: "",
      password: "",
      confirmPassword: "",
      dateOfDeath: "",
      deathYear: "",
      influencedBy: "",
      influencedOn: "",
      artInstitution: "",
      friendsOrCoworkers: "",
      wikipediaLink: "",
      officialSiteLink: "",
    });

    setMuseumFormData({
      image: null,
      name: "",
      latitude: "",
      longitude: "",
      about: "",
      city: "",
      province: "",
      country: "",
      type: "",
      email: "",
      password: "",
      confirmPassword: "",
      visitorsPerYear: "",
      websiteLink: "",
      wikipediaLink: "",
    });
    setShowConfirmation(false);
    setIsRegistering(false);
  };


  return (
    <div className={styles.page}>
      {showConfirmation ? (
        <div className={styles.confirmationWrapper}>
          <p>
            Thank you for registering! Your request needs to be approved first. We will
            contact you about our decision at the following email:{" "}
            <strong>{usedEmail}</strong>.
          </p>
          <button
            onClick={handleBackToLogin}
            className={styles.backToLoginButton}
          >
            Back to Login
          </button>
        </div>
      ) : (

        <div
          className={`${styles.mainWrapper} ${isRegistering ? styles.slide : ""}`}
        >
          <main className={styles.main}>
            <h1 className={styles.heading}>ArtVista Portal</h1>
            <form
              id="form-id"
              className={`${styles.form} ${isRegistering ? styles.registeringForm : ""}`}
              onSubmit={handleSubmit}
            >
              {isRegistering ? (
                <>
                  {registerAsArtist ? (
                    <>
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
                            e.target.style.height = "auto"; // Reset height to auto
                            e.target.style.height = `${e.target.scrollHeight}px`; // Adjust height based on scroll height
                          }}
                          rows={1} // Initial height of 1 row
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
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <input
                          type="email"
                          name="email"
                          placeholder="Email"
                          className={styles.input}
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <input
                          type="password"
                          name="password"
                          placeholder="Create Password"
                          className={styles.input}
                          value={formData.password}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <input
                          type="password"
                          name="confirmPassword"
                          placeholder="Confirm Password"
                          className={styles.input}
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.inputWrapper}>
                        <p>Required: Upload a museum profile image</p>
                        <div className={styles.imageUploadWrapper}>
                          <input
                            type="file"
                            id="museumImageInput"
                            name="image"
                            accept="image/*"
                            className={styles.hiddenInput}
                            onChange={handleMuseumInputChange}
                          />
                          <label htmlFor="museumImageInput" className={styles.imageUploadBox}>
                            {museumFormData.image ? (
                              <img
                                src={URL.createObjectURL(museumFormData.image)}
                                alt="Museum Profile"
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
                          placeholder="Museum's Name"
                          className={styles.input}
                          value={museumFormData.name}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <input
                          type="number"
                          name="latitude"
                          placeholder="Latitude"
                          className={styles.input}
                          value={museumFormData.latitude}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <input
                          type="number"
                          name="longitude"
                          placeholder="Longitude"
                          className={styles.input}
                          value={museumFormData.longitude}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <textarea
                          name="about"
                          placeholder="About"
                          className={`${styles.input} ${styles.textarea}`}
                          value={museumFormData.about}
                          onChange={(e) => {
                            handleMuseumInputChange(e);
                            e.target.style.height = "auto"; // Reset height to auto
                            e.target.style.height = `${e.target.scrollHeight}px`; // Adjust height based on scroll height
                          }}
                          rows={1} // Initial height of 1 row
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <input
                          type="text"
                          name="city"
                          placeholder="City"
                          className={styles.input}
                          value={museumFormData.city}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <input
                          type="text"
                          name="province"
                          placeholder="Province"
                          className={styles.input}
                          value={museumFormData.province}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <input
                          type="text"
                          name="country"
                          placeholder="Country"
                          className={styles.input}
                          value={museumFormData.country}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <input
                          type="text"
                          name="type"
                          placeholder="Type"
                          className={styles.input}
                          value={museumFormData.type}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <input
                          type="number"
                          name="visitorsPerYear"
                          placeholder="Number Of Visitors Per Year"
                          className={styles.input}
                          value={museumFormData.visitorsPerYear}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <input
                          type="url"
                          name="websiteLink"
                          placeholder="Website Link"
                          className={styles.input}
                          value={museumFormData.websiteLink}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <input
                          type="url"
                          name="wikipediaLink"
                          placeholder="Wikipedia Link"
                          className={styles.input}
                          value={museumFormData.wikipediaLink}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <input
                          type="email"
                          name="email"
                          placeholder="Email"
                          className={styles.input}
                          value={museumFormData.email}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <input
                          type="password"
                          name="password"
                          placeholder="Create Password"
                          className={styles.input}
                          value={museumFormData.password}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                      <div className={styles.inputWrapper}>
                        <p>Required</p>
                        <input
                          type="password"
                          name="confirmPassword"
                          placeholder="Confirm Password"
                          className={styles.input}
                          value={museumFormData.confirmPassword}
                          onChange={handleMuseumInputChange}
                        />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    className={styles.input}
                    value={loginData.email}
                    onChange={handleLoginInputChange}
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    className={styles.input}
                    value={loginData.password}
                    onChange={handleLoginInputChange}
                  />
                  <button type="submit" className={styles.button}>
                    Log In
                  </button>
                  <a href="#" className={styles.forgotPassword}>
                    Forgot Password?
                  </a>
                </>
              )}
            </form>

            {isRegistering && (
              <div className={styles.registerButtonWrapper}>
                <button type="submit" form="form-id" className={styles.button}>
                  Register
                </button>
              </div>
            )}

            <hr className={styles.separator} />

            <div className={styles.registerContainer}>
              {isRegistering ? (
                <div className={styles.buttonWrapper}>
                  <button
                    className={styles.registerArtist}
                    onClick={handleToggleRegister}
                  >
                    Already registered? Log in instead
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.buttonWrapper}>
                    <button
                      className={styles.registerArtist}
                      onClick={handleRegisterAsArtist}
                    >
                      🎨 Register as Artist
                    </button>
                  </div>
                  <div className={styles.buttonWrapper}>
                    <button
                      className={styles.registerMuseum}
                      onClick={handleRegisterAsMuseum}
                    >
                      🏛️ Register as Museum
                    </button>
                  </div>
                </>
              )}
            </div>
          </main>
          <div className={styles.imageContainer}>
            <img src="/logo.png" alt="ArtVista Logo" className={styles.image} />
            <p className={styles.welcomeText}>
              Welcome to the ArtVista Portal – empowering artists and museums to
              seamlessly manage and showcase their collections
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

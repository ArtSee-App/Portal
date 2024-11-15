"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation"; // Import useRouter

export default function Login() {
  const router = useRouter(); // Initialize useRouter
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerAsArtist, setRegisterAsArtist] = useState(true);

  const [formData, setFormData] = useState({
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
  });

  const [museumFormData, setMuseumFormData] = useState({
    name: "", // Museum's Name
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
  });


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMuseumInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMuseumFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  const isFormValid =
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
    if (isRegistering && registerAsArtist) {
      if (isFormValid) {
        router.push("/home"); // Navigate to /home on form submission
      } else {
        alert("Please fill in all required fields for artist registration.");
      }
    } else if (isRegistering && !registerAsArtist) {
      if (isMuseumFormValid) {
        router.push("/home"); // Navigate to /home on form submission
      } else {
        alert("Please fill in all required fields for museum registration.");
      }
    }
  };

  return (
    <div className={styles.page}>
      <div
        className={`${styles.mainWrapper} ${isRegistering ? styles.slide : ""}`}
      >
        <main className={styles.main}>
          <h1 className={styles.heading}>ArtVista Portal</h1>
          <form className={styles.form} onSubmit={handleSubmit}>
            {isRegistering ? (
              <>
                {registerAsArtist ? (
                  <>
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
                        placeholder="Date Of Death"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        type="number"
                        placeholder="Date Of Death Year"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        type="text"
                        placeholder="Influenced By"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        type="text"
                        placeholder="Influenced On"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        type="text"
                        placeholder="Art Institution"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        type="text"
                        placeholder="Friends/Co-workers"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        type="url"
                        placeholder="Wikipedia Link"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        type="url"
                        placeholder="Official Site Link"
                        className={styles.input}
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
                        placeholder="Number of visitors Per Year"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        type="url"
                        placeholder="Website Link"
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        type="url"
                        placeholder="Wikipedia Link"
                        className={styles.input}
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
                <button type="submit" className={styles.button}>
                  Register
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Email"
                  className={styles.input}
                />
                <input
                  type="password"
                  placeholder="Password"
                  className={styles.input}
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
    </div>
  );
}

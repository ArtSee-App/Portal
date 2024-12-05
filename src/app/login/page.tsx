"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation"; // Import useRouter
import Footer from "@/components/footer/footer";
import LoadingOverlay from "@/components/loadingOverlay/loadingOverlay";
import { useUser } from "@/context/UserContext";

import { auth, db } from "../../../firebase";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";


export default function Login() {
  const router = useRouter(); // Initialize useRouter
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerAsArtist, setRegisterAsArtist] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [usedEmail, setUsedEmail] = useState(""); // Store the email used during registration
  const [loading, setLoading] = useState(false);
  const { setUser } = useUser();

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

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      alert("Please enter your email to reset the password.");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, loginData.email);
      alert("Password reset email sent! Please check your inbox.");
      setIsForgotPassword(false);  // Return to login after success
    } catch (error) {
      alert("Error resetting password: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true); // Show loading indicator

    if (!isRegistering) {
      // Login logic
      if (loginData.email && loginData.password) {
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            loginData.email,
            loginData.password
          );

          if (!userCredential.user.email) {
            throw new Error("Email not found for the logged-in user");
          }

          // Fetch user details from Firestore
          const userDocRef = doc(db, "users", userCredential.user.email);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            throw new Error("User not found in Firestore");
          }

          const userApproved = userDoc.data()?.approved || false; // Default to false if `approved` is missing

          // Check if user is approved
          if (!userApproved) {
            alert("Your account has not been approved yet. Please wait for approval.");
            await signOut(auth); // Sign out the user from Firebase Auth
            setLoading(false); // Hide loading indicator
            return;
          }

          const userType = userDoc.data()?.type || "unknown"; // Default to "unknown" if `type` is missing

          // Set user in the context
          setUser({
            userId: userCredential.user.uid, // Unique user ID from Firebase
            email: userCredential.user.email, // Guaranteed to be non-null
            type: userType, // Fetched from Firestore
            approved: userApproved, // User is approved
          });

          router.push("/home"); // Navigate to home page
        } catch (error) {
          alert("Login failed: " + (error as Error).message);
        } finally {
          setLoading(false); // Hide loading indicator
        }
      } else {
        alert("Please fill in both email and password.");
        setLoading(false); // Hide loading indicator
      }
    }
    else {
      // Registration logic
      const email = registerAsArtist ? formData.email : museumFormData.email;
      const password = registerAsArtist ? formData.password : museumFormData.password;
      const confirmPassword = registerAsArtist
        ? formData.confirmPassword
        : museumFormData.confirmPassword;

      // Validate password and confirm password match
      if (password !== confirmPassword) {
        alert("Passwords do not match. Please try again.");
        setLoading(false); // Hide loading indicator
        return;
      }

      if (
        (registerAsArtist && isFormValid) ||
        (!registerAsArtist && isMuseumFormValid)
      ) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);

          if (!userCredential.user.email) {
            throw new Error("Email not found for the registered user");
          }

          // Save user to Firestore
          await setDoc(doc(db, "users", userCredential.user.email), {
            type: registerAsArtist ? "artist" : "museum",
            approved: false,
          });

          setUsedEmail(email);
          setShowConfirmation(true);
        } catch (error) {
          alert("Registration failed: " + (error as Error).message);
        } finally {
          setLoading(false); // Hide loading indicator
        }
      } else {
        alert(
          `Please fill in all required fields for ${registerAsArtist ? "artist" : "museum"} registration.`
        );
        setLoading(false); // Hide loading indicator
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
    <>
      <div className={styles.page}>
        {showConfirmation ? (
          <div className={styles.confirmationWrapper}>
            <p>
              Thank you for registering! Your request needs to be approved first. We will
              contact you about our decision at the following email:{" "}
              <strong>{usedEmail}</strong>
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
            <LoadingOverlay isVisible={loading} />

            {isForgotPassword ? (
              <main className={styles.main}>
                <h1 className={styles.heading}>Forgot Password</h1>
                <p className={styles.forgotPasswordExplanation}>
                  Enter your email address below, and we'll send you a link to reset your password.
                </p>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  className={styles.input}
                  value={loginData.email}
                  onChange={handleLoginInputChange}
                />
                <button
                  className={styles.button}
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  Send Reset Link
                </button>
                <button
                  className={styles.button}
                  onClick={() => setIsForgotPassword(false)}
                >
                  Back to Login
                </button>
              </main>
            ) : (
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
                            <p>Art Institution Attended by the Individual</p>
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
                          <div className={styles.inputWrapperRequired}>
                            <p>Email</p>
                            <input
                              type="email"
                              name="email"
                              className={styles.input}
                              value={formData.email}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapperRequired}>
                            <p>Password</p>
                            <input
                              type="password"
                              name="password"
                              className={styles.input}
                              value={formData.password}
                              onChange={handleInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapperRequired}>
                            <p>Confirm Password</p>
                            <input
                              type="password"
                              name="confirmPassword"
                              className={styles.input}
                              value={formData.confirmPassword}
                              onChange={handleInputChange}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={styles.inputWrapperRequired}>
                            <p>Upload a museum profile image</p>
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
                          <div className={styles.inputWrapperRequired}>
                            <p>Museum's Name</p>
                            <input
                              type="text"
                              name="name"
                              placeholder="Example: DAF Museum"
                              className={styles.input}
                              value={museumFormData.name}
                              onChange={handleMuseumInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapperRequired}>
                            <p>Latitude</p>
                            <input
                              type="number"
                              name="latitude"
                              placeholder="Example: 40.7128"
                              className={styles.input}
                              value={museumFormData.latitude}
                              onChange={handleMuseumInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapperRequired}>
                            <p>Required</p>
                            <input
                              type="number"
                              name="longitude"
                              placeholder="Example: -74.0060"
                              className={styles.input}
                              value={museumFormData.longitude}
                              onChange={handleMuseumInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapperRequired}>
                            <p>About</p>
                            <textarea
                              name="about"
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
                          <div className={styles.inputWrapperRequired}>
                            <p>City</p>
                            <input
                              type="text"
                              name="city"
                              className={styles.input}
                              value={museumFormData.city}
                              onChange={handleMuseumInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapperRequired}>
                            <p>Province</p>
                            <input
                              type="text"
                              name="province"
                              className={styles.input}
                              value={museumFormData.province}
                              onChange={handleMuseumInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapperRequired}>
                            <p>Country</p>
                            <input
                              type="text"
                              name="country"
                              className={styles.input}
                              value={museumFormData.country}
                              onChange={handleMuseumInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapperRequired}>
                            <p>Type</p>
                            <input
                              type="text"
                              name="type"
                              placeholder="Example: Museum"
                              className={styles.input}
                              value={museumFormData.type}
                              onChange={handleMuseumInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapper}>
                            <p>Number Of Visitors Per Year</p>
                            <input
                              type="number"
                              name="visitorsPerYear"
                              className={styles.input}
                              value={museumFormData.visitorsPerYear}
                              onChange={handleMuseumInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapper}>
                            <p>Website Link</p>
                            <input
                              type="url"
                              name="websiteLink"
                              placeholder="Example: https://artvista.app/"
                              className={styles.input}
                              value={museumFormData.websiteLink}
                              onChange={handleMuseumInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapper}>
                            <p>Wikipedia Link</p>
                            <input
                              type="url"
                              name="wikipediaLink"
                              placeholder="Example: https://artvista.app/"
                              className={styles.input}
                              value={museumFormData.wikipediaLink}
                              onChange={handleMuseumInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapperRequired}>
                            <p>Email</p>
                            <input
                              type="email"
                              name="email"
                              className={styles.input}
                              value={museumFormData.email}
                              onChange={handleMuseumInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapperRequired}>
                            <p>Password</p>
                            <input
                              type="password"
                              name="password"
                              className={styles.input}
                              value={museumFormData.password}
                              onChange={handleMuseumInputChange}
                            />
                          </div>
                          <div className={styles.inputWrapperRequired}>
                            <p>Confirm Password</p>
                            <input
                              type="password"
                              name="confirmPassword"
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
                      <a
                        href="#"
                        className={styles.forgotPassword}
                        onClick={(e) => {
                          e.preventDefault();
                          setIsForgotPassword(true); // Show Forgot Password UI
                        }}
                      >
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
            )}
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
      <Footer />
    </>
  );
}

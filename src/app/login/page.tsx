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
import { useAlert } from "@/context/AlertContext";
import { useRecaptcha } from "@/hooks/useRecaptcha";


export default function Login() {
  const router = useRouter(); // Initialize useRouter
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerAsArtist, setRegisterAsArtist] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [usedEmail, setUsedEmail] = useState(""); // Store the email used during registration
  const [loading, setLoading] = useState(false);
  const { setUser } = useUser();
  const [showRegisterInfo, setShowRegisterInfo] = useState(false);

  const { showAlert, showConfirm } = useAlert();

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const { getRecaptchaToken } = useRecaptcha();


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
    nationality: string;
    artMovement: string[]; // Changed from string to array
    artMovementTemp: string; // Temporary input field
    email: string;
    password: string;
    confirmPassword: string;
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
    email: "",
    password: "",
    confirmPassword: "",
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

    // Validate file type for images
    if (name === "image" && files?.length) {
      const file = files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

      if (!allowedTypes.includes(file.type)) {
        showAlert("Invalid file type. Please select a JPEG, JPG, or PNG image.", "error");
        return; // Stop further execution
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: name === "image" ? files?.[0] : value, // Set file for image input
    }));
  };

  const handleMuseumInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as HTMLInputElement & { files: FileList };

    // Validate file type for images
    if (name === "image" && files?.length) {
      const file = files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

      if (!allowedTypes.includes(file.type)) {
        showAlert("Invalid file type. Please select a JPEG, JPG, or PNG image.", "error");
        return; // Stop further execution
      }
    }

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
    formData.nationality &&
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
    setIsRegistering(false);
    setRegisterAsArtist(false);

    // Reset both forms when switching to login
    setFormData({
      image: null,
      name: "",
      fullName: "",
      about: "",
      dateOfBirth: "",
      nationality: "",
      artMovement: [],
      artMovementTemp: "", // Reset temporary input field
      email: "",
      password: "",
      confirmPassword: "",
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
  };

  const handleRegisterAsArtist = () => {
    setIsRegistering(true);
    setRegisterAsArtist(true);
  };

  const handleRegisterAsMuseum = () => {
    showAlert("Museum registration is not available yet. Coming soon!", "info");
    //setIsRegistering(true);
    //setRegisterAsArtist(false);
  };

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      showAlert("Please enter your email to reset the password.", "error");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, loginData.email);
      showAlert("Password reset email sent! Please check your inbox or spam folder.", "info");
      setIsForgotPassword(false);  // Return to login after success
    } catch (error) {
      showAlert(`Error resetting password: ${(error as Error).message}`, "error");
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true); // Show loading indicator

    const recaptchaToken = await getRecaptchaToken("register");


    // Verify with backend
    const responseCaptcha = await fetch("/api/verify-recaptcha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: recaptchaToken }),
    });

    const resultCaptcha = await responseCaptcha.json();

    if (!resultCaptcha.success) {
      showAlert("reCAPTCHA verification failed. There is suspicion of bot activity, try again later.", "error");
      setLoading(false); // Show loading indicator
      return;
    }


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
            throw new Error("This user has been rejected");
          }

          const userType = userDoc.data()?.type || "unknown"; // Default to "unknown" if `type` is missing
          const artistIds = userDoc.data()?.artist_ids || []; // Get artist_ids array
          const artistId = artistIds.length > 0 ? artistIds[0] : null;

          const token = await userCredential.user.getIdToken();
          if (userType === "admin") {
            console.log('credentials ' + token + '   ' + userType + '   ' + artistId);
          }

          if (artistId) {
            // Call the API to get artist account status
            const response = await fetch(
              `https://api.artvista.app/get_artist_account_status/?${new URLSearchParams({
                artist_portal_token: token,
                artist_id: artistId.toString(),
              })}`
            );

            if (!response.ok) {
              throw new Error(`Failed to check account status: ${response.statusText}`);
            }

            const data = await response.json();
            const accountStatus = data.account_status;

            // If account is pending or rejected, log out the user
            if (accountStatus === "pending" || accountStatus === "rejected") {
              showAlert(
                accountStatus === "pending"
                  ? "Your account is still pending approval."
                  : "Your account has been rejected and cannot be accessed.",
                "error"
              );

              await signOut(auth); // Sign out from Firebase
              setUser(null); // Reset user state
              setLoading(false); // Hide loading indicator
              return;
            }
          }

          // If account is approved, proceed with login
          setUser({
            ...userCredential.user,
            type: userType, // Store user type
            artistId, // Store first artist ID if available
          });

          router.push("/home"); // Navigate to home page
        } catch (error) {
          showAlert(`Login failed: ${(error as Error).message}`, "error");
        } finally {
          setLoading(false); // Hide loading indicator
        }
      } else {
        showAlert("Please fill in both email and password.", "warning");
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
        showAlert("Passwords do not match. Please try again.", "error");
        setLoading(false); // Hide loading indicator
        return;
      }

      if ((registerAsArtist && isFormValid) || (!registerAsArtist && isMuseumFormValid)) {
        try {
          // Create user in Firebase
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          if (!user.email) {
            throw new Error("Email not found for the registered user");
          }

          // Get authentication token
          const token = await user.getIdToken();

          // Save user to Firestore
          await setDoc(doc(db, "users", user.email), {
            type: registerAsArtist ? "artist" : "museum"
          });

          if (registerAsArtist) {
            // Prepare API request for artist approval
            const apiUrl = `https://api.artvista.app/submit_artist_for_approval/?artist_portal_token=${encodeURIComponent(token)}&artist_name=${encodeURIComponent(formData.name)}&artist_full_name=${encodeURIComponent(formData.fullName)}&born_date=${encodeURIComponent(formData.dateOfBirth)}&nationality=${encodeURIComponent(formData.nationality)}&active_years=${1}&artist_bio_text=${encodeURIComponent(formData.about)}&user_email=${encodeURIComponent(formData.email)}`
              + (formData.wikipediaLink ? `&wikipedia_link=${encodeURIComponent(formData.wikipediaLink)}` : "")
              + (formData.officialSiteLink ? `&official_website=${encodeURIComponent(formData.officialSiteLink)}` : "");

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

            const response = await fetch(apiUrl, {
              method: "POST",
              body: formDataToSend,
            });

            const responseData = await response.json(); // Get the response JSON
            console.log("API Response:", responseData); // Print it

            if (!response.ok) {
              throw new Error(`API request failed: ${responseData.detail}`);
            }

            // Extract artist ID from the response
            const artistId = responseData.artist_id;
            if (!artistId) {
              throw new Error("Artist ID not received from API.");
            }

            // Update Firestore user document with artist_id
            const userDocRef = doc(db, "users", user.email);
            await setDoc(userDocRef, {
              type: "artist",
              artist_ids: [artistId], // Store artist_id in an array
            }, { merge: true });

          }

          setUsedEmail(email);
          setShowConfirmation(true);

        } catch (error) {
          showAlert(`Registration failed: ${(error as Error).message}`, "error");
        } finally {
          setLoading(false);
        }
      } else {
        showAlert(`Please fill in all required fields for ${registerAsArtist ? "artist" : "museum"} registration.`, "warning");
        setLoading(false);
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
      nationality: "",
      artMovement: [],
      artMovementTemp: "", // Reset temporary input field
      email: "",
      password: "",
      confirmPassword: "",
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



  return (
    <>
      <div className={styles.page}>
        {showConfirmation ? (
          <div className={styles.confirmationWrapper}>
            <p>
              Thank you for registering! Your request needs to be approved first. We will
              contact you about our decision at the following email:{" "}
              <strong>{usedEmail}</strong>
              . Make sure to check your inbox or spam folder.
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

            {showRegisterInfo ? (
              <main className={styles.main}>
                <h1 className={styles.heading}>What Should I Register As?</h1>
                <div className={styles.infoSection}>
                  <h2 className={styles.infoHeader}>🎨 Artist Registration</h2>
                  <p className={styles.infoParagraph}>
                    Register as an artist if you are an independent creator or professional
                    who wants to showcase and manage your artworks. This option is ideal for
                    individuals who wish to build a personal portfolio and connect with art
                    enthusiasts.
                  </p>
                  <h2 className={styles.infoHeader}>🏛️ Museum Registration</h2>
                  <p className={styles.infoParagraph}>
                    Register as a museum if you represent an art institution.
                    This option allows you to manage multiple artists and artworks under a single account.
                    Most likely, ArtVista has already reached out to discuss a potential collaboration, making this the ideal option for you.
                  </p>
                  <button
                    className={styles.button}
                    onClick={() => setShowRegisterInfo(false)}
                  >
                    Back to Login
                  </button>
                </div>
              </main>
            ) : isForgotPassword ? (
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
                                accept="image/jpeg, image/png, image/jpg" // Restrict to allowed formats
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
                            <p>Name (First + Last, e.g., John Doe)</p>
                            <input
                              type="text"
                              name="name"
                              className={styles.input}
                              value={formData.name}
                              onChange={handleInputChange}
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
                              placeholder="dd-mm-yyyy"
                              className={styles.input}
                              value={formData.dateOfBirth}
                              onChange={handleInputChange}
                              onBlur={(e) => validateDateFormat(e.target.value, "dateOfBirth")}
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
                            />
                          </div>

                          <div className={styles.inputWrapper}>
                            <p>Art Movement (multiple)</p>
                            <div className={styles.inputWithBubbles}>
                              {formData.artMovement.map((item, index) => (
                                <span key={index} className={styles.bubble}>
                                  <span className={styles.bubbleText}>{item}</span>
                                  <button
                                    type="button"
                                    className={styles.removeBubble}
                                    onClick={() => handleRemoveItem("artMovement", index)}
                                  >
                                    ❌
                                  </button>
                                </span>
                              ))}
                              <input
                                type="text"
                                name="artMovementTemp"
                                placeholder="Press Enter for each..."
                                className={styles.input}
                                value={formData.artMovementTemp || ""}
                                onChange={(e) => handleArrayInputChange(e, "artMovementTemp")}
                                onKeyDown={(e) => handleKeyDown(e, "artMovement")}
                                style={{ display: "block", width: "100%" }} // Ensure full width when typing
                              />
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
                            <div className={styles.inputWithBubbles}>
                              {formData.influencedBy.map((item, index) => (
                                <span key={index} className={styles.bubble}>
                                  <span className={styles.bubbleText}>{item}</span>
                                  <button
                                    type="button"
                                    className={styles.removeBubble}
                                    onClick={() => handleRemoveItem("influencedBy", index)}
                                  >
                                    ❌
                                  </button>
                                </span>
                              ))}
                              <input
                                type="text"
                                name="influencedByTemp"
                                placeholder="Press Enter for each..."
                                className={styles.input}
                                value={formData.influencedByTemp || ""}
                                onChange={(e) => handleArrayInputChange(e, "influencedByTemp")}
                                onKeyDown={(e) => handleKeyDown(e, "influencedBy")}
                                style={{ display: "block", width: "100%" }} // Ensure full width when typing
                              />
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
                            <div className={styles.inputWithBubbles}>
                              {formData.influencedOn.map((item, index) => (
                                <span key={index} className={styles.bubble}>
                                  <span className={styles.bubbleText}>{item}</span>
                                  <button
                                    type="button"
                                    className={styles.removeBubble}
                                    onClick={() => handleRemoveItem("influencedOn", index)}
                                  >
                                    ❌
                                  </button>
                                </span>
                              ))}
                              <input
                                type="text"
                                name="influencedOnTemp"
                                placeholder="Press Enter for each..."
                                className={styles.input}
                                value={formData.influencedOnTemp || ""}
                                onChange={(e) => handleArrayInputChange(e, "influencedOnTemp")}
                                onKeyDown={(e) => handleKeyDown(e, "influencedOn")}
                                style={{ display: "block", width: "100%" }} // Ensure full width when typing
                              />
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
                            <div className={styles.inputWithBubbles}>
                              {formData.artInstitution.map((item, index) => (
                                <span key={index} className={styles.bubble}>
                                  <span className={styles.bubbleText}>{item}</span>
                                  <button
                                    type="button"
                                    className={styles.removeBubble}
                                    onClick={() => handleRemoveItem("artInstitution", index)}
                                  >
                                    ❌
                                  </button>
                                </span>
                              ))}
                              <input
                                type="text"
                                name="artInstitutionTemp"
                                placeholder="Press Enter for each..."
                                className={styles.input}
                                value={formData.artInstitutionTemp || ""}
                                onChange={(e) => handleArrayInputChange(e, "artInstitutionTemp")}
                                onKeyDown={(e) => handleKeyDown(e, "artInstitution")}
                                style={{ display: "block", width: "100%" }} // Ensure full width when typing
                              />
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
                            <div className={styles.inputWithBubbles}>
                              {formData.friendsOrCoworkers.map((item, index) => (
                                <span key={index} className={styles.bubble}>
                                  <span className={styles.bubbleText}>{item}</span>
                                  <button
                                    type="button"
                                    className={styles.removeBubble}
                                    onClick={() => handleRemoveItem("friendsOrCoworkers", index)}
                                  >
                                    ❌
                                  </button>
                                </span>
                              ))}
                              <input
                                type="text"
                                name="friendsOrCoworkersTemp"
                                placeholder="Press Enter for each..."
                                className={styles.input}
                                value={formData.friendsOrCoworkersTemp || ""}
                                onChange={(e) => handleArrayInputChange(e, "friendsOrCoworkersTemp")}
                                onKeyDown={(e) => handleKeyDown(e, "friendsOrCoworkers")}
                                style={{ display: "block", width: "100%" }} // Ensure full width when typing
                              />
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
                                accept="image/jpeg, image/png, image/jpg" // Restrict to allowed formats
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
                            <p>Longitude</p>
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
                      <div className={styles.linkWrapper}>
                        <a
                          href="#"
                          className={styles.infoLink}
                          onClick={(e) => {
                            e.preventDefault();
                            setShowRegisterInfo(true); // Show "What should I register as?" information
                          }}
                        >
                          What should I register as?
                        </a>
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

"use client";

import React, { useState, useRef } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation"; // Import useRouter
import Footer from "@/components/footer/footer";
import LoadingOverlay from "@/components/loadingOverlay/loadingOverlay";
import { useUser } from "@/context/UserContext";
import InfoTooltip from "@/components/InfoTooltip/InfoTooltip";
import ImageEditor from "@/components/ImageEditor/ImageEditor";

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
  const [currentStep, setCurrentStep] = useState(1); // Multi-step registration state
  const [isTransitioning, setIsTransitioning] = useState(false); // For fade transitions
  const [dateOfBirthError, setDateOfBirthError] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [savedImageData, setSavedImageData] = useState<{
    position: { x: number; y: number };
    zoom: number;
  } | null>(null);

  const { showAlert } = useAlert();

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
    registrationType: "self" | "other";
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
    registrationType: "self",
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


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as HTMLInputElement & { files: FileList | null };

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

  // URL validation functions
  const isValidURL = (url: string): boolean => {
    if (!url || url.trim() === "") return true; // Empty URLs are optional
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  const isValidWikipediaURL = (url: string): boolean => {
    if (!url || url.trim() === "") return true; // Empty URLs are optional
    try {
      const urlObj = new URL(url);
      return (urlObj.hostname.includes("wikipedia.org") || urlObj.hostname.includes("wikidata.org")) &&
             (urlObj.protocol === "http:" || urlObj.protocol === "https:");
    } catch {
      return false;
    }
  };

  // Image editor handlers
  const handleImageClick = () => {
    if (formData.image) {
      setShowImageEditor(true);
    }
  };

  const handleImageSave = (imageData: { file: File; position: { x: number; y: number }; zoom: number }) => {
    setSavedImageData({ position: imageData.position, zoom: imageData.zoom });
  };

  const handleUploadNew = () => {
    document.getElementById("artistImageInput")?.click();
  };

  const datePattern = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/; // dd-mm-yyyy


  const isFormValid =
    formData.image &&
    formData.name &&
    formData.fullName &&
    formData.about &&
    formData.dateOfBirth &&
    formData.nationality &&
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    isValidURL(formData.officialSiteLink) &&
    isValidWikipediaURL(formData.wikipediaLink);

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

  const isNextDisabled =
    !(isRegistering && registerAsArtist) ? false :
      currentStep === 1
        ? !(
          formData.image &&
          formData.name &&
          formData.dateOfBirth &&
          formData.nationality &&
          datePattern.test(formData.dateOfBirth)
        )
        : currentStep === 2
          ? !(
            formData.about &&
            formData.fullName &&
            isValidWikipediaURL(formData.wikipediaLink) &&
            isValidURL(formData.officialSiteLink)
          )
          : currentStep === 3
            ? false // Step 3 is all optional, never disabled
            : false;

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
      nationality: "Prefer not to say",
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
      registrationType: "self",
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
    setCurrentStep(1); // Start at step 1
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

    // If registering and not on final step, handle navigation instead of submission
    if (isRegistering && registerAsArtist && currentStep < 4) {
      handleNextStep();
      return;
    }

    // Validate URLs before proceeding with registration
    if (isRegistering && registerAsArtist) {
      if (formData.wikipediaLink && !isValidWikipediaURL(formData.wikipediaLink)) {
        showAlert("Please enter a valid Wikipedia or Wikidata URL", "error");
        setLoading(false);
        return;
      }
      if (formData.officialSiteLink && !isValidURL(formData.officialSiteLink)) {
        showAlert("Please enter a valid URL for the official site (must start with http:// or https://)", "error");
        setLoading(false);
        return;
      }
    }

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
        } catch (error: unknown) {
          const message =
            (error as { code?: string })?.code === "auth/invalid-credential"
              ? "Login failed: The email or password you entered is incorrect."
              : `Login failed: ${(error as Error).message}`;
          showAlert(message, "error");
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
      nationality: "Prefer not to say",
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
      registrationType: "self",
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
    setCurrentStep(1); // Reset to first step
  };

  const validateCurrentStep = () => {
    if (!registerAsArtist) return true; // Museum validation unchanged for now

    if (currentStep === 1) {
      // Step 1: Essentials - Image, Name, Birth, Nationality
      if (!formData.image) {
        showAlert("Please upload a profile image.", "warning");
        return false;
      }
      if (!formData.name) {
        showAlert("Please enter your name.", "warning");
        return false;
      }
      if (!formData.dateOfBirth) {
        showAlert("Please enter your date of birth.", "warning");
        return false;
      }
      if (!datePattern.test(formData.dateOfBirth)) {
        setDateOfBirthError("Please enter your date of birth as dd-mm-yyyy.");
        showAlert("Invalid date format. Please enter your date of birth as dd-mm-yyyy.", "error");
        return false;
      }
      if (!formData.nationality) {
        showAlert("Please enter your nationality.", "warning");
        return false;
      }
      setDateOfBirthError(null);
      return true;
    }

    if (currentStep === 2) {
      // Step 2: Mandatory fields - Full Name, About, Wikipedia, Official Site
      if (!formData.fullName) {
        showAlert("Please enter your full name.", "warning");
        return false;
      }
      if (!formData.about) {
        showAlert("Please tell us about yourself.", "warning");
        return false;
      }
      if (!isValidWikipediaURL(formData.wikipediaLink)) {
        showAlert("Please enter a valid Wikipedia or Wikidata URL", "error");
        return false;
      }
      if (!isValidURL(formData.officialSiteLink)) {
        showAlert("Please enter a valid URL for the official site (must start with http:// or https://)", "error");
        return false;
      }
      return true;
    }

    if (currentStep === 3) {
      // Step 3: Optional fields - No validation required, all optional
      return true;
    }

    if (currentStep === 4) {
      // Step 4: Account - Email, Password, Confirm Password
      if (!formData.email) {
        showAlert("Please enter your email.", "warning");
        return false;
      }
      if (!formData.password) {
        showAlert("Please enter a password.", "warning");
        return false;
      }
      if (!formData.confirmPassword) {
        showAlert("Please confirm your password.", "warning");
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        showAlert("Passwords do not match.", "error");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, 4));
        setIsTransitioning(false);
        // Scroll to top of main content
        const mainElement = document.querySelector(`.${styles.main}`);
        if (mainElement) {
          mainElement.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 300);
    }
  };

  const handlePrevStep = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(prev => Math.max(prev - 1, 1));
      setIsTransitioning(false);
      // Scroll to top of main content
      const mainElement = document.querySelector(`.${styles.main}`);
      if (mainElement) {
        mainElement.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 300);
  };

  const validateDateFormat = (dateString: string, fieldName: string) => {

    if (!dateString.trim()) {
      if (fieldName === "dateOfBirth") {
        setDateOfBirthError(null);
      }
      return true;
    }

    if (!datePattern.test(dateString)) {
      if (fieldName === "dateOfBirth") {
        setDateOfBirthError("Please enter your date of birth as dd-mm-yyyy.");
      } else {
        showAlert(`Invalid date format. Please enter ${fieldName} as dd-mm-yyyy`, "error");
      }
      return false;
    }

    if (fieldName === "dateOfBirth") {
      setDateOfBirthError(null);
    }

    return true;
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
        <div className={styles.pageContent}>
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
            <div className={styles.cardsContainer}>
            <div className={styles.logoCardOuter}>
              <div className={styles.logoCard}>
                <img src="/favicon.png" alt="ArtVista Logo" className={styles.logoTop} />
                <div className={styles.logoContent}>
                  <h1 className={styles.heading}>ArtVista Portal</h1>
                  <p className={styles.logoSubtitle}>
                    Empowering artists and museums to manage and showcase their collections.
                  </p>
                  <div className={styles.logoTagline}>
                    <span className={styles.logoPill}>Artists</span>
                    <span className={styles.logoSeparator}>•</span>
                    <span className={styles.logoPill}>Museums</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.mainWrapperOuter}>
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
                <form
                  id="form-id"
                  className={`${styles.form} ${isRegistering ? styles.registeringForm : ""}`}
                  onSubmit={handleSubmit}
                >
                  {/* Progress Bar */}
                  {isRegistering && registerAsArtist && (
                    <div className={styles.progressBarContainer}>
                      <div>
                        <div
                          className={styles.progressBar}
                          style={{ width: `${(currentStep / 4) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isRegistering ? (
                    <>
                      {registerAsArtist ? (
                        <>
                          {/* Step-based form content with fade transition */}
                          <div className={`${styles.stepContainer} ${isTransitioning ? styles.fadeOut : styles.fadeIn}`}>

                            {/* STEP 1: Essentials */}
                            {currentStep === 1 && (
                              <>
                                <h2 className={styles.stepTitle}>Tell us about yourself</h2>

                                {/* Registration Type Selector */}
                                <div className={styles.registrationTypeWrapper}>
                                  <p className={styles.registrationTypeLabel}>Who are you registering?</p>
                                  <div className={styles.registrationTypeOptions}>
                                    <label className={`${styles.registrationTypeOption} ${formData.registrationType === "self" ? styles.selected : ""}`}>
                                      <input
                                        type="radio"
                                        name="registrationType"
                                        value="self"
                                        checked={formData.registrationType === "self"}
                                        onChange={(e) => setFormData(prev => ({ ...prev, registrationType: e.target.value as "self" | "other" }))}
                                      />
                                      <div className={styles.optionContent}>
                                        <span className={styles.optionTitle}>Myself</span>
                                        <span className={styles.optionDescription}>I am the artist</span>
                                      </div>
                                    </label>
                                    <label className={`${styles.registrationTypeOption} ${formData.registrationType === "other" ? styles.selected : ""}`}>
                                      <input
                                        type="radio"
                                        name="registrationType"
                                        value="other"
                                        checked={formData.registrationType === "other"}
                                        onChange={(e) => setFormData(prev => ({ ...prev, registrationType: e.target.value as "self" | "other" }))}
                                      />
                                      <div className={styles.optionContent}>
                                        <span className={styles.optionTitle}>Someone Else</span>
                                        <span className={styles.optionDescription}>Another artist (living or deceased)</span>
                                      </div>
                                    </label>
                                  </div>
                                  <p className={styles.registrationTypeNotice}>
                                    Please note that your registration will not be activated right away, as our curator team must first review your profile. If you are registering someone else, we may need to contact you to verify that you hold the necessary rights to represent them.
                                  </p>
                                </div>

                                <div className={styles.inputWrapperRequired}>
                                  <p>Upload an artist profile image</p>
                            <div className={styles.circularImageUploadWrapper}>
                                    <input
                                      type="file"
                                      id="artistImageInput"
                                      name="image"
                                      accept="image/jpeg, image/png, image/jpg"
                                      className={styles.hiddenInput}
                                      onChange={(e) => {
                                        handleInputChange(e);
                                        setSavedImageData(null); // Reset saved data on new image
                                        if (e.target.files?.[0]) {
                                          setShowImageEditor(true); // Auto-open editor when image is uploaded
                                        }
                                      }}
                                    />
                                    <label htmlFor="artistImageInput" className={styles.circularImageUploadBox}>
                                      {formData.image ? (
                                        <div
                                          className={styles.circularImageContainer}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleImageClick();
                                          }}
                                          style={{ cursor: 'pointer' }}
                                        >
                                          <img
                                            src={URL.createObjectURL(formData.image)}
                                            alt="Artist Profile"
                                            className={styles.circularUploadedImage}
                                            style={{
                                              transform: savedImageData
                                                ? `translate(calc(-50% + ${savedImageData.position.x}px), calc(-50% + ${savedImageData.position.y}px)) scale(${savedImageData.zoom})`
                                                : 'translate(-50%, -50%) scale(1)',
                                            }}
                                            draggable={false}
                                          />
                                        </div>
                                      ) : (
                                        <span className={styles.plusIcon}>+</span>
                                      )}
                                    </label>
                                    {formData.image && (
                                      <p className={styles.clickHint}>Click to edit</p>
                                    )}
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
                                  <p>Date of Birth</p>
                                  <input
                                    type="text"
                                    name="dateOfBirth"
                                    placeholder="dd-mm-yyyy"
                                    className={`${styles.input} ${dateOfBirthError ? styles.inputError : ""}`}
                                    value={formData.dateOfBirth}
                                    onChange={handleInputChange}
                                    onBlur={(e) => validateDateFormat(e.target.value, "dateOfBirth")}
                                  />
                                  {dateOfBirthError && (
                                    <span className={styles.errorMessage}>{dateOfBirthError}</span>
                                  )}
                                </div>
                                <div className={styles.inputWrapperRequired}>
                                  <p>Nationality</p>
                                  <select
                                    name="nationality"
                                    className={styles.input}
                                    value={formData.nationality}
                                    onChange={handleInputChange}
                                  >
                                    <option value="">Choose one</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                    <option value="Afghan">Afghan</option>
                                    <option value="Albanian">Albanian</option>
                                    <option value="Algerian">Algerian</option>
                                    <option value="American">American</option>
                                    <option value="Argentinian">Argentinian</option>
                                    <option value="Armenian">Armenian</option>
                                    <option value="Australian">Australian</option>
                                    <option value="Austrian">Austrian</option>
                                    <option value="Azerbaijani">Azerbaijani</option>
                                    <option value="Bangladeshi">Bangladeshi</option>
                                    <option value="Belarusian">Belarusian</option>
                                    <option value="Belgian">Belgian</option>
                                    <option value="Bolivian">Bolivian</option>
                                    <option value="Bosnian">Bosnian</option>
                                    <option value="Brazilian">Brazilian</option>
                                    <option value="Bulgarian">Bulgarian</option>
                                    <option value="Canadian">Canadian</option>
                                    <option value="Chilean">Chilean</option>
                                    <option value="Chinese">Chinese</option>
                                    <option value="Colombian">Colombian</option>
                                    <option value="Croatian">Croatian</option>
                                    <option value="Cuban">Cuban</option>
                                    <option value="Cypriot">Cypriot</option>
                                    <option value="Czech">Czech</option>
                                    <option value="Danish">Danish</option>
                                    <option value="Dutch">Dutch</option>
                                    <option value="Egyptian">Egyptian</option>
                                    <option value="English">English</option>
                                    <option value="Estonian">Estonian</option>
                                    <option value="Finnish">Finnish</option>
                                    <option value="French">French</option>
                                    <option value="Georgian">Georgian</option>
                                    <option value="German">German</option>
                                    <option value="Greek">Greek</option>
                                    <option value="Hungarian">Hungarian</option>
                                    <option value="Icelandic">Icelandic</option>
                                    <option value="Indian">Indian</option>
                                    <option value="Indonesian">Indonesian</option>
                                    <option value="Iranian">Iranian</option>
                                    <option value="Iraqi">Iraqi</option>
                                    <option value="Irish">Irish</option>
                                    <option value="Israeli">Israeli</option>
                                    <option value="Italian">Italian</option>
                                    <option value="Japanese">Japanese</option>
                                    <option value="Jordanian">Jordanian</option>
                                    <option value="Kazakh">Kazakh</option>
                                    <option value="Kenyan">Kenyan</option>
                                    <option value="Korean">Korean</option>
                                    <option value="Kurdish">Kurdish</option>
                                    <option value="Latvian">Latvian</option>
                                    <option value="Lebanese">Lebanese</option>
                                    <option value="Lithuanian">Lithuanian</option>
                                    <option value="Luxembourgish">Luxembourgish</option>
                                    <option value="Malaysian">Malaysian</option>
                                    <option value="Mexican">Mexican</option>
                                    <option value="Moldovan">Moldovan</option>
                                    <option value="Mongolian">Mongolian</option>
                                    <option value="Montenegrin">Montenegrin</option>
                                    <option value="Moroccan">Moroccan</option>
                                    <option value="Nepali">Nepali</option>
                                    <option value="New Zealander">New Zealander</option>
                                    <option value="Nigerian">Nigerian</option>
                                    <option value="Norwegian">Norwegian</option>
                                    <option value="Pakistani">Pakistani</option>
                                    <option value="Palestinian">Palestinian</option>
                                    <option value="Peruvian">Peruvian</option>
                                    <option value="Polish">Polish</option>
                                    <option value="Portuguese">Portuguese</option>
                                    <option value="Romanian">Romanian</option>
                                    <option value="Russian">Russian</option>
                                    <option value="Saudi Arabian">Saudi Arabian</option>
                                    <option value="Scottish">Scottish</option>
                                    <option value="Serbian">Serbian</option>
                                    <option value="Singaporean">Singaporean</option>
                                    <option value="Slovak">Slovak</option>
                                    <option value="Slovenian">Slovenian</option>
                                    <option value="South African">South African</option>
                                    <option value="Spanish">Spanish</option>
                                    <option value="Swedish">Swedish</option>
                                    <option value="Swiss">Swiss</option>
                                    <option value="Syrian">Syrian</option>
                                    <option value="Thai">Thai</option>
                                    <option value="Turkish">Turkish</option>
                                    <option value="Ukrainian">Ukrainian</option>
                                    <option value="Emirati">Emirati</option>
                                    <option value="Venezuelan">Venezuelan</option>
                                    <option value="Vietnamese">Vietnamese</option>
                                    <option value="Welsh">Welsh</option>
                                    <option value="Other / Mixed">Other / Mixed</option>
                                  </select>
                                  {formData.nationality === "Prefer not to say" && (
                                    <p className={styles.registrationNotice}>
                                      If you choose not to share your nationality, we may not be able to reflect your geographic background as precisely as we do for other artists. Our aim is to respectfully represent artists from all regions.
                                    </p>
                                  )}
                                </div>
                              </>
                            )}

                            {/* STEP 2: Mandatory Journey Fields */}
                            {currentStep === 2 && (
                              <>
                                <h2 className={styles.stepTitle}>Your artistic journey - Essential Information</h2>
                                <div className={styles.inputWrapperRequired}>
                                  <p>
                                    Full Name (All names, e.g., John Michael Doe)
                                    <InfoTooltip text="We ask this in case you have a longer name. If it's the same as your first name, please write your name again here." />
                                  </p>
                                  <input
                                    type="text"
                                    name="fullName"
                                    className={styles.input}
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                  />
                                </div>
                                <div className={styles.inputWrapperRequired}>
                                  <p>
                                    About
                                    <InfoTooltip text="Give us a short description of who you are and what you do." />
                                  </p>
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
                                <div className={styles.inputWrapper}>
                                  <p>
                                    Wikipedia Link
                                    <InfoTooltip text="Must be a Wikipedia or Wikidata URL. Example: https://en.wikipedia.org/wiki/Artist_Name" />
                                  </p>
                                  <input
                                    type="url"
                                    name="wikipediaLink"
                                    placeholder="https://en.wikipedia.org/wiki/..."
                                    className={`${styles.input} ${formData.wikipediaLink && !isValidWikipediaURL(formData.wikipediaLink) ? styles.inputError : ""}`}
                                    value={formData.wikipediaLink}
                                    onChange={handleInputChange}
                                  />
                                  {formData.wikipediaLink && !isValidWikipediaURL(formData.wikipediaLink) && (
                                    <span className={styles.errorMessage}>
                                      Please enter a valid Wikipedia or Wikidata URL
                                    </span>
                                  )}
                                </div>
                                <div className={styles.inputWrapper}>
                                  <p>
                                    Official Site Link
                                    <InfoTooltip text="The artist's official website. Must start with http:// or https://" />
                                  </p>
                                  <input
                                    type="url"
                                    name="officialSiteLink"
                                    placeholder="https://artistwebsite.com"
                                    className={`${styles.input} ${formData.officialSiteLink && !isValidURL(formData.officialSiteLink) ? styles.inputError : ""}`}
                                    value={formData.officialSiteLink}
                                    onChange={handleInputChange}
                                  />
                                  {formData.officialSiteLink && !isValidURL(formData.officialSiteLink) && (
                                    <span className={styles.errorMessage}>
                                      Please enter a valid URL starting with http:// or https://
                                    </span>
                                  )}
                                </div>
                              </>
                            )}

                            {/* STEP 3: Optional Journey Fields */}
                            {currentStep === 3 && (
                              <>
                                <h2 className={styles.stepTitle}>Your artistic journey - Additional Details</h2>
                                <p className={styles.stepDescription}>The following fields are optional but help us provide a richer profile.</p>

                                {formData.registrationType === "other" && (
                                  <div className={styles.inputWrapper}>
                                    <p>Date Of Death</p>
                                    <input
                                      type="text"
                                      name="dateOfDeath"
                                      placeholder="dd-mm-yyyy (optional)"
                                      className={styles.input}
                                      value={formData.dateOfDeath}
                                      onChange={handleInputChange}
                                      onBlur={(e) => validateDateFormat(e.target.value, "dateOfDeath")}
                                    />
                                    <p className={styles.registrationNotice}>
                                      Optional: Only fill this if the artist is deceased. Use the format dd-mm-yyyy.
                                    </p>
                                  </div>
                                )}

                                <div className={styles.inputWrapper}>
                                  <p>
                                    Art Movement (multiple)
                                    <InfoTooltip text="Add art movements the artist was part of (e.g., Impressionism, Cubism). Press Enter to add each one." />
                                  </p>
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
                                      style={{ display: "block", width: "100%" }}
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
                                  <p>
                                    Influenced By (multiple)
                                    <InfoTooltip text="Who is your influence for your style, if anyone?" />
                                  </p>
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
                                      style={{ display: "block", width: "100%" }}
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
                                  <p>
                                    Had An Impact On (multiple)
                                    <InfoTooltip text="Who has been affected by your art style, if anyone?" />
                                  </p>
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
                                      style={{ display: "block", width: "100%" }}
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
                                  <p>
                                    Art Institution Attended by the Individual (multiple)
                                    <InfoTooltip text="The art school or institution you attended, if applicable." />
                                  </p>
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
                                      style={{ display: "block", width: "100%" }}
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
                                  <p>
                                    Friends/ Co-workers (multiple)
                                    <InfoTooltip text="Known artists you are friends with or work with, if applicable." />
                                  </p>
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
                                      style={{ display: "block", width: "100%" }}
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
                              </>
                            )}

                            {/* STEP 4: Account */}
                            {currentStep === 4 && (
                              <>
                                <h2 className={styles.stepTitle}>Almost there!</h2>
                                <p className={styles.stepDescription}>
                                  Create your account credentials to complete registration
                                </p>
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
                            )}

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

                {/* Floating Navigation Buttons */}
                {isRegistering && registerAsArtist && (
                  <div className={styles.floatingNavigation}>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        className={styles.backButton}
                        onClick={handlePrevStep}
                      >
                        ← Back
                      </button>
                    )}
                    {currentStep < 4 ? (
                      <button
                        type="button"
                        className={styles.nextButton}
                        onClick={handleNextStep}
                        disabled={isNextDisabled}
                      >
                        Next →
                      </button>
                    ) : (
                      <button
                        type="submit"
                        form="form-id"
                        className={styles.nextButton}
                      >
                        Submit
                      </button>
                    )}
                  </div>
                )}

                {isRegistering && !registerAsArtist && (
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
              </div>
            </div>
          </div>
        )}
        </div>
        <Footer />
      </div>

      {/* Image Editor Modal */}
      {showImageEditor && formData.image && (
        <ImageEditor
          image={formData.image}
          onSave={handleImageSave}
          onClose={() => setShowImageEditor(false)}
          onUploadNew={handleUploadNew}
        />
      )}
    </>
  );
}

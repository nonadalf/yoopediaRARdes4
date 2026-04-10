/**
 * Yoopedia - Register Logic (Final - Correct Paths)
 */
import { auth, db } from "../../firebase.js";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ===== Elements =====
const steps = document.querySelectorAll(".step");
const nextButtons = document.querySelectorAll(".nextBtn");
const prevButtons = document.querySelectorAll(".prevBtn");
let currentStep = 0;

function showStep(index) {
  steps.forEach(s => s.classList.remove("active"));
  steps[index]?.classList.add("active");
}

function validatePassword(input) {
  const value = input?.value || "";
  const ruleLetter = document.getElementById("rule-letter");
  const ruleNumber = document.getElementById("rule-number");
  const ruleLength = document.getElementById("rule-length");
  ruleLetter && (ruleLetter.checked = /[a-zA-Z]/.test(value));
  ruleNumber && (ruleNumber.checked = /\d/.test(value));
  ruleLength && (ruleLength.checked = value.length >= 10);
  return (ruleLetter?.checked && ruleNumber?.checked && ruleLength?.checked);
}

function validateStep(stepIndex) {
  const inputs = steps[stepIndex]?.querySelectorAll("input:not([type='checkbox']):not([disabled]), select") || [];
  let valid = true;
  inputs.forEach(input => {
    if (input.type === "password") {
      if (!validatePassword(input)) { input.classList.add("input-error"); valid = false; }
      else input.classList.remove("input-error");
    } else if (!input.checkValidity() || !input.value.trim()) {
      input.classList.add("input-error"); valid = false;
    } else input.classList.remove("input-error");
  });
  return valid;
}

nextButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (validateStep(currentStep) && currentStep < steps.length - 1) {
      currentStep++; showStep(currentStep); window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
});

prevButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (currentStep > 0) { currentStep--; showStep(currentStep); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });
});

document.querySelectorAll(".single-choice").forEach(cb => {
  cb.addEventListener("change", () => {
    if (cb.checked) document.querySelectorAll(".single-choice").forEach(other => { if (other !== cb) other.checked = false; });
  });
});

const passwordInput = document.getElementById("password");
passwordInput?.addEventListener("input", () => validatePassword(passwordInput));

const togglePassword = document.getElementById("togglePassword");
togglePassword?.addEventListener("click", () => {
  if (passwordInput?.type === "password") {
    passwordInput.type = "text";
    togglePassword.querySelector("i")?.classList.replace("fa-eye", "fa-eye-slash");
  } else {
    passwordInput.type = "password";
    togglePassword.querySelector("i")?.classList.replace("fa-eye-slash", "fa-eye");
  }
});

// ============================================
// 🔐 GOOGLE SIGN-UP — Mobile + Desktop
// ============================================
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function handleGoogleSignUpResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      const user = result.user;
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName || "Google User", email: user.email, photoURL: user.photoURL || "",
        provider: "google", createdAt: new Date().toISOString()
      }, { merge: true });
      console.log("✅ Google sign-up successful");
      // ✅ مسار صحيح: من signup/register/ إلى index/index.html
      window.location.href = "../../index/index.html";
    }
  } catch (error) {
    console.error("Google redirect error:", error.message);
    if (error.code === "auth/email-already-in-use") {
      alert("Email already registered. Please log in.");
      window.location.href = "../../login/login.html";
    } else alert("Google sign-up failed: " + error.message);
  }
}
document.addEventListener("DOMContentLoaded", handleGoogleSignUpResult);

async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    if (isMobileDevice()) {
      console.log("📱 Mobile: using redirect");
      await signInWithRedirect(auth, provider);
    } else {
      console.log("💻 Desktop: using popup");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName || "Google User", email: user.email, photoURL: user.photoURL || "",
        provider: "google", createdAt: new Date().toISOString()
      }, { merge: true });
      alert("✅ Signed up successfully!");
      window.location.href = "../../index/index.html";
    }
  } catch (error) {
    console.error("Google Sign Up Error:", error.message);
    if (error.code === "auth/popup-blocked") alert("Allow popups for this site.");
    else if (error.code === "auth/email-already-in-use") {
      alert("Email already registered."); window.location.href = "../../login/login.html";
    } else alert("Google sign-up failed: " + error.message);
  }
}

document.getElementById("googleSignUp")?.addEventListener("click", (e) => { e.preventDefault(); signInWithGoogle(); });

// ===== Email/Password Registration =====
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateStep(currentStep)) return;

  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;
  const name = document.getElementById("name")?.value.trim();
  const day = document.getElementById("day")?.value.trim();
  const month = document.getElementById("months")?.value;
  const year = document.getElementById("year")?.value.trim();

  let gender = "";
  const genderLabels = ["Man", "Woman", "Prefer not to say"];
  document.querySelectorAll(".single-choice").forEach((cb, i) => { if (cb.checked) gender = genderLabels[i] || ""; });

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;
    await updateProfile(user, { displayName: name });
    await sendEmailVerification(user).catch(() => {});
    await setDoc(doc(db, "users", user.uid), {
      name, email, gender, birthDate: `${day} ${month} ${year}`,
      photoURL: "", provider: "email", createdAt: new Date().toISOString(), emailVerified: user.emailVerified
    });
    alert("✅ Account created! Check your email.");
    // ✅ مسار صحيح: من signup/register/ إلى index/index.html
    window.location.href = "../../index/index.html";
  } catch (error) {
    console.error("Register error:", error.message);
    if (error.code === "auth/email-already-in-use") {
      alert("Email already registered."); window.location.href = "../../login/login.html";
    } else if (error.code === "auth/weak-password") alert("Password too weak.");
    else if (error.code === "auth/invalid-email") alert("Invalid email.");
    else alert("Registration failed: " + error.message);
  }
});
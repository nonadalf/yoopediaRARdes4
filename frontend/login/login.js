/**
 * Yoopedia - Login Logic (Final Version + Forgot Password Fix)
 * Features: Multi-step, Strict Auth, Google (Mobile/Desktop), Reset Link, Back Navigation
 */

import { auth } from "../firebase.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// ===== UI Elements =====
const steps = document.querySelectorAll(".step");
const emailNextBtn = document.getElementById("emailNextBtn");
const codeNextBtn = document.getElementById("codeNextBtn");
const skipToPassword = document.getElementById("skipToPassword");
const loginForm = document.getElementById("loginForm");
const togglePassword = document.getElementById("togglePassword");

let currentStep = 0;

// ===== Navigation Function =====
function goToStep(index) {
  steps[currentStep]?.classList.remove("active");
  currentStep = index;
  steps[currentStep]?.classList.add("active");
}

// ===== Step 1: Email & Password Reset =====
emailNextBtn?.addEventListener("click", async () => {
  const emailInput = document.getElementById("loginEmail");
  const errorMsg = emailInput?.nextElementSibling;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(emailInput?.value)) {
    emailInput?.classList.add("input-error");
    if (errorMsg) { errorMsg.textContent = "⚠️ Please enter a valid email."; errorMsg.style.display = "block"; }
    return;
  }

  emailInput?.classList.remove("input-error");
  if (errorMsg) errorMsg.style.display = "none";

  const email = emailInput.value.trim();
  console.log(`📧 Requesting password reset for: ${email}`);

  try {
    // إرسال رابط الاستعادة (يعمل فقط إذا كان البريد مسجلاً)
    await sendPasswordResetEmail(auth, email);
    alert("✅ Password reset link sent!\n📥 Please check your Inbox & Spam folder.");
    goToStep(1); // الانتقال لخطوة الكود
  } catch (error) {
    console.error("❌ Reset failed:", error.code);
    if (errorMsg) {
      if (error.code === "auth/user-not-found") errorMsg.textContent = "❌ Email not registered. Please sign up first.";
      else if (error.code === "auth/invalid-email") errorMsg.textContent = "❌ Invalid email format.";
      else if (error.code === "auth/too-many-requests") errorMsg.textContent = "⏳ Too many requests.";
      else errorMsg.textContent = "❌ Failed to send reset link.";
      errorMsg.style.display = "block";
    }
  }
});

// ===== Step 2: Verification Code (UI Demo) =====
codeNextBtn?.addEventListener("click", () => {
  console.log("ℹ️ Verification step is a UI placeholder.");
  goToStep(2);
});
skipToPassword?.addEventListener("click", () => goToStep(2));

// أزرار الرجوع (Prev Buttons)
document.querySelectorAll(".prevBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  });
});

// ========================================================
// ✅ FIX: زر "نسيت كلمة المرور" يعيدك لخطوة البريد
// ========================================================
// ⚠️ تأكد أن الرابط في HTML يحمل الكلاس "forgotPassword"
const forgotPasswordBtn = document.querySelector(".forgotPassword"); 
forgotPasswordBtn?.addEventListener("click", (e) => {
  e.preventDefault(); // منع الرابط من تحديث الصفحة
  goToStep(0); // العودة للخطوة 0 (إدخال البريد)
  console.log("🔄 Navigated back to Step 1 (Email) for password reset.");
});

// ===== Step 3: Password Login (Strict) =====
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const errorMsg = passwordInput?.closest(".formGroup")?.querySelector(".error-msg");

  if (!passwordInput?.value.trim()) {
    passwordInput?.classList.add("input-error");
    if (errorMsg) { errorMsg.textContent = "❌ Password is required."; errorMsg.style.display = "block"; }
    return;
  }

  passwordInput?.classList.remove("input-error");
  if (errorMsg) errorMsg.style.display = "none";

  const email = emailInput.value.trim();
  const pass = passwordInput.value;

  console.log(`🔑 Attempting login for: ${email}`);

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    console.log("✅ Login successful!");
    window.location.href = "../index/index.html";
  } catch (error) {
    console.error("❌ Login failed:", error.code);
    await signOut(auth).catch(() => {}); // مسح الجلسة عند الفشل

    passwordInput?.classList.add("input-error");
    if (errorMsg) errorMsg.style.display = "block";

    if (error.code === "auth/user-not-found") errorMsg.textContent = "❌ Email not registered.";
    else if (error.code === "auth/wrong-password") errorMsg.textContent = "❌ Incorrect password.";
    else if (error.code === "auth/too-many-requests") errorMsg.textContent = "⏳ Too many attempts.";
    else errorMsg.textContent = "❌ Login failed. Please try again.";
  }
});

// ===== Toggle Password Visibility =====
togglePassword?.addEventListener("click", () => {
  const pwd = document.getElementById("loginPassword");
  const icon = togglePassword.querySelector("i");
  if (pwd?.type === "password") {
    pwd.type = "text";
    icon?.classList.replace("fa-eye", "fa-eye-slash");
  } else {
    pwd.type = "password";
    icon?.classList.replace("fa-eye-slash", "fa-eye");
  }
});

// ============================================
// 🔐 Google Sign-In (Mobile & Desktop)
// ============================================
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function handleGoogleSignInResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      console.log("✅ Google sign-in successful (Redirect)");
      window.location.href = "../index/index.html";
    }
  } catch (error) { console.error("Google redirect error:", error.message); }
}
document.addEventListener("DOMContentLoaded", handleGoogleSignInResult);

document.querySelector('[data-provider="google"]')?.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    if (isMobileDevice()) {
      console.log("📱 Mobile: Using signInWithRedirect");
      await signInWithRedirect(auth, provider);
    } else {
      console.log("💻 Desktop: Using signInWithPopup");
      await signInWithPopup(auth, provider);
      window.location.href = "../index/index.html";
    }
  } catch (error) {
    console.error("Google login error:", error.message);
    if (error.code === "auth/popup-blocked") alert("🚫 Popup blocked! Allow popups.");
    else alert("Google sign-in failed: " + error.message);
  }
});
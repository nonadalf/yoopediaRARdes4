import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ===== State =====
let currentStep = 1;
let selectedType   = null;
let selectedRating = null;

// ===== DOM References =====
const steps     = document.querySelectorAll(".formStep");
const stepDots  = document.querySelectorAll(".stepDot");
const stepLines = document.querySelectorAll(".stepLine");

// ===== Go to step =====
function goToStep(n) {
  steps.forEach(s => s.classList.remove("active"));
  document.getElementById(`step${n}`).classList.add("active");

  stepDots.forEach((dot, i) => {
    dot.classList.remove("active", "done");
    if (i + 1 < n)  dot.classList.add("done");
    if (i + 1 === n) dot.classList.add("active");
  });

  stepLines.forEach((line, i) => {
    line.classList.toggle("done", i + 1 < n);
  });

  currentStep = n;
}

// ===== Step 1: Type selection =====
document.querySelectorAll(".typeCard").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".typeCard").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedType = card.dataset.type;
    document.getElementById("step1Next").disabled = false;
  });
});

document.getElementById("step1Next").addEventListener("click", () => goToStep(2));

// ===== Step 2: Details =====
document.querySelectorAll(".ratingBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".ratingBtn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedRating = parseInt(btn.dataset.rating);
  });
});

document.getElementById("step2Back").addEventListener("click", () => goToStep(1));

document.getElementById("step2Next").addEventListener("click", () => {
  const title   = document.getElementById("feedbackTitle");
  const message = document.getElementById("feedbackMessage");
  const email   = document.getElementById("feedbackEmail");
  let valid = true;

  // Title
  if (!title.value.trim()) {
    title.classList.add("input-error");
    title.nextElementSibling.style.display = "block";
    valid = false;
  } else {
    title.classList.remove("input-error");
    title.nextElementSibling.style.display = "none";
  }

  // Message
  if (!message.value.trim()) {
    message.classList.add("input-error");
    message.nextElementSibling.style.display = "block";
    valid = false;
  } else {
    message.classList.remove("input-error");
    message.nextElementSibling.style.display = "none";
  }

  // Email (optional but validate format if filled)
  if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    email.classList.add("input-error");
    email.nextElementSibling.style.display = "block";
    valid = false;
  } else {
    email.classList.remove("input-error");
    email.nextElementSibling.style.display = "none";
  }

  if (!valid) return;

  // Fill review card
  const typeLabels = {
    bug: "Bug report",
    feature: "Feature request",
    compliment: "Compliment",
    other: "Other"
  };
  const ratingLabels = ["", "😣 Very bad", "😞 Bad", "😐 Neutral", "😊 Good", "🤩 Excellent"];

  document.getElementById("reviewType").textContent    = typeLabels[selectedType] || "—";
  document.getElementById("reviewTitle").textContent   = title.value.trim();
  document.getElementById("reviewMessage").textContent = message.value.trim();
  document.getElementById("reviewRating").textContent  = selectedRating ? ratingLabels[selectedRating] : "Not rated";
  document.getElementById("reviewEmail").textContent   = email.value.trim() || "Not provided";

  goToStep(3);
});

// ===== Step 3: Submit =====
document.getElementById("step3Back").addEventListener("click", () => goToStep(2));

document.getElementById("feedbackForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

  const title   = document.getElementById("feedbackTitle").value.trim();
  const message = document.getElementById("feedbackMessage").value.trim();
  const email   = document.getElementById("feedbackEmail").value.trim();

  try {
    await addDoc(collection(db, "feedback"), {
      type:      selectedType,
      title,
      message,
      email:     email || null,
      rating:    selectedRating || null,
      userId:    auth.currentUser?.uid || "anonymous",
      createdAt: serverTimestamp()
    });

    // Show success
    document.getElementById("feedbackForm").style.display = "none";
    document.getElementById("successState").classList.add("active");

  } catch (error) {
    console.error("Feedback submit error:", error.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send feedback';
    alert("Failed to send feedback. Please try again.");
  }
});

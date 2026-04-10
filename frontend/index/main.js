/**
 * Yoopedia - Main Application Logic (Stable Version)
 * Features: Auth, Search, Popups, Featured Articles, Suggestions
 */

import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ============================================
// 🧩 POPUP MANAGEMENT
// ============================================
document.addEventListener("click", function (e) {
  const btn = e.target.closest("[data-toggle]");
  if (btn) {
    const targetClass = btn.getAttribute("data-toggle");
    const target = document.querySelector("." + targetClass);
    if (!target) return;
    document.querySelectorAll(".popup").forEach(p => { if (p !== target) p.classList.remove("active"); });
    target.classList.toggle("active");
    return;
  }
  if (e.target.closest("[data-close]")) {
    e.target.closest(".popup").classList.remove("active");
    return;
  }
  if (!e.target.closest(".popup") && !e.target.closest("[data-toggle]")) {
    document.querySelectorAll(".popup").forEach(p => p.classList.remove("active"));
  }
});

// ============================================
// 🔐 AUTH STATE MANAGEMENT
// ============================================
onAuthStateChanged(auth, (user) => {
  const profileImg = document.querySelector(".profile .btnProfile img");
  const loginLink = document.querySelector(".profileList .login");
  const loginTitle = document.querySelector(".profileList > main > h1");
  const loginDesc = document.querySelector(".profileList > main > p");

  if (user) {
    if (profileImg) {
      profileImg.src = user.photoURL || "../profile.jfif";
      profileImg.alt = user.displayName || "User";
    }
    if (loginTitle) loginTitle.style.display = "none";
    if (loginDesc) loginDesc.style.display = "none";
    if (loginLink) {
      loginLink.textContent = "Log Out";
      loginLink.href = "#";
      loginLink.onclick = async (e) => { e.preventDefault(); await signOut(auth); window.location.reload(); };
    }
  } else {
    // if (profileImg) {
    //   profileImg.src = "../profile.jfif";
    //   profileImg.alt = "Profile";
    // }
    if (loginTitle) loginTitle.style.display = "block";
    if (loginDesc) loginDesc.style.display = "block";
    if (loginLink) {
      loginLink.textContent = "Login";
      loginLink.href = "../login/login.html";
    }
  }
});

// ============================================
// 🔍 SEARCH FUNCTIONALITY
// ============================================
function performSearch() {
  const val = document.querySelector(".searchInput")?.value.trim();
  if (!val) return;
  sessionStorage.setItem("searchQuery", val);
  window.location.href = "../result/result.html";
}

window.goToResultPage = performSearch;

document.querySelector(".btnSearch")?.addEventListener("click", performSearch);
document.querySelector(".searchInput")?.addEventListener("keydown", (e) => { if (e.key === "Enter") performSearch(); });

// ============================================
// 🏷️ CATEGORY FILTER BUTTONS
// ============================================
document.querySelectorAll(".category button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".category button").forEach(b => b.blur());
    const category = btn.querySelector("span")?.textContent.trim();
    if (category && category !== "*****") {
      sessionStorage.setItem("searchQuery", category.toLowerCase());
      window.location.href = "../result/result.html";
    }
  });
});

// ============================================
// 💡 SUGGEST ARTICLE FORM
// ============================================
document.querySelector(".btnSubmit")?.addEventListener("click", async () => {
  const title = document.getElementById("articleTitle")?.value.trim();
  const category = document.getElementById("articleCategory")?.value.trim();
  const desc = document.getElementById("articleDesc")?.value.trim();

  if (!title || !category || !desc) { alert("⚠️ Please fill in all fields."); return; }

  try {
    await addDoc(collection(db, "suggestions"), {
      title, category, description: desc,
      userId: auth.currentUser?.uid || "anonymous",
      createdAt: new Date().toISOString()
    });
    alert("✅ Article suggestion submitted successfully!");
    document.getElementById("articleTitle").value = "";
    document.getElementById("articleCategory").value = "";
    document.getElementById("articleDesc").value = "";
    document.querySelector(".articleList")?.classList.remove("active");
  } catch (error) {
    console.error("Suggestion error:", error);
    alert("Failed to submit suggestion.");
  }
});

// ============================================
// ⭐ LOAD FEATURED ARTICLES
// ============================================
async function loadFeaturedArticles() {
  const container = document.querySelector(".starArticle .boxes");
  if (!container) return;

  try {
    const q = query(collection(db, "articles"), limit(5));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    container.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      let text = data.title || "Article";
      if (text.length > 20) text = text.slice(0, 20) + "...";

      const box = document.createElement("div");
      box.className = "box";
      box.textContent = text;
      box.style.cursor = "pointer";
      box.title = data.title;
      box.addEventListener("click", () => {
        window.location.href = `../article/article.html?id=${docSnap.id}`;
      });
      container.appendChild(box);
    });
  } catch (error) {
    console.error("Error loading featured articles:", error);
  }
}
document.addEventListener("DOMContentLoaded", loadFeaturedArticles);

// ============================================
// 🌱 PLACEHOLDERS
// ============================================
document.querySelector(".btnWater")?.addEventListener("click", () => {
  const img = document.querySelector(".plantPop img");
  if (img) {
    img.style.transform = "scale(1.1)";
    setTimeout(() => { img.style.transform = "scale(1)"; alert("🌱 Plant watered!"); }, 300);
  }
});
document.querySelector(".keybor")?.addEventListener("click", () => console.log("⌨️ Virtual keyboard — coming soon"));
document.querySelector(".customSearch")?.addEventListener("click", () => console.log("✨ Magic search — coming soon"));
import { auth, db } from "../firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// ===== Get article ID from URL =====
const params    = new URLSearchParams(window.location.search);
const articleId = params.get("id");

// ===== Load article =====
async function loadArticle() {
  if (!articleId) {
    document.querySelector(".headerArticle h1").textContent = "Article not found";
    return;
  }

  try {
    const docRef  = doc(db, "articles", articleId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      document.querySelector(".headerArticle h1").textContent = "Article not found";
      return;
    }

    const data = docSnap.data();

    // Title
    document.querySelector(".headerArticle h1").textContent = data.title || "Untitled";

    // Page title
    document.title = `${data.title} - Yoopedia`;

    // Content
    const mainArticle = document.querySelector(".mainArticle");
    if (mainArticle) {
      mainArticle.innerHTML = data.content
        ? `<p>${data.content.replace(/\n/g, "</p><p>")}</p>`
        : "<p>No content available.</p>";
    }

    // References
    if (data.references && data.references.length > 0) {
      const half    = Math.ceil(data.references.length / 2);
      const leftOl  = document.querySelector(".leftol ol");
      const rightOl = document.querySelector(".rightol ol");

      if (leftOl && rightOl) {
        leftOl.innerHTML = "";
        rightOl.innerHTML = "";

        data.references.slice(0, half).forEach((ref, i) => {
          leftOl.innerHTML += `<li><a href="${ref.url || "#"}" target="_blank">${ref.title || ref}</a></li>`;
        });

        data.references.slice(half).forEach((ref, i) => {
          rightOl.innerHTML += `<li><a href="${ref.url || "#"}" target="_blank">${ref.title || ref}</a></li>`;
        });

        // update start for right column
        const rightOlEl = document.querySelector(".rightol ol");
        if (rightOlEl) rightOlEl.setAttribute("start", half + 1);
      }
    }

  } catch (error) {
    console.error("Load article error:", error.message);
    document.querySelector(".headerArticle h1").textContent = "Error loading article.";
  }
}

loadArticle();

// ===== Bookmark button =====
const bookmarkBtn = document.querySelector(".articleBtn[title='Bookmark']");
if (bookmarkBtn) {
  bookmarkBtn.addEventListener("click", () => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        alert("Please log in to bookmark articles.");
        return;
      }
      // في المستقبل: أضف/احذف من مصفوفة bookmarks في Firestore
      const icon = bookmarkBtn.querySelector("i");
      icon.classList.toggle("fa-regular");
      icon.classList.toggle("fa-solid");
      console.log("Bookmark toggled for article:", articleId);
    });
  });
}

// ===== Share button =====
const shareBtn = document.querySelector(".articleBtn[title='Share']");
if (shareBtn) {
  shareBtn.addEventListener("click", async () => {
    const url   = window.location.href;
    const title = document.querySelector(".headerArticle h1")?.textContent || "Yoopedia Article";

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url).then(() => {
        alert("Link copied to clipboard!");
      });
    }
  });
}

// ===== Search bar in article page =====
const searchInput = document.querySelector("header .midl .searchBar input");
if (searchInput) {
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = e.target.value.trim();
      if (q) {
        sessionStorage.setItem("searchQuery", q);
        sessionStorage.removeItem("searchCategory");
        window.location.href = "../result/result.html";
      }
    }
  });
}
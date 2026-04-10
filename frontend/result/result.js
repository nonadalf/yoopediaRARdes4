

/**
 * Simple Text Search Engine - Academic Project
 * Algorithm: Weighted Keyword Matching (Title: 3pts, Content: 1pt)
 * Results: Top 5 only, sorted by relevance then date
 * Note: No external RI libraries used - pure JS logic
 */






import { db } from "../firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
// تفريغ فلتر التصنيف إذا كان البحث جديداً من شريط البحث
if (sessionStorage.getItem("searchQuery") && !sessionStorage.getItem("searchCategoryFromBtn")) {
  sessionStorage.removeItem("searchCategory");
}
// ===== استرجاع مصطلح البحث من الجلسة =====
const searchQuery = sessionStorage.getItem("searchQuery") || "";
const searchInput = document.querySelector("header .midl .searchBar input");
if (searchInput) searchInput.value = searchQuery;

const resultsInfo = document.querySelector(".resultsInfo");
const ol = document.querySelector(".result5 ol");

// ===== محرك البحث الذكي والبسيط =====
async function smartSearch() {
  if (!ol) return;
  ol.innerHTML = "<li style='color:#888;'>Searching...</li>";

  try {
    // 1️⃣ جلب المقالات (سريع جداً لـ ~300 مقالة)
    const snapshot = await getDocs(collection(db, "articles"));
    const allArticles = [];
    snapshot.forEach(doc => allArticles.push({ id: doc.id, ...doc.data() }));

    if (allArticles.length === 0) {
      ol.innerHTML = "<li style='color:#888;'>No articles found in database.</li>";
      return;
    }

    // 2️⃣ تفكيك جملة البحث إلى كلمات منفصلة (مثال: "history of algeria" -> ["history", "of", "algeria"])
    const keywords = searchQuery.toLowerCase().trim().split(/\s+/).filter(k => k.length > 0);

    // 3️⃣ نظام النقاط البسيط (بدون خوارزميات RI معقدة)
    const ranked = allArticles
      .map(article => {
        let score = 0;
        const title = (article.title || "").toLowerCase();
        const content = (article.content || "").toLowerCase();

        keywords.forEach(word => {
          if (title.includes(word)) score += 3;      // مطابقة في العنوان = أولوية عالية
          else if (content.includes(word)) score += 1; // مطابقة في المحتوى = أولوية منخفضة
        });

        return { ...article, score };
      })
      .filter(a => a.score > 0) // الاحتفاظ فقط بالمقالات التي تحتوي على كلمة واحدة على الأقل
      .sort((a, b) => {
        // الترتيب: الأعلى نقاطاً أولاً ⬇️
        if (b.score !== a.score) return b.score - a.score;
        // إذا تساوت النقاط، الأحدث تاريخاً يظهر أولاً
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      })
      .slice(0, 5); // ✅ إخراج أول 5 نتائج جيدة فقط (مطابق لشرط المشروع)

    // 4️⃣ عرض النتائج في الواجهة
    if (ranked.length === 0) {
      ol.innerHTML = `<li style="color:#888;">No results found for "${searchQuery}"</li>`;
      if (resultsInfo) resultsInfo.innerHTML = `Search for <strong>"${searchQuery}"</strong> — 0 results`;
      return;
    }

    if (resultsInfo) {
      resultsInfo.innerHTML = `Search for <strong>"${searchQuery}"</strong> — ${ranked.length} result${ranked.length > 1 ? "s" : ""} found`;
    }

    ol.innerHTML = "";
    ranked.forEach(article => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="../article/article.html?id=${article.id}">${article.title}</a>`;
      ol.appendChild(li);
    });

  } catch (error) {
    console.error("Search error:", error);
    ol.innerHTML = `<li style="color:red;">Error loading results. Check connection & Firestore rules.</li>`;
  }
}

// تشغيل البحث فور تحميل الصفحة
smartSearch();

// ===== إعادة البحث عند الضغط على Enter في شريط النتائج =====
if (searchInput) {
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const newQuery = e.target.value.trim();
      if (newQuery) {
        sessionStorage.setItem("searchQuery", newQuery);
        window.location.reload();
      }
    }
  });
}

// ===== أزرار الصفحات (تأثير بصري فقط حالياً) =====
document.querySelectorAll(".pages button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".pages button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});
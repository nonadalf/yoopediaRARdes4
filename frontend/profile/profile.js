/**
 * Yoopedia - Profile Logic (Final Robust Version)
 */
import { auth, db } from "../firebase.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// تهيئة Storage بأمان
let storage;
try {
  storage = getStorage();
  console.log("✅ Storage initialized");
} catch (e) {
  console.warn("⚠️ Storage initialization failed:", e.message);
}

let isEditing = false;
let tempPhotoFile = null;

document.addEventListener("DOMContentLoaded", () => {
  const applyBtn = document.querySelector(".applyBtn");
  const editBtns = document.querySelectorAll(".editBtn");
  const avatarEdit = document.querySelector(".avatarEdit");
  
  // حقل رفع الصور المخفي
  const avatarInput = document.createElement("input");
  avatarInput.type = "file";
  avatarInput.accept = "image/*";
  avatarInput.style.display = "none";
  document.body.appendChild(avatarInput);

  if (applyBtn) applyBtn.style.display = "none";

  // ==========================================
  // 1. تحميل بيانات المستخدم
  // ==========================================
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "../login/login.html";
      return;
    }

    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      const userData = docSnap.exists() ? docSnap.data() : {};

      document.getElementById("userName").textContent = user.displayName || userData.name || "No Name";
      document.getElementById("userEmail").textContent = user.email || userData.email || "No Email";

      const createdEl = document.getElementById("userCreated");
      if (createdEl) {
        const dateVal = userData.createdAt || user.metadata?.creationTime;
        createdEl.textContent = dateVal
          ? new Date(dateVal).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          : "—";
      }

      const photoURL = user.photoURL || "img/profilephoto.jfif";
      document.getElementById("avatarSmall").src = photoURL;
      document.getElementById("avatarLarge").src = photoURL;

    } catch (error) {
      console.error("❌ Error loading user data:", error);
    }
  });

  // ==========================================
  // 2. تفعيل وضع التعديل
  // ==========================================
  editBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.textContent.includes("Edit name") || btn.textContent.includes("Edit email")) {
        isEditing = true;
        if (applyBtn) applyBtn.style.display = "flex";
        editBtns.forEach(b => b.style.display = "none");
        convertToInputs();
      }
    });
  });

  // ==========================================
  // 3. اختيار ومعاينة الصورة
  // ==========================================
  avatarEdit?.addEventListener("click", () => avatarInput.click());
  
  avatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      tempPhotoFile = file;
      const preview = URL.createObjectURL(file);
      document.getElementById("avatarSmall").src = preview;
      document.getElementById("avatarLarge").src = preview;
      avatarEdit.innerHTML = '<i class="fa-solid fa-check"></i>';
      avatarEdit.style.backgroundColor = "var(--secirndly-bg-btn)";
    }
  });

  // ==========================================
  // 4. زر Apply - الحفظ (النسخة المُحصّنة)
  // ==========================================
  applyBtn?.addEventListener("click", async () => {
    if (!isEditing && !tempPhotoFile) return;
    const user = auth.currentUser;
    if (!user) return;

    const nameInput = document.getElementById("editNameInput");
    const emailInput = document.getElementById("editEmailInput");
    const newName = nameInput?.value.trim();
    const newEmail = emailInput?.value.trim();

    if (!newName || !newEmail) {
      alert("⚠️ يرجى ملء جميع الحقول");
      return;
    }

    // ✅ تفعيل حالة التحميل
    const originalBtnContent = applyBtn.innerHTML;
    applyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
    applyBtn.disabled = true;
    console.log("🔄 [DEBUG] Save process started");

    try {
      let finalPhotoURL = user.photoURL;

      // 🔹 خطوة 1: رفع الصورة (مع عزل الأخطاء)
      if (tempPhotoFile && storage) {
        try {
          console.log("📤 [DEBUG] Uploading image...");
          
          // مهلة زمنية: إذا تجاوز الرفع 10 ثوانٍ، نعتبره فاشلاً
          const uploadPromise = (async () => {
            const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}`);
            const snapshot = await uploadBytes(storageRef, tempPhotoFile);
            return await getDownloadURL(snapshot.ref);
          })();
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Upload timeout")), 10000)
          );
          
          finalPhotoURL = await Promise.race([uploadPromise, timeoutPromise]);
          console.log("✅ [DEBUG] Image uploaded:", finalPhotoURL);
          
        } catch (storageErr) {
          console.error("⚠️ [DEBUG] Image upload failed/skipped:", storageErr.message);
          alert("⚠️ تم حفظ البيانات النصية، لكن فشل رفع الصورة. تأكد من تفعيل Storage في Firebase Console.");
          // نستمر في الحفظ حتى مع فشل الصورة
        }
      } else if (tempPhotoFile && !storage) {
        console.warn("⚠️ Storage not initialized");
        alert("⚠️ خدمة التخزين غير مفعلة. سيتم حفظ البيانات بدون الصورة الجديدة.");
      }

      // 🔹 خطوة 2: تحديث بيانات المصادقة (Auth)
      console.log("🔐 [DEBUG] Updating Auth profile...");
      await updateProfile(user, { 
        displayName: newName, 
        photoURL: finalPhotoURL 
      });
      console.log("✅ [DEBUG] Auth profile updated");

      // 🔹 خطوة 3: تحديث Firestore
      console.log("🗄️ [DEBUG] Updating Firestore...");
      await setDoc(doc(db, "users", user.uid), {
        name: newName,
        email: newEmail,
        photoURL: finalPhotoURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log("✅ [DEBUG] Firestore updated");

      // 🔹 خطوة 4: تحديث الواجهة
      document.getElementById("userName").textContent = newName;
      document.getElementById("userEmail").textContent = newEmail;
      document.getElementById("avatarSmall").src = finalPhotoURL;
      document.getElementById("avatarLarge").src = finalPhotoURL;

      revertToViewMode();
      alert("✅ تم تحديث الملف الشخصي بنجاح!");
      console.log("🎉 [DEBUG] Save completed successfully");

    } catch (error) {
      console.error("❌ [DEBUG] Critical save error:", error.code, error.message);
      alert("❌ حدث خطأ غير متوقع: " + (error.message || "يرجى المحاولة لاحقاً"));
    } finally {
      // 🔑 هذا السطر يضمن توقف الدوران دائماً
      console.log("🛑 [DEBUG] Resetting button state");
      applyBtn.innerHTML = originalBtnContent;
      applyBtn.disabled = false;
    }
  });

  // ==========================================
  // دوال مساعدة
  // ==========================================
  function convertToInputs() {
    const nameEl = document.getElementById("userName");
    const emailEl = document.getElementById("userEmail");
    const inputStyle = "background:#fff; border:2px solid #d3d3d3; border-radius:0.8em; padding:0.4em 0.6em; font-family:inherit; font-size:0.875rem; color:inherit; width:100%; max-width:220px; outline:none;";

    if (nameEl) nameEl.innerHTML = `<input id="editNameInput" value="${nameEl.textContent}" style="${inputStyle}">`;
    if (emailEl) emailEl.innerHTML = `<input id="editEmailInput" type="email" value="${emailEl.textContent}" style="${inputStyle}">`;
  }

  function revertToViewMode() {
    isEditing = false;
    tempPhotoFile = null;
    if (applyBtn) applyBtn.style.display = "none";
    editBtns.forEach(btn => btn.style.display = "flex");
    if (avatarEdit) {
      avatarEdit.innerHTML = '<i class="fa-solid fa-camera"></i>';
      avatarEdit.style.backgroundColor = "#1f2937";
    }
  }
});

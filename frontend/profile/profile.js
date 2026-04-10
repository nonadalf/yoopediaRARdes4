import { auth, db } from "../firebase.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// تهيئة Storage بأمان
let storage;
try {
  storage = getStorage();
} catch (e) {
  console.warn("⚠️ Storage غير مُفعّل في firebase.js، رفع الصور سيتعطل مؤقتاً.");
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
      // ✅ تم إزالة المسافات الزائدة نهائياً
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
      console.error("❌ خطأ في تحميل البيانات:", error);
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
      document.getElementById("avatarSmall").src = URL.createObjectURL(file);
      document.getElementById("avatarLarge").src = URL.createObjectURL(file);
      avatarEdit.innerHTML = '<i class="fa-solid fa-check"></i>';
      avatarEdit.style.backgroundColor = "var(--accent)";
    }
  });

  // ==========================================
  // 4. زر Apply - الحفظ مع حلقة التحميل
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

    try {
      // ✅ إظهار حلقة التحميل أثناء المعالجة
      applyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
      applyBtn.disabled = true;

      let finalPhotoURL = user.photoURL;

      // محاولة رفع الصورة إذا وجدت
      if (tempPhotoFile && storage) {
        try {
          const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}`);
          const snapshot = await uploadBytes(storageRef, tempPhotoFile);
          finalPhotoURL = await getDownloadURL(snapshot.ref);
        } catch (storageErr) {
          console.error("❌ فشل رفع الصورة:", storageErr);
          alert("⚠️ تم تحديث البيانات النصية، لكن فشل رفع الصورة. تأكد من تفعيل Storage Rules في Firebase Console.");
        }
      } else if (tempPhotoFile && !storage) {
        alert("⚠️ خدمة التخزين غير مفعلة في الكود. أضف export const storage = getStorage(app); في firebase.js");
      }

      // تحديث بيانات الدخول
      await updateProfile(user, { displayName: newName, photoURL: finalPhotoURL });

      // تحديث Firestore (ينشئ المستند أو يعدله بأمان)
      await setDoc(doc(db, "users", user.uid), {
        name: newName,
        email: newEmail,
        photoURL: finalPhotoURL,
        updatedAt: new Date()
      }, { merge: true });

      // تحديث الواجهة
      document.getElementById("userName").textContent = newName;
      document.getElementById("userEmail").textContent = newEmail;
      document.getElementById("avatarSmall").src = finalPhotoURL;
      document.getElementById("avatarLarge").src = finalPhotoURL;

      revertToViewMode();
      alert("✅ تم تحديث الملف الشخصي بنجاح!");

    } catch (error) {
      console.error("❌ فشل التحديث:", error);
      alert("❌ حدث خطأ: " + error.message);
    } finally {
      // ✅ إعادة الزر لوضعه الطبيعي بعد الانتهاء
      applyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Apply';
      applyBtn.disabled = false;
    }
  });

  // ==========================================
  // دوال مساعدة للحفاظ على التصميم
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
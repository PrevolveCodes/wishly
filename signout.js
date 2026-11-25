import { mountNotifications } from "./notifications.js?v=account-buttons-1";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyANtZF9yXTg3bvUWMFAPRwyE798av2gzl0",
  authDomain: "wishly-fd9ff.firebaseapp.com",
  projectId: "wishly-fd9ff",
  storageBucket: "wishly-fd9ff.firebasestorage.app",
  messagingSenderId: "250113116782",
  appId: "1:250113116782:web:c84ed484cacb2b029df47f",
  measurementId: "G-EG1Z8P6MZW"
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let disposeNotifications = null;
onAuthStateChanged(auth, async user => {
  if (!user || user.isAnonymous) { disposeNotifications?.(); disposeNotifications = null; document.getElementById("wishly-account-controls")?.remove(); return; }
  const sidebarBottom = document.querySelector(".sidebar-bottom");
  if (!sidebarBottom || document.getElementById("wishly-account-controls") || !user || user.isAnonymous) return;
  const controls = document.createElement("div");
  controls.id = "wishly-account-controls";
  controls.className = "wishly-account-controls";
  controls.innerHTML = `
    <div class="wishly-profile-button">
      <img class="wishly-profile-avatar" alt="">
      <span class="wishly-profile-copy"><strong class="wishly-profile-name">Your profile</strong></span>
    </div>
    <a class="wishly-settings-button wishly-account-icon-button" href="settings.html" aria-label="Settings" title="Settings">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill-rule="evenodd" d="M9.2 5.1 Q9.75 4.45 10.05 2.95 Q10.05 2.95 10.5 2.5 L13.5 2.5 Q13.95 2.95 14.25 4.45 Q14.25 4.45 14.8 5.1 
          A7.45 7.45 0 0 1 16.58 6.13 Q17.41 6.28 18.86 5.79 Q18.86 5.79 19.48 5.95 L20.98 8.55 Q20.81 9.16 19.66 10.17 Q19.66 10.17 19.38 10.97 
          A7.45 7.45 0 0 1 19.38 13.03 Q19.66 13.83 20.81 14.84 Q20.81 14.84 20.98 15.45 L19.48 18.05 Q18.86 18.21 17.41 17.72 Q17.41 17.72 16.58 17.87 
          A7.45 7.45 0 0 1 14.8 18.9 Q14.25 19.55 13.95 21.05 Q13.95 21.05 13.5 21.5 L10.5 21.5 Q10.05 21.05 9.75 19.55 Q9.75 19.55 9.2 18.9 
          A7.45 7.45 0 0 1 7.42 17.87 Q6.59 17.72 5.14 18.21 Q5.14 18.21 4.52 18.05 L3.02 15.45 Q3.19 14.84 4.34 13.83 Q4.34 13.83 4.62 13.03 
          A7.45 7.45 0 0 1 4.62 10.97 Q4.34 10.17 3.19 9.16 Q3.19 9.16 3.02 8.55 L4.52 5.95 Q5.14 5.79 6.59 6.28 Q6.59 6.28 7.42 6.13 
          A7.45 7.45 0 0 1 9.2 5.1 Z
          M15.3 12 a3.3 3.3 0 1 1 -6.6 0 a3.3 3.3 0 0 1 6.6 0 Z"/>
      </svg>
    </a>`;
  const settingsButton = controls.querySelector(".wishly-settings-button");
  if (settingsButton) {
    settingsButton.href = "dashboard.html?view=settings";
    settingsButton.dataset.dashboardView = "settings";
    settingsButton.setAttribute("aria-label", "Settings");
    settingsButton.title = "Settings";
  }
  const premium = sidebarBottom.querySelector(".sidebar-premium");
  if (premium) sidebarBottom.insertBefore(controls, premium); else sidebarBottom.prepend(controls);
  disposeNotifications = mountNotifications(db, user, controls, settingsButton);
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const profile = snap.exists() ? snap.data() : {};
    const name = profile.displayName || user.displayName || (user.email ? user.email.split("@")[0] : "Your profile");
    controls.querySelector(".wishly-profile-name").textContent = name;
    const avatar = controls.querySelector(".wishly-profile-avatar");
    const photo = profile.photoURL || user.photoURL || "";
    if (photo && /^https:\/\//i.test(photo)) { avatar.src = photo; avatar.alt = name + " profile picture"; }
    else {
      avatar.remove();
      const fallback = document.createElement("span");
      fallback.className = "wishly-profile-avatar wishly-profile-fallback";
      fallback.textContent = (name.trim()[0] || "W").toUpperCase();
      fallback.setAttribute("aria-hidden", "true");
      controls.querySelector(".wishly-profile-button").prepend(fallback);
    }
  } catch (error) {
    console.warn("Could not load Wishly profile details", error);
    controls.querySelector(".wishly-profile-name").textContent = user.displayName || "Your profile";
  }
});
const dialog = document.getElementById("signout-dialog");
const openButton = document.getElementById("settings-sign-out");
const cancelButton = document.getElementById("signout-cancel");
const confirmButton = document.getElementById("signout-confirm");

openButton?.addEventListener("click", () => dialog?.showModal());
cancelButton?.addEventListener("click", () => dialog?.close());
dialog?.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
confirmButton?.addEventListener("click", async () => {
  confirmButton.disabled = true;
  confirmButton.textContent = "Signing out…";
  try {
    await signOut(auth);
    window.location.href = "signup.html";
  } catch (error) {
    console.error("Wishly sign-out failed", error);
    confirmButton.disabled = false;
    confirmButton.textContent = "Sign out";
    const message = document.getElementById("signout-error");
    if (message) message.textContent = "Could not sign out. Check your connection and try again.";
  }
});

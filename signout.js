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

onAuthStateChanged(auth, async user => {
  const sidebarBottom = document.querySelector(".sidebar-bottom");
  if (!sidebarBottom || document.getElementById("wishly-account-controls") || !user || user.isAnonymous) return;
  const controls = document.createElement("div");
  controls.id = "wishly-account-controls";
  controls.className = "wishly-account-controls";
  controls.innerHTML = '<a class="wishly-profile-button" href="profile.html"><img class="wishly-profile-avatar" alt=""><span class="wishly-profile-copy"><strong class="wishly-profile-name">Your profile</strong><small class="wishly-profile-handle">Edit your profile</small></span></a><a class="wishly-settings-button" href="settings.html" aria-label="Settings" title="Settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"/></svg></a>';
  const premium = sidebarBottom.querySelector(".sidebar-premium");
  if (premium) sidebarBottom.insertBefore(controls, premium); else sidebarBottom.prepend(controls);
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const profile = snap.exists() ? snap.data() : {};
    const name = profile.displayName || user.displayName || (user.email ? user.email.split("@")[0] : "Your profile");
    controls.querySelector(".wishly-profile-name").textContent = name;
    controls.querySelector(".wishly-profile-handle").textContent = profile.username ? "@" + profile.username : "Set up your profile";
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
const openButton = document.getElementById("sidebar-sign-out");
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

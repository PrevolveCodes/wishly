import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

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

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, OAuthProvider, signInWithPopup, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyANtZF9yXTg3bvUWMFAPRwyE798av2gzl0",
  authDomain: "wishly-fd9ff.firebaseapp.com",
  projectId: "wishly-fd9ff",
  storageBucket: "wishly-fd9ff.firebasestorage.app",
  messagingSenderId: "250113116782",
  appId: "1:250113116782:web:c84ed484cacb2b029df47f",
  measurementId: "G-EG1Z8P6MZW"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const $ = selector => document.querySelector(selector);
const form = $("#account-form");
const submit = $("#account-submit");
const toggle = $("#account-toggle");
const googleButton = $("#google-sign-in");
const appleButton = $("#apple-sign-in");
const status = $("#account-status");
const notice = $("#notice");
let mode = "signup";
function toast(message) {
  notice.textContent = message;
  notice.classList.remove("hidden");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => notice.classList.add("hidden"), 5000);
}
function friendlyError(error) {
  const messages = {
    "auth/email-already-in-use": "That email already has an account. Choose Sign in instead.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account was found for that email.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Wait a little and try again.",
    "auth/popup-closed-by-user": "Sign-in was cancelled. You can try again.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication yet.",
    "auth/unsupported-provider": "This sign-in provider is not configured for this app yet.",
    "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
    "auth/unauthorized-domain": "This website domain is not authorized in Firebase Authentication settings."
  };
  return messages[error?.code] || error?.message || "Something went wrong. Please try again.";
}
function updateMode() {
  const signup = mode === "signup";
  $("#signup-heading").innerHTML = signup ? "Make your account<span>.</span>" : "Welcome back<span>.</span>";
  $("#signup-description").textContent = signup ? "Create an account to build and manage your wishlists." : "Sign in to get back to your wishlists.";
  submit.innerHTML = signup ? "Create account <span>→</span>" : "Sign in <span>→</span>";
  toggle.textContent = signup ? "Already have an account? Sign in" : "Need an account? Create one";
  $("#account-password").autocomplete = signup ? "new-password" : "current-password";
}
onAuthStateChanged(auth, user => {
  if (user && !user.isAnonymous) {
    status.textContent = "Signed in as " + (user.email || "your Google account") + ".";
    submit.textContent = "Account signed in";
    submit.disabled = true;
    toggle.classList.add("hidden");
    googleButton.classList.add("hidden");
    appleButton.classList.add("hidden");
    form.querySelectorAll("label,input").forEach(el => el.classList.add("hidden"));
  }
});
toggle.addEventListener("click", () => { mode = mode === "signup" ? "signin" : "signup"; updateMode(); });
form.addEventListener("submit", async event => {
  event.preventDefault();
  submit.disabled = true;
  try {
    const email = $("#account-email").value.trim();
    const password = $("#account-password").value;
    if (mode === "signup") await createUserWithEmailAndPassword(auth, email, password);
    else await signInWithEmailAndPassword(auth, email, password);
    status.textContent = "Account ready. You can now manage your wishlists.";
    toast("Account ready. Returning to Wishly…");
    window.location.href = "dashboard.html";
  } catch (error) {
    toast(friendlyError(error));
    submit.disabled = false;
  }
});
googleButton.addEventListener("click", async () => {
  googleButton.disabled = true;
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
    toast("Signed in with Google. Returning to Wishly…");
    window.location.href = "dashboard.html";
  } catch (error) {
    toast(friendlyError(error));
    googleButton.disabled = false;
  }
});

appleButton.addEventListener("click", async () => {
  appleButton.disabled = true;
  try {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    await signInWithPopup(auth, provider);
    toast("Signed in with Apple. Returning to Wishly…");
    window.location.href = "dashboard.html";
  } catch (error) {
    toast(friendlyError(error));
    appleButton.disabled = false;
  }
});

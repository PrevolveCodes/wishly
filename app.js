import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  deleteDoc, updateDoc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
const db = getFirestore(app);
const $ = (selector, root = document) => root.querySelector(selector);
const createForm = $("#create-form");
const viewForm = $("#view-form");
const workspace = $("#workspace");
const notice = $("#notice");
const dialog = $("#item-dialog");
const itemForm = $("#item-form");
const accountForm = $("#account-form");
const accountStatus = $("#account-status");
const accountSubmit = $("#account-submit");
const accountToggle = $("#account-toggle");
const signOutButton = $("#sign-out");
const googleSignInButton = $("#google-sign-in");
let accountMode = "signup";
let activeListId = null;
let activeMode = "owner";
let activeItemDocs = [];
let activeList = null;
let noticeTimer;

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl = value => {
  try { const url = new URL(value); return ["https:","http:"].includes(url.protocol) ? url.href : ""; }
  catch { return ""; }
};
function toast(message) {
  notice.textContent = message;
  notice.classList.remove("hidden");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice.classList.add("hidden"), 4000);
}
function friendlyError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/email-already-in-use": "That email already has an account. Choose Sign in instead.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account was found for that email.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/too-many-requests": "Too many attempts. Wait a little and try again.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled. You can try again.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.",
    "auth/unauthorized-domain": "This website domain is not authorized in Firebase Authentication settings.",
    "permission-denied": "Firebase blocked this action. Check that the Firestore rules have been published.",
    "unavailable": "Firebase is temporarily unavailable. Check your connection and try again."
  };
  return messages[code] || error?.message || "Something went wrong. Please try again.";
}
function setAccountUi(user) {
  const accountFields = accountForm.querySelectorAll("label, input");
  accountFields.forEach(field => field.classList.toggle("hidden", !!user));
  googleSignInButton.classList.toggle("hidden", !!user);
  if (user && !user.isAnonymous) {
    accountStatus.textContent = `Signed in as ${user.email}`;
    accountSubmit.classList.add("hidden");
    accountToggle.classList.add("hidden");
    signOutButton.classList.remove("hidden");
    createForm.querySelector('button[type="submit"]').disabled = false;
    createForm.querySelector('button[type="submit"]').textContent = "Create a wishlist →";
  } else {
    accountStatus.textContent = user?.isAnonymous ? "Gift-giver session active" : "Sign in or create an account to manage wishlists.";
    accountSubmit.classList.toggle("hidden", !!user?.isAnonymous);
    accountToggle.classList.toggle("hidden", !!user?.isAnonymous);
    signOutButton.classList.toggle("hidden", !user);
    createForm.querySelector('button[type="submit"]').disabled = true;
    createForm.querySelector('button[type="submit"]').textContent = "Sign in to create a wishlist";
  }
}
onAuthStateChanged(auth, user => setAccountUi(user));

accountToggle.addEventListener("click", () => {
  accountMode = accountMode === "signup" ? "signin" : "signup";
  accountSubmit.textContent = accountMode === "signup" ? "Create account" : "Sign in";
  accountToggle.textContent = accountMode === "signup" ? "Already have an account? Sign in" : "Need an account? Create one";
  $("#account-password").autocomplete = accountMode === "signup" ? "new-password" : "current-password";
});
accountForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = String($("#account-email").value || "").trim();
  const password = String($("#account-password").value || "");
  accountSubmit.disabled = true;
  try {
    if (accountMode === "signup") await createUserWithEmailAndPassword(auth, email, password);
    else await signInWithEmailAndPassword(auth, email, password);
    accountForm.reset();
    toast(accountMode === "signup" ? "Account created. You can now make your wishlist." : "Signed in. You can now manage your wishlists.");
  } catch (error) { toast(friendlyError(error)); }
  finally { accountSubmit.disabled = false; }
});
googleSignInButton.addEventListener("click", async () => {
  googleSignInButton.disabled = true;
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
    toast("Signed in with Google. You can now manage your wishlists.");
  } catch (error) { toast(friendlyError(error)); }
  finally { googleSignInButton.disabled = false; }
});
signOutButton.addEventListener("click", async () => {
  try { await signOut(auth); workspace.classList.add("hidden"); toast("Signed out."); }
  catch (error) { toast(friendlyError(error)); }
});

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}
async function copyText(text, success) {
  try { await navigator.clipboard.writeText(text); toast(success); }
  catch {
    const field = document.createElement("textarea");
    field.value = text; document.body.append(field); field.select();
    const copied = document.execCommand("copy"); field.remove();
    toast(copied ? success : "Copy was blocked. Please select and copy the text.");
  }
}
async function loadItems(code) {
  const snap = await getDocs(query(collection(db, "wishlists", code, "items"), orderBy("createdAt", "asc")));
  return snap.docs.map(itemDoc => ({ id: itemDoc.id, ...itemDoc.data() }));
}
async function loadPurchases(code, items, isGift) {
  if (!isGift) return {};
  const pairs = await Promise.all(items.map(async item => {
    const snap = await getDoc(doc(db, "wishlists", code, "purchases", item.id));
    return [item.id, snap.exists() ? Boolean(snap.data().purchased) : false];
  }));
  return Object.fromEntries(pairs);
}
async function openWorkspace(list, mode) {
  activeListId = list.code;
  activeMode = mode;
  activeList = list;
  const owner = mode === "owner";
  try {
    const items = await loadItems(list.code);
    activeItemDocs = items;
    const purchases = await loadPurchases(list.code, items, !owner);
    workspace.innerHTML = `
      <div class="workspace-head">
        <div><div class="eyebrow">${owner ? "YOUR WISHLIST" : "A WISHLIST FOR SOMEONE"}</div><h2>${escapeHtml(list.title)}</h2><p class="workspace-sub">${escapeHtml(list.ownerName)} · ${escapeHtml(list.occasion)}</p></div>
        <div class="code-chip" title="Wishlist code">${escapeHtml(list.code)} ${owner ? '<button class="small-button" id="copy-code" type="button">Copy</button>' : ""}</div>
      </div>
      ${owner ? '<p class="workspace-sub">Keep this code safe and share it with your gift-givers. Add your first item below.</p><div class="workspace-actions"><button class="button button-primary" id="add-item" type="button" style="width:auto;margin:0;gap:22px">Add an item <span>+</span></button><button class="small-button" id="copy-share" type="button">Copy sharing message</button></div>' : '<p class="workspace-sub">Here are the gift ideas. Mark an item purchased to help other gift-givers avoid duplicates.</p>'}
      <div class="item-list">${items.length ? items.map((item, index) => {
        const purchased = Boolean(purchases[item.id]);
        const url = safeUrl(item.url);
        return `<article class="wish-item ${!owner && purchased ? "purchased" : ""}">
          <div class="item-placeholder" aria-hidden="true">${!owner && purchased ? "✓" : "♡"}</div>
          <div class="item-info"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.priority || "Would love")}${item.notes ? " · " + escapeHtml(item.notes) : ""}</p>${url ? '<a class="item-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">View at store ↗</a>' : ""}</div>
          ${item.price !== "" && item.price != null ? '<div class="item-price">$' + Number(item.price).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) + "</div>" : ""}
          ${owner ? '<button class="small-button remove-item" data-index="' + index + '" type="button">Remove</button>' : '<button class="small-button toggle-purchased" data-index="' + index + '" type="button" aria-pressed="' + purchased + '">' + (purchased ? "Marked purchased ✓" : "Mark purchased") + "</button>"}
        </article>`;
      }).join("") : '<div class="empty-state">No items yet. Check back later.</div>'}</div>
      ${!owner ? '<p class="workspace-sub" style="margin-top:16px">Purchase information is stored separately from the wishlist items.</p>' : ""}
    `;
    workspace.classList.remove("hidden");
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });
    $("#copy-code")?.addEventListener("click", () => copyText(list.code, "Wishlist code copied."));
    $("#copy-share")?.addEventListener("click", () => copyText(`I made a wishlist on Wishly! Enter code ${list.code} to see it.`, "Sharing message copied."));
    $("#add-item")?.addEventListener("click", () => { itemForm.reset(); dialog.showModal(); $("#item-name").focus(); });
    workspace.querySelectorAll(".remove-item").forEach(button => button.addEventListener("click", async () => {
      const item = activeItemDocs[Number(button.dataset.index)];
      if (!item || !confirm("Remove this item from your wishlist?")) return;
      try {
        await deleteDoc(doc(db, "wishlists", activeListId, "items", item.id));
        await deleteDoc(doc(db, "wishlists", activeListId, "purchases", item.id)).catch(() => {});
        await openWorkspace(activeList, "owner");
        toast("Item removed.");
      } catch (error) { toast(friendlyError(error)); }
    }));
    workspace.querySelectorAll(".toggle-purchased").forEach(button => button.addEventListener("click", async () => {
      const item = activeItemDocs[Number(button.dataset.index)];
      if (!item) return;
      try {
        await setDoc(doc(db, "wishlists", activeListId, "purchases", item.id), { purchased: true, updatedAt: serverTimestamp() });
        await openWorkspace(activeList, "gift");
        toast("Purchase status updated.");
      } catch (error) { toast(friendlyError(error)); }
    }));
  } catch (error) {
    toast(friendlyError(error));
    workspace.classList.add("hidden");
  }
}

createForm.addEventListener("submit", async event => {
  event.preventDefault();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) { toast("Create an account or sign in first."); return; }
  const data = new FormData(createForm);
  const ownerName = String(data.get("ownerName") || "").trim();
  const title = String(data.get("title") || "").trim();
  if (!ownerName || !title) return;
  const button = createForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    let code;
    let exists = true;
    for (let attempt = 0; attempt < 5 && exists; attempt++) {
      code = makeCode();
      exists = (await getDoc(doc(db, "wishlists", code))).exists();
    }
    if (exists) throw new Error("Could not generate a unique code. Please try again.");
    const list = { code, ownerUid: user.uid, ownerName, title, occasion: String(data.get("occasion") || "Other"), createdAt: serverTimestamp() };
    await setDoc(doc(db, "wishlists", code), list);
    createForm.reset();
    await openWorkspace({ ...list, createdAt: new Date() }, "owner");
    toast("Wishlist created. Copy the code to share it.");
  } catch (error) { toast(friendlyError(error)); }
  finally { button.disabled = false; }
});

viewForm.addEventListener("submit", async event => {
  event.preventDefault();
  const code = String(new FormData(viewForm).get("code") || "").trim().toUpperCase().replace(/\s/g, "");
  if (!/^[A-HJ-NP-Z2-9]{10}$/.test(code)) { toast("Enter the 10-character wishlist code."); return; }
  try {
    const snap = await getDoc(doc(db, "wishlists", code));
    if (!snap.exists()) { toast("Wishlist not found. Check the code and try again."); return; }
    const user = auth.currentUser;
    if (user && !user.isAnonymous) {
      toast("You are signed in as a wishlist owner. Sign out before opening a list as a gift-giver.");
      return;
    }
    if (!user) await signInAnonymously(auth);
    await openWorkspace({ code, ...snap.data() }, "gift");
  } catch (error) { toast(friendlyError(error)); }
});
itemForm.addEventListener("submit", async event => {
  event.preventDefault();
  const user = auth.currentUser;
  if (!user || user.isAnonymous || activeMode !== "owner" || !activeList || activeList.ownerUid !== user.uid) {
    toast("Sign in with the account that owns this wishlist to add items.");
    dialog.close(); return;
  }
  const data = new FormData(itemForm);
  const name = String(data.get("itemName") || "").trim();
  const rawUrl = String(data.get("itemUrl") || "").trim();
  const url = rawUrl ? safeUrl(rawUrl) : "";
  if (!name) { toast("Please enter an item name."); return; }
  if (rawUrl && !url) { toast("Use a valid http or https store link."); return; }
  try {
    await addDoc(collection(db, "wishlists", activeListId, "items"), {
      name, url, price: String(data.get("itemPrice") || ""),
      priority: String(data.get("itemPriority") || "Would love"),
      notes: String(data.get("itemNotes") || "").trim(), createdAt: serverTimestamp()
    });
    dialog.close();
    await openWorkspace(activeList, "owner");
    toast("Item added to your wishlist.");
  } catch (error) { toast(friendlyError(error)); }
});
$("#close-modal").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
$("#list-code").addEventListener("input", event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0,10); });

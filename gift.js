import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
const $ = selector => document.querySelector(selector);
const form = $("#view-form");
const workspace = $("#workspace");
const notice = $("#notice");
let activeCode = "";
let activeList = null;
let activeItems = [];

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl = value => {
  try { const url = new URL(value); return ["https:","http:"].includes(url.protocol) ? url.href : ""; }
  catch { return ""; }
};
function toast(message) {
  notice.textContent = message;
  notice.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => notice.classList.add("hidden"), 4500);
}
function friendlyError(error) {
  const messages = {
    "auth/operation-not-allowed": "Anonymous sign-in is disabled. Enable it in Firebase Authentication settings.",
    "permission-denied": "Firebase blocked this action. Make sure the latest Firestore rules are published.",
    "unavailable": "Firebase is temporarily unavailable. Check your connection."
  };
  return messages[error?.code] || error?.message || "Something went wrong. Please try again.";
}
async function renderList() {
  const snap = await getDocs(query(collection(db, "wishlists", activeCode, "items"), orderBy("createdAt", "asc")));
  activeItems = snap.docs.map(itemDoc => ({ id: itemDoc.id, ...itemDoc.data() }));
  const [purchaseEntries, reservationEntries] = await Promise.all([Promise.all(activeItems.map(async item => {
    const purchase = await getDoc(doc(db, "wishlists", activeCode, "purchases", item.id));
    return [item.id, purchase.exists() && Boolean(purchase.data().purchased)];
  })), Promise.all(activeItems.map(async item => {
    const reservation = await getDoc(doc(db, "wishlists", activeCode, "reservations", item.id));
    return [item.id, reservation.exists() ? reservation.data() : null];
  }))]);
  const purchases = Object.fromEntries(purchaseEntries);
  const reservations = Object.fromEntries(reservationEntries);
  workspace.innerHTML = `
    <div class="workspace-head">
      <div><div class="eyebrow">SHARED WISHLIST</div><h2>${escapeHtml(activeList.title)}</h2><p class="workspace-sub">For ${escapeHtml(activeList.ownerName)} · ${escapeHtml(activeList.occasion || "Other")}</p></div>
      <div class="code-chip">${escapeHtml(activeCode)}</div>
    </div>
    <p class="workspace-sub">Reserve an item to let other gift-givers know you are planning to get it. Reservations and purchase marks are hidden from the wishlist owner.</p>
    <div class="list-tools"><label for="gift-item-search">Search items</label><input id="gift-item-search" type="search" placeholder="Search by name or category"><div class="list-summary"><span id="gift-visible-count">${activeItems.length} items</span><span>Total listed price: <strong id="gift-price-total"></strong></span></div></div>
    <div class="item-list">${activeItems.length ? activeItems.map((item, index) => {
      const purchased = purchases[item.id];
      const reservation = reservations[item.id];
      const reservedByMe = Boolean(reservation && auth.currentUser && reservation.reservedBy === auth.currentUser.uid);
      const reserved = Boolean(reservation && reservation.reserved === true);
      const url = safeUrl(item.url);
      const priceValue = item.price !== "" && item.price != null && Number.isFinite(Number(item.price));
      return `<article class="wish-item ${purchased ? "purchased" : ""}" data-search="${escapeHtml((item.name + " " + (item.category || "")).toLowerCase())}" data-price="${Number(item.price)||0}" data-has-price="${priceValue}">
        <div class="item-placeholder" aria-hidden="true">${safeUrl(item.imageUrl) ? '<img class="item-image" src="' + escapeHtml(safeUrl(item.imageUrl)) + '" alt="" loading="lazy">' : (purchased ? "✓" : "♡")}</div>
        <div class="item-info"><span class="category-tag">${escapeHtml(item.category || "Other")}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.priority || "Would love")}${item.notes ? " · " + escapeHtml(item.notes) : ""}</p>${url ? '<a class="item-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">View at store ↗</a>' : ""}</div>
        ${priceValue ? '<div class="item-price">$' + Number(item.price).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + "</div>" : ""}
        <button class="small-button reserve-toggle" data-index="${index}" type="button" ${reserved && !reservedByMe ? "disabled" : ""}>${reservedByMe ? "Release reservation" : reserved ? "Reserved by someone" : "Reserve gift"}</button>
        <button class="small-button purchase-toggle" data-index="${index}" type="button" aria-pressed="${purchased}">${purchased ? "Marked purchased ✓" : "Mark purchased"}</button>
      </article>`;
    }).join("") : '<div class="empty-state">This wishlist does not have any items yet.</div>'}</div>
    <p class="workspace-sub" style="margin-top:16px">Purchase marks are for gift-givers. Please keep the surprise a secret.</p>
  `;
  workspace.classList.remove("hidden");
  workspace.scrollIntoView({ behavior: "smooth", block: "start" });
  const searchInput = $("#gift-item-search");
  const filterCards = () => { const term=(searchInput?.value||"").trim().toLowerCase(); let shown=0,total=0; workspace.querySelectorAll(".wish-item").forEach(card=>{const match=(card.dataset.search||"").includes(term);card.classList.toggle("filtered-out",!match);if(match){shown++;if(card.dataset.hasPrice==="true")total+=Number(card.dataset.price)||0;}});const count=$("#gift-visible-count");if(count)count.textContent=shown+(shown===1?" item":" items");const sum=$("#gift-price-total");if(sum)sum.textContent=total.toLocaleString(undefined,{style:"currency",currency:"USD"});};
  searchInput?.addEventListener("input",filterCards);filterCards();
  workspace.querySelectorAll(".reserve-toggle").forEach(button => button.addEventListener("click", async () => {
    const item = activeItems[Number(button.dataset.index)]; if (!item || !auth.currentUser?.isAnonymous) return;
    const reservationRef = doc(db, "wishlists", activeCode, "reservations", item.id);
    try {
      const existing = await getDoc(reservationRef);
      if (existing.exists() && existing.data().reservedBy === auth.currentUser.uid) {
        await deleteDoc(reservationRef); toast("Reservation released.");
      } else if (!existing.exists()) {
        await setDoc(reservationRef, {reserved:true,reservedBy:auth.currentUser.uid,updatedAt:serverTimestamp()}); toast("Gift reserved.");
      } else { toast("Someone else has already reserved this gift."); }
      await renderList();
    } catch(error) { toast(friendlyError(error)); }
  }));
  workspace.querySelectorAll(".purchase-toggle").forEach(button => button.addEventListener("click", async () => {
    const item = activeItems[Number(button.dataset.index)];
    if (!item) return;
    try {
      await setDoc(doc(db, "wishlists", activeCode, "purchases", item.id), { purchased: true, updatedAt: serverTimestamp() });
      await renderList();
      toast("Marked as purchased.");
    } catch (error) { toast(friendlyError(error)); }
  }));
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  const code = String(new FormData(form).get("code") || "").trim().toUpperCase().replace(/\s/g, "");
  if (!/^[A-HJ-NP-Z2-9]{10}$/.test(code)) { toast("Enter the 10-character wishlist code."); return; }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const currentUser = auth.currentUser;
    if (currentUser && !currentUser.isAnonymous) {
      toast("This browser is signed in to a Wishly owner account. Sign out first or open this page in a private window so purchase marks stay separate.");
      return;
    }
    if (!currentUser) await signInAnonymously(auth);
    const snap = await getDoc(doc(db, "wishlists", code));
    if (!snap.exists()) { toast("Wishlist not found. Check the code and try again."); return; }
    activeCode = code;
    activeList = { code, ...snap.data() };
    await renderList();
  } catch (error) { toast(friendlyError(error)); }
  finally { button.disabled = false; }
});
const queryCode = new URLSearchParams(location.search).get("code");
if (queryCode) { $("#list-code").value = queryCode.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0,10); if ($("#list-code").value.length === 10) form.requestSubmit(); }
$("#list-code").addEventListener("input", event => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 10);
});
 + Number(item.price).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + "</div>" : ""}
        <button class="small-button reserve-toggle" data-index="${index}" type="button" ${reserved && !reservedByMe ? "disabled" : ""}>${reservedByMe ? "Release reservation" : reserved ? "Reserved by someone" : "Reserve gift"}</button>
        <button class="small-button purchase-toggle" data-index="${index}" type="button" aria-pressed="${purchased}">${purchased ? "Marked purchased ✓" : "Mark purchased"}</button>
      </article>`;
    }).join("") : '<div class="empty-state">This wishlist does not have any items yet.</div>'}</div>
    <p class="workspace-sub" style="margin-top:16px">Purchase marks are for gift-givers. Please keep the surprise a secret.</p>
  `;
  workspace.classList.remove("hidden");
  workspace.scrollIntoView({ behavior: "smooth", block: "start" });
  workspace.querySelectorAll(".purchase-toggle").forEach(button => button.addEventListener("click", async () => {
    const item = activeItems[Number(button.dataset.index)];
    if (!item) return;
    try {
      await setDoc(doc(db, "wishlists", activeCode, "purchases", item.id), { purchased: true, updatedAt: serverTimestamp() });
      await renderList();
      toast("Marked as purchased.");
    } catch (error) { toast(friendlyError(error)); }
  }));
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  const code = String(new FormData(form).get("code") || "").trim().toUpperCase().replace(/\s/g, "");
  if (!/^[A-HJ-NP-Z2-9]{10}$/.test(code)) { toast("Enter the 10-character wishlist code."); return; }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const currentUser = auth.currentUser;
    if (currentUser && !currentUser.isAnonymous) {
      toast("This browser is signed in to a Wishly owner account. Sign out first or open this page in a private window so purchase marks stay separate.");
      return;
    }
    if (!currentUser) await signInAnonymously(auth);
    const snap = await getDoc(doc(db, "wishlists", code));
    if (!snap.exists()) { toast("Wishlist not found. Check the code and try again."); return; }
    activeCode = code;
    activeList = { code, ...snap.data() };
    await renderList();
  } catch (error) { toast(friendlyError(error)); }
  finally { button.disabled = false; }
});
$("#list-code").addEventListener("input", event => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 10);
});

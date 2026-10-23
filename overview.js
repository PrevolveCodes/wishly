import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
const escapeHtml = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;", "'":"&#39;"}[c]));

function formatDate(timestamp) {
  if (!timestamp?.seconds) return "";
  return new Date(timestamp.seconds * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function renderStats(lists, totalItems) {
  $("#overview-list-count").textContent = lists.length;
  $("#overview-item-count").textContent = totalItems;
  $("#overview-view-count").textContent = lists.reduce((sum, list) => sum + Number(list.views || list.viewCount || 0), 0);
  $("#overview-occasion-count").textContent = new Set(lists.map(list => list.occasion || "Other")).size;
}

function renderRecentLists(lists) {
  const container = $("#overview-recent-lists");
  if (!lists.length) {
    container.innerHTML = '<div class="overview-empty"><strong>Your first wishlist is waiting.</strong><p>Create a wishlist and it will show up here with its items, occasion, and icon.</p><a class="button button-primary" href="dashboard.html?view=make-list">Create your first wishlist →</a></div>';
    return;
  }
  container.innerHTML = lists.slice(0, 3).map(list => {
    const image = list.coverImageUrl && /^https?:\/\//i.test(list.coverImageUrl)
      ? `<img src="${escapeHtml(list.coverImageUrl)}" alt="" loading="lazy" onerror="this.remove()">`
      : '<span aria-hidden="true">♡</span>';
    return `<article class="overview-list-card">
      <div class="overview-list-icon">${image}</div>
      <div class="overview-list-copy"><h3>${escapeHtml(list.title || "Untitled wishlist")}</h3><p>${escapeHtml(list.occasion || "Other")} · ${list.itemCount} ${list.itemCount === 1 ? "item" : "items"}</p><small>Created ${escapeHtml(formatDate(list.createdAt) || "recently")}</small></div>
      <a class="small-button" href="dashboard.html?view=lists&code=${encodeURIComponent(list.code)}">Open list →</a>
    </article>`;
  }).join("");
}

function renderUpcoming(lists) {
  const box = $("#overview-upcoming");
  if (!lists.length) {
    box.innerHTML = '<div class="overview-upcoming-empty">Create a wishlist to start planning your next occasion.</div>';
    return;
  }
  const list = lists.find(item => !item.archived) || lists[0];
  box.innerHTML = `<div class="upcoming-icon">♡</div><div><div class="eyebrow">YOUR NEXT WISHLIST</div><h2>${escapeHtml(list.title || "Wishlist")}</h2><p>${escapeHtml(list.occasion || "Other")} · ${list.itemCount} ${list.itemCount === 1 ? "item" : "items"}</p></div><a class="small-button" href="dashboard.html?view=lists&code=${encodeURIComponent(list.code)}">View →</a>`;
}

async function loadOverview(user) {
  const recent = $("#overview-recent-lists");
  try {
    const snap = await getDocs(query(collection(db, "wishlists"), where("ownerUid", "==", user.uid)));
    const lists = snap.docs.map(d => ({ code: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    let totalItems = 0;
    for (const list of lists) {
      try {
        const itemsSnap = await getDocs(collection(db, "wishlists", list.code, "items"));
        list.itemCount = itemsSnap.size;
        totalItems += itemsSnap.size;
      } catch {
        list.itemCount = 0;
      }
    }
    renderStats(lists, totalItems);
    renderRecentLists(lists);
    renderUpcoming(lists);
    const firstName = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "there";
    $("#overview-greeting").textContent = `Welcome back, ${firstName}.`;
  } catch (error) {
    recent.innerHTML = '<div class="overview-empty"><strong>We could not load your overview.</strong><p>Check your connection and Firestore rules, then refresh the page.</p></div>';
    console.error("Wishly: overview failed to load", error);
  }
}

onAuthStateChanged(auth, user => {
  if (!user || user.isAnonymous) {
    window.location.replace("signup.html");
    return;
  }
  loadOverview(user);
});

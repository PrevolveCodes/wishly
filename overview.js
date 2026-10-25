import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
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
  const today = new Date(); today.setHours(0, 0, 0, 0);
  $("#overview-upcoming-count").textContent = lists.filter(list => !list.archived && list.eventDate && new Date(`${list.eventDate}T00:00:00`) >= today).length;
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

let countdownTimer;
function renderUpcoming(lists) {
  const box = $("#overview-upcoming");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = lists
    .filter(list => !list.archived && list.eventDate && !Number.isNaN(new Date(`${list.eventDate}T00:00:00`).getTime()) && new Date(`${list.eventDate}T00:00:00`) >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  if (countdownTimer) clearInterval(countdownTimer);
  if (!upcoming.length) {
    box.innerHTML = '<div class="overview-upcoming-empty"><strong>No upcoming dates yet.</strong><p>Add an event date when creating a wishlist and Wishly will show a live countdown here.</p><a class="small-button" href="dashboard.html?view=make-list">Create a wishlist →</a></div>';
    return;
  }

  box.innerHTML = upcoming.map((list, index) => {
    const eventDate = new Date(`${list.eventDate}T00:00:00`);
    const dateLabel = eventDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return `<article class="overview-upcoming-card">
      <div class="upcoming-icon" aria-hidden="true">⌛</div>
      <div class="upcoming-copy"><h2>${escapeHtml(list.title || "Wishlist")}</h2><p>${escapeHtml(list.occasion || "Other")} · ${escapeHtml(dateLabel)}</p><div class="upcoming-countdown" data-countdown-date="${escapeHtml(list.eventDate)}" role="timer" aria-live="off">Calculating countdown…</div></div>
      <a class="small-button" href="dashboard.html?view=lists&code=${encodeURIComponent(list.code)}">View →</a>
    </article>`;
  }).join("");

  const updateCountdowns = () => {
    box.querySelectorAll("[data-countdown-date]").forEach(countdown => {
      const eventDate = new Date(`${countdown.dataset.countdownDate}T00:00:00`);
      const remaining = eventDate.getTime() - Date.now();
      if (remaining <= 0) {
        countdown.textContent = "Today is the day!";
        return;
      }
      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      countdown.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s to go`;
    });
  };
  updateCountdowns();
  countdownTimer = setInterval(updateCountdowns, 1000);
}

async function loadOverview(user) {
  const recent = $("#overview-recent-lists");
  try {
    const snap = await getDocs(query(collection(db, "wishlists"), where("ownerUid", "==", user.uid)));
    // Keep archived lists out of the active overview, totals, recent cards, and countdowns.
    const lists = snap.docs.map(d => ({ code: d.id, ...d.data() }))
      .filter(list => !list.archived)
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

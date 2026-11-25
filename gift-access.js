import { priorityRank } from "./wishlist-priority.js";
import { watchGiftReservations } from "./gift-reservations.js?v=invite-reservations-1";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
const db = getFirestore(app);
const reservations = watchGiftReservations(db, getAuth(app));
const $ = selector => document.querySelector(selector);
const form = $("#view-form");
const workspace = $("#workspace");
const notice = $("#notice");

let activeCode = "";
let activeList = null;
let activeItems = [];

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function toast(message) {
  notice.textContent = message;
  notice.classList.remove("hidden");
}

function showError(error) {
  console.error("Wishly wishlist viewer:", error);
  if (error?.code === "permission-denied") {
    toast("Wishly could not read this wishlist. Check that your published Firestore rules allow viewing wishlist items.");
  } else if (error?.code === "unavailable") {
    toast("Wishly could not connect to Firebase. Check your internet connection and try again.");
  } else {
    toast(error?.message || "Something went wrong while loading this wishlist. Please try again.");
  }
}

async function loadWishlist(rawCode) {
  const code = String(rawCode || "").trim().toUpperCase().replace(/\s/g, "");
  if (!/^[A-HJ-NP-Z2-9]{10}$/.test(code)) {
    toast("Enter the 10-character wishlist code.");
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Loading wishlist…";
  reservations.clear();
  workspace.classList.add("hidden");
  notice.classList.add("hidden");

  try {
    const listSnapshot = await getDoc(doc(db, "wishlists", code));
    if (!listSnapshot.exists()) {
      toast("Wishlist not found. Check the code and try again.");
      return;
    }

    const itemSnapshot = await getDocs(collection(db, "wishlists", code, "items"));
    activeCode = code;
    activeList = { ...listSnapshot.data(), code };
    activeItems = itemSnapshot.docs.map(itemDoc => ({
      id: itemDoc.id,
      ...itemDoc.data()
    })).sort((a, b) => {
      const orderA = Number.isFinite(a.sortOrder) ? a.sortOrder : (a.createdAt?.seconds || 0);
      const orderB = Number.isFinite(b.sortOrder) ? b.sortOrder : (b.createdAt?.seconds || 0);
      return orderA - orderB;
    });

    const anchor = location.hash === "#gift-reservation-controls" ? location.hash : "";
    history.replaceState(history.state, "", `gift.html?code=${encodeURIComponent(code)}${anchor}`);
    renderWishlist();
  } catch (error) {
    showError(error);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Find wishlist <span>→</span>';
  }
}

function renderWishlist() {
  workspace.innerHTML = `
    <div class="workspace-head">
      <div>
        <div class="eyebrow">SHARED WISHLIST</div>
        <h2>${escapeHtml(activeList.title || "Wishlist")}</h2>
        <p class="workspace-sub">For ${escapeHtml(activeList.ownerName || "Someone")} · ${escapeHtml(activeList.occasion || "Other")}</p>
      </div>
      <div class="workspace-head-actions">
        <div class="code-chip">${escapeHtml(activeCode)}</div>
        <button class="small-button" id="copy-gift-share-link" type="button">Copy share link</button>
        <button class="small-button" id="print-wishlist" type="button">Print / Save PDF</button>
      </div>
    </div>
    <section class="gift-reservation-panel" id="gift-reservation-controls" aria-label="Gift reservations" hidden></section>
    <div class="list-tools">
      <label for="gift-item-search">Search items</label>
      <input id="gift-item-search" type="search" placeholder="Search by name or category">
      <label for="gift-category-filter">Category</label>
      <select id="gift-category-filter">
        <option value="">All categories</option>
        ${[...new Set(activeItems.map(item => String(item.category || "Other")))].sort((a, b) => a.localeCompare(b)).map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
      </select>
      <label for="gift-item-sort">Sort</label>
      <select id="gift-item-sort">
        <option value="custom">Wishlist order</option>
        <option value="name">Name: A–Z</option>
        <option value="price-low">Price: low to high</option>
        <option value="price-high">Price: high to low</option>
        <option value="priority">Priority</option>
        <option value="category">Category</option>
      </select>
      <div class="list-summary">
        <span id="gift-visible-count">${activeItems.length} items</span>
        <span>Total listed price: <strong id="gift-price-total"></strong></span>
      </div>
    </div>
    <div class="item-list">
      ${activeItems.length ? activeItems.map((item, index) => {
        const image = safeUrl(item.imageUrl);
        const link = safeUrl(item.url);
        const hasPrice = item.price !== "" && item.price != null && Number.isFinite(Number(item.price));
        return `
          <article class="wish-item"
            data-search="${escapeHtml((String(item.name || "") + " " + String(item.category || "")).toLowerCase())}"
            data-name="${escapeHtml(item.name || "")}"
            data-category="${escapeHtml(item.category || "Other")}"
            data-priority="${escapeHtml(item.priority || "Would love")}"
            data-index="${index}"
            data-price="${Number(item.price) || 0}"
            data-has-price="${hasPrice}">
            <div class="item-placeholder" aria-hidden="true">
              ${image ? `<img class="item-image" src="${escapeHtml(image)}" alt="" loading="lazy">` : "♡"}
            </div>
            <div class="item-info">
              <span class="category-tag">${escapeHtml(item.category || "Other")}</span>
              <h3>${escapeHtml(item.name || "Wishlist item")}</h3>
              <p>${escapeHtml(item.priority || "Would love")}${item.notes ? " · " + escapeHtml(item.notes) : ""}</p>
              ${link ? `<a class="item-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">View at store ↗</a>` : ""}
              <div class="gift-reservation-item" data-reservation-item="${escapeHtml(item.id)}" hidden>
                <span data-reservation-status></span>
                <button class="small-button" type="button">Reserve gift</button>
              </div>
            </div>
            ${hasPrice ? `<div class="item-price">$ ${Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ""}
          </article>`;
      }).join("") : '<div class="empty-state">This wishlist does not have any items yet.</div>'}
    </div>`;

  workspace.classList.remove("hidden");
  reservations.show(activeList, workspace);

  const search = $("#gift-item-search");
  const categoryFilter = $("#gift-category-filter");
  const sortSelect = $("#gift-item-sort");

  function filterAndSort() {
    const term = (search.value || "").trim().toLowerCase();
    const category = categoryFilter.value;
    const cards = [...workspace.querySelectorAll(".wish-item")];

    cards.forEach(card => {
      const matchesText = (card.dataset.search || "").includes(term);
      const matchesCategory = !category || card.dataset.category === category;
      card.classList.toggle("filtered-out", !(matchesText && matchesCategory));
    });


    cards.sort((a, b) => {
      const sort = sortSelect.value;
      if (sort === "name") return a.dataset.name.localeCompare(b.dataset.name);
      if (sort === "price-low" || sort === "price-high") {
        const missing = sort === "price-low" ? Infinity : -Infinity;
        const priceA = a.dataset.hasPrice === "true" ? Number(a.dataset.price) : missing;
        const priceB = b.dataset.hasPrice === "true" ? Number(b.dataset.price) : missing;
        return (sort === "price-low" ? priceA - priceB : priceB - priceA) || Number(a.dataset.index) - Number(b.dataset.index);
      }
      if (sort === "priority") return priorityRank(a.dataset.priority) - priorityRank(b.dataset.priority) || a.dataset.name.localeCompare(b.dataset.name);
      if (sort === "category") return a.dataset.category.localeCompare(b.dataset.category) || a.dataset.name.localeCompare(b.dataset.name);
      return Number(a.dataset.index) - Number(b.dataset.index);
    });

    const list = workspace.querySelector(".item-list");
    cards.forEach(card => list.appendChild(card));

    let visible = 0;
    let total = 0;
    cards.forEach(card => {
      if (!card.classList.contains("filtered-out")) {
        visible++;
        if (card.dataset.hasPrice === "true") total += Number(card.dataset.price) || 0;
      }
    });
    $("#gift-visible-count").textContent = visible + (visible === 1 ? " item" : " items");
    $("#gift-price-total").textContent = total.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  search.addEventListener("input", filterAndSort);
  categoryFilter.addEventListener("change", filterAndSort);
  sortSelect.addEventListener("change", filterAndSort);
  filterAndSort();

  $("#copy-gift-share-link").addEventListener("click", async () => {
    const shareUrl = new URL("gift.html", location.href);
    shareUrl.searchParams.set("code", activeCode);
    try {
      await navigator.clipboard.writeText(shareUrl.href);
      toast("Share link copied.");
    } catch {
      window.prompt("Copy this wishlist link:", shareUrl.href);
    }
  });

  $("#print-wishlist").addEventListener("click", () => window.print());
  const scrollTarget = location.hash === "#gift-reservation-controls" ? $("#gift-reservation-controls") : workspace;
  scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", event => {
  event.preventDefault();
  loadWishlist(new FormData(form).get("code"));
});

const codeFromUrl = new URLSearchParams(location.search).get("code");
if (codeFromUrl) {
  $("#list-code").value = codeFromUrl.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 10);
  if ($("#list-code").value.length === 10) loadWishlist($("#list-code").value);
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  deleteDoc, updateDoc, serverTimestamp, query, orderBy, where, writeBatch
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
const ownedLists = $("#owned-lists");
const listCount = $("#list-count");
const workspace = $("#workspace");
const notice = $("#notice");
const dialog = $("#item-dialog");
const itemForm = $("#item-form");

let activeListId = null;
let activeMode = "owner";
let activeItemDocs = [];
let activeList = null;
let noticeTimer;
let showArchivedLists = false;

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));
const safeUrl = value => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
};
function openWishlistPrintView(list, items) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast("Your browser blocked the print window. Allow pop-ups for Wishly, then try again.");
    return;
  }
  const money = value => Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const priced = items.filter(item => item.price !== "" && item.price != null && Number.isFinite(Number(item.price)));
  const total = priced.reduce((sum, item) => sum + Number(item.price), 0);
  const rows = items.map((item, index) => {
    const image = safeUrl(item.imageUrl), link = safeUrl(item.url);
    const hasPrice = item.price !== "" && item.price != null && Number.isFinite(Number(item.price));
    return '<article class="item"><span class="number">' + String(index + 1).padStart(2, "0") + '</span>' +
      (image ? '<img class="item-image" src="' + escapeHtml(image) + '" alt="">' : '<span class="placeholder">♡</span>') +
      '<div class="details"><div><span class="category">' + escapeHtml(item.category || "Other") + '</span> <span class="priority">' + escapeHtml(item.priority || "Would love") + '</span></div>' +
      '<h2>' + escapeHtml(item.name || "Wishlist item") + '</h2>' +
      (item.notes ? '<p>' + escapeHtml(item.notes) + '</p>' : '') +
      (link ? '<p class="store"><a href="' + escapeHtml(link) + '">View product online</a></p>' : '') +
      '</div>' + (hasPrice ? '<strong class="price">$' + money(item.price) + '</strong>' : '') + '</article>';
  }).join("");
  const title = escapeHtml(list.title || "Wishlist");
  const owner = escapeHtml(list.ownerName || "");
  const occasion = escapeHtml(list.occasion || "Other");
  const page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + ' — Wishly</title><style>' +
    '*{box-sizing:border-box}body{margin:0;padding:30px;background:#f4f3f8;color:#282538;font:14px/1.5 Arial,sans-serif}.sheet{max-width:800px;margin:auto;padding:36px 40px;background:#fff;border:1px solid #e9e6f1;border-radius:12px}.brand{color:#6553c7;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px}.heading{border-bottom:2px solid #efecf7;padding-bottom:20px;margin-bottom:4px}h1{font-size:28px;line-height:1.2;margin:0 0 8px;overflow-wrap:anywhere}.subtitle{color:#706b80;margin:0}.summary{display:flex;gap:18px;flex-wrap:wrap;color:#706b80;font-size:12px;margin-top:16px}.summary strong{color:#302b49}.item{display:flex;align-items:center;gap:14px;padding:15px 0;border-bottom:1px solid #eeecf3;break-inside:avoid;page-break-inside:avoid}.number{width:22px;flex:0 0 22px;color:#9b96ad;font-size:10px}.item-image,.placeholder{width:70px;height:70px;flex:0 0 70px;object-fit:contain;border:1px solid #eeecf3;border-radius:8px}.placeholder{display:grid;place-items:center;color:#a39db5;font-size:26px}.details{flex:1;min-width:0}.category{background:#f0edff;color:#5846b7;border-radius:4px;padding:3px 7px;font-size:10px;font-weight:700}.priority{color:#817b92;font-size:10px}.item h2{font-size:15px;margin:6px 0 3px;overflow-wrap:anywhere}.item p{margin:3px 0;color:#686579;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}.store a{color:#5947b7;text-decoration:none}.price{white-space:nowrap;font-size:14px}.footer{display:flex;justify-content:space-between;gap:12px;margin-top:24px;padding-top:14px;border-top:1px solid #eeecf3;color:#9690a5;font-size:10px}.footer strong{color:#6553c7}@page{size:auto;margin:12mm}@media print{body{padding:0;background:#fff}.sheet{max-width:none;padding:0;border:0;border-radius:0}.item{padding:12px 0}.item-image,.placeholder{width:64px;height:64px;flex-basis:64px}}@media screen and (max-width:560px){.sheet{padding:20px 14px}.item{gap:8px}.number{width:16px;flex-basis:16px}.item-image,.placeholder{width:52px;height:52px;flex-basis:52px}.price{font-size:12px}h1{font-size:24px}}' +
    '</style></head><body><main class="sheet"><div class="brand">wishly.</div><header class="heading"><h1>' + title + '</h1><p class="subtitle">' + (owner ? 'For ' + owner + ' · ' : '') + occasion + '</p><div class="summary"><span><strong>' + items.length + '</strong> ' + (items.length === 1 ? 'item' : 'items') + '</span>' +
    (priced.length ? '<span><strong>' + priced.length + '</strong> priced</span><span>Listed total <strong>$' + money(total) + '</strong></span>' : '') +
    '</div></header>' + (rows || '<p>This wishlist does not have any items yet.</p>') + '<footer class="footer"><span>Made with <strong>Wishly</strong></span><span>Wishlist copy</span></footer></main></body></html>';
  printWindow.document.open();
  printWindow.document.write(page);
  printWindow.document.close();
  const images = Array.from(printWindow.document.images);
  Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
    img.onload = resolve; img.onerror = resolve; setTimeout(resolve, 2500);
  }))).then(() => setTimeout(() => { printWindow.focus(); printWindow.print(); }, 250));
}
function openWishlistPreview(list, items) {
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) {
    toast("Your browser blocked the preview window. Allow pop-ups for Wishly, then try again.");
    return;
  }
  const accent = /^#[0-9a-fA-F]{6}$/.test(list.themeColor || "") ? list.themeColor : "#6555d9";
  const cover = safeUrl(list.coverImageUrl);
  const dateText = list.eventDate ? (() => {
    const date = new Date(list.eventDate + "T12:00:00");
    return Number.isNaN(date.getTime()) ? list.eventDate : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  })() : "";
  const cards = items.map(item => {
    const image = safeUrl(item.imageUrl);
    const link = safeUrl(item.url);
    const hasPrice = item.price !== "" && item.price != null && Number.isFinite(Number(item.price));
    return '<article class="item"><div class="image">' + (image ? '<img src="' + escapeHtml(image) + '" alt="">' : '♡') + '</div><div class="details"><span class="category">' + escapeHtml(item.category || "Other") + '</span><h2>' + escapeHtml(item.name || "Wishlist item") + '</h2><p>' + escapeHtml(item.priority || "Would love") + (item.notes ? ' · ' + escapeHtml(item.notes) : '') + '</p>' + (link ? '<a href="' + escapeHtml(link) + '" target="_blank" rel="noopener noreferrer">View at store ↗</a>' : '') + '</div>' + (hasPrice ? '<strong class="price">$' + Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</strong>' : '') + '</article>';
  }).join("");
  const banner = (cover || dateText || String(list.customMessage || "").trim()) ? '<section class="banner">' + (cover ? '<img class="cover" src="' + escapeHtml(cover) + '" alt="">' : '') + '<div class="banner-copy">' + (dateText ? '<div class="event-date">' + escapeHtml(dateText) + '</div>' : '') + (list.customMessage ? '<p>' + escapeHtml(list.customMessage) + '</p>' : '') + '</div></section>' : '';
  const page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview: ' + escapeHtml(list.title || "Wishlist") + ' — Wishly</title><style>' +
    '*{box-sizing:border-box}body{margin:0;background:#f7f6f2;color:#24252c;font:15px/1.5 Arial,sans-serif}.top{max-width:960px;margin:auto;padding:24px 24px;display:flex;justify-content:space-between;gap:12px}.brand{font-size:22px;font-weight:800}.brand span,.eyebrow,.event-date,a{color:' + accent + '}.preview{font-size:11px;color:#777982;text-transform:uppercase;letter-spacing:1px}.main{max-width:960px;margin:auto;padding:10px 24px 45px}.notice{padding:11px 14px;border-radius:10px;background:#f0edff;color:#5142a8;font-size:12px;margin-bottom:16px}.sheet{background:white;border:1px solid #e8e6e0;border-radius:20px;padding:26px}.head{display:flex;justify-content:space-between;gap:14px;margin-bottom:18px}.eyebrow,.event-date{font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase}.head h1{font-size:28px;line-height:1.2;margin:7px 0;overflow-wrap:anywhere}.sub{font-size:13px;color:#777982;margin:0}.code{background:#f2efff;color:#5646c4;padding:8px 10px;border-radius:9px;font-size:12px;font-weight:700;white-space:nowrap}.banner{display:flex;overflow:hidden;margin:18px 0 22px;border-radius:15px;background:color-mix(in srgb,' + accent + ' 10%,white);border:1px solid color-mix(in srgb,' + accent + ' 25%,transparent)}.cover{width:170px;min-height:110px;max-height:180px;object-fit:cover}.banner-copy{padding:18px;display:flex;flex-direction:column;justify-content:center}.banner-copy p{margin:0}.event-date{margin-bottom:7px}.summary{display:flex;justify-content:space-between;gap:12px;color:#777982;font-size:12px;margin:18px 0 10px}.items{display:grid;gap:9px}.item{display:flex;align-items:center;gap:12px;padding:13px;border:1px solid #eeece7;border-radius:13px;break-inside:avoid}.image{width:52px;height:52px;flex:0 0 52px;display:grid;place-items:center;overflow:hidden;border-radius:11px;background:#f0edff;color:' + accent + ';font-size:22px}.image img{width:100%;height:100%;object-fit:contain}.details{flex:1;min-width:0}.category{font-size:10px;background:#f0edff;color:#5646c4;border-radius:4px;padding:3px 6px}.details h2{font-size:14px;margin:6px 0 2px;overflow-wrap:anywhere}.details p{font-size:12px;color:#777982;margin:0 0 3px;overflow-wrap:anywhere}.details a{font-size:12px;text-decoration:none}.price{font-size:13px;white-space:nowrap}.empty{padding:25px;text-align:center;color:#777982;background:#faf9f6;border-radius:12px}@media(max-width:600px){.top{padding:18px 15px}.main{padding:8px 10px 25px}.sheet{padding:15px;border-radius:15px}.head{display:block}.code{display:inline-block;margin-top:10px}.banner{display:block}.cover{width:100%;height:145px}.banner-copy{padding:14px}.item{gap:8px;padding:10px}.image{width:42px;height:42px;flex-basis:42px}.price{font-size:12px}}' +
    '</style></head><body><header class="top"><div class="brand">wishly<span>.</span></div><div class="preview">Gift-giver preview · Read only</div></header><main class="main"><div class="notice">Preview only — this page cannot reserve gifts or change purchase status.</div><section class="sheet"><div class="head"><div><div class="eyebrow">SHARED WISHLIST</div><h1>' + escapeHtml(list.title || "Wishlist") + '</h1><p class="sub">For ' + escapeHtml(list.ownerName || "") + ' · ' + escapeHtml(list.occasion || "Other") + '</p></div><div class="code">' + escapeHtml(list.code || "") + '</div></div>' + banner + '<div class="summary"><span>' + items.length + (items.length === 1 ? ' item' : ' items') + '</span><span>Read-only preview</span></div><div class="items">' + (cards || '<div class="empty">This wishlist does not have any items yet.</div>') + '</div></section></main></body></html>';
  previewWindow.document.open();
  previewWindow.document.write(page);
  previewWindow.document.close();
}
function toast(message) {
  notice.textContent = message;
  notice.classList.remove("hidden");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice.classList.add("hidden"), 4000);
}
function friendlyError(error) {
  const code = error?.code || "";
  const messages = {
    "permission-denied": "Firebase denied access. Check that the latest Firestore rules have been published.",
    "unavailable": "Firebase is temporarily unavailable. Check your connection and try again.",
    "failed-precondition": "A Firestore query needs setup. Check the error details in your browser console.",
    "unauthenticated": "Your session has expired. Sign in again.",
    "auth/network-request-failed": "Could not connect to Firebase. Check your internet connection."
  };
  return messages[code] || error?.message || "Something went wrong. Please try again.";
}

onAuthStateChanged(auth, async user => {
  if (!user || user.isAnonymous) {
    window.location.replace("signup.html");
    return;
  }
  const submit = createForm.querySelector('button[type="submit"]');
  submit.disabled = false;
  submit.textContent = "Create wishlist →";
  await loadOwnedLists(user);
});

const sidebarThemeToggle = document.querySelector("#sidebar-theme-toggle");
if (sidebarThemeToggle) sidebarThemeToggle.addEventListener("click", () => {
  const existingToggle = document.querySelector("[data-theme-toggle], #theme-toggle, .theme-toggle");
  if (existingToggle) existingToggle.click();
  else document.documentElement.classList.toggle("dark-mode");
});

async function loadOwnedLists(user = auth.currentUser) {
  if (!user || user.isAnonymous) return;
  ownedLists.innerHTML = '<div class="empty-state">Loading your wishlists…</div>';
  listCount.textContent = "Loading…";
  try {
    const snap = await getDocs(query(
      collection(db, "wishlists"),
      where("ownerUid", "==", user.uid)
    ));
    const allLists = snap.docs
      .map(d => ({ code: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const lists = allLists.filter(list => showArchivedLists ? Boolean(list.archived) : !list.archived);
    listCount.textContent = lists.length + (lists.length === 1 ? " list" : " lists");
    const archiveToggle = $("#toggle-archived");
    if (archiveToggle) {
      archiveToggle.textContent = showArchivedLists ? "Show active" : "Show archived";
      archiveToggle.onclick = () => { showArchivedLists = !showArchivedLists; loadOwnedLists(auth.currentUser); };
    }
    ownedLists.innerHTML = lists.length ? lists.map(list => `<article class="owned-list">
      <span class="owned-list-icon">${list.coverImageUrl && /^https?:\/\//i.test(list.coverImageUrl) ? `<img class="owned-list-thumbnail" src="${escapeHtml(list.coverImageUrl)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='♡'">` : '<span aria-hidden="true">♡</span>'}</span>
      <div class="owned-list-info"><h3>${escapeHtml(list.title)}</h3><p>${escapeHtml(list.occasion || "Other")} · Code ${escapeHtml(list.code)}</p></div>
      <div class="owned-list-actions"><button class="small-button open-owned-list" data-code="${escapeHtml(list.code)}" type="button">Open list →</button><button class="small-button delete-owned-list" data-code="${escapeHtml(list.code)}" type="button">Delete</button></div>
    </article>`).join("") : '<div class="empty-state">You haven’t made a wishlist yet. Create your first one here.</div>';
    ownedLists.querySelectorAll(".owned-list").forEach((card, index) => {
      const list = lists[index];
      if (!list) return;
      const actions = card.querySelector(".owned-list-actions");
      if (!actions) return;
      const archiveButton = document.createElement("button");
      archiveButton.className = "small-button archive-owned-list";
      archiveButton.type = "button";
      archiveButton.textContent = list.archived ? "Restore" : "Archive";
      actions.insertBefore(archiveButton, actions.querySelector(".delete-owned-list"));
      archiveButton.addEventListener("click", async () => {
        archiveButton.disabled = true;
        try {
          await updateDoc(doc(db, "wishlists", list.code), { archived: !list.archived });
          await loadOwnedLists(auth.currentUser);
          toast(list.archived ? "Wishlist restored." : "Wishlist archived.");
        } catch (error) { archiveButton.disabled = false; toast(friendlyError(error)); }
      });
    });
    ownedLists.querySelectorAll(".open-owned-list").forEach(button => {
      button.addEventListener("click", async () => {
        const list = lists.find(item => item.code === button.dataset.code);
        if (list) await openWorkspace(list, "owner");
      });
    });
    ownedLists.querySelectorAll(".delete-owned-list").forEach(button => {
      button.addEventListener("click", async () => {
        const list = lists.find(item => item.code === button.dataset.code);
        if (!list) return;
        if (!confirm(`Delete "${list.title}"? Gift-givers will no longer be able to open this wishlist. This cannot be undone.`)) return;
        button.disabled = true;
        button.textContent = "Deleting…";
        try {
          const items = await getDocs(collection(db, "wishlists", list.code, "items"));
          for (let i = 0; i < items.docs.length; i += 150) {
            const batch = writeBatch(db);
            items.docs.slice(i, i + 150).forEach(item => {
              batch.delete(item.ref);
              batch.delete(doc(db, "wishlists", list.code, "purchases", item.id));
              batch.delete(doc(db, "wishlists", list.code, "reservations", item.id));
            });
            await batch.commit();
          }
          await deleteDoc(doc(db, "wishlists", list.code, "giftAccessConfig", "main")).catch(() => {});
          await deleteDoc(doc(db, "wishlists", list.code));
          if (activeListId === list.code) {
            activeListId = null;
            activeList = null;
            activeItemDocs = [];
            workspace.innerHTML = "";
            workspace.classList.add("hidden");
          }
          await loadOwnedLists(auth.currentUser);
          toast("Wishlist deleted.");
        } catch (error) {
          button.disabled = false;
          button.textContent = "Delete";
          toast(friendlyError(error));
          console.error("Wishly: failed to delete wishlist", error);
        }
      });
    });
  } catch (error) {
    ownedLists.innerHTML = '<div class="empty-state">Could not load your wishlists. Check your connection and Firestore rules, then refresh.</div>';
    listCount.textContent = "Unable to load";
    toast(friendlyError(error));
    console.error("Wishly: failed to load owned wishlists", error);
  }
}

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}
async function copyText(text, success) {
  try {
    await navigator.clipboard.writeText(text);
    toast(success);
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    toast(copied ? success : "Copy was blocked. Please select and copy the text.");
  }
}
async function loadItems(code) {
  const snap = await getDocs(collection(db, "wishlists", code, "items"));
  return snap.docs.map(itemDoc => ({ id: itemDoc.id, ...itemDoc.data() }))
    .sort((a, b) => {
      const aOrder = Number.isFinite(a.sortOrder) ? a.sortOrder : (a.createdAt?.seconds || 0);
      const bOrder = Number.isFinite(b.sortOrder) ? b.sortOrder : (b.createdAt?.seconds || 0);
      return aOrder - bOrder;
    });
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
  workspace.innerHTML = '<div class="empty-state">Loading items…</div>';
  workspace.classList.remove("hidden");
  try {
    const items = await loadItems(list.code);
    activeItemDocs = items;
    const purchases = await loadPurchases(list.code, items, !owner);
    workspace.innerHTML = `
      <div class="workspace-head">
        <div><div class="eyebrow">${owner ? "YOUR WISHLIST" : "A WISHLIST FOR SOMEONE"}</div><h2>${escapeHtml(list.title)}</h2><p class="workspace-sub">${escapeHtml(list.ownerName || "")} · ${escapeHtml(list.occasion || "Other")}</p></div>
        <div class="code-chip" title="Wishlist code">${escapeHtml(list.code)} ${owner ? '<button class="small-button" id="copy-code" type="button">Copy</button>' : ""}</div>
      </div>
      ${owner ? '<p class="workspace-sub">Keep this code safe and share it with your gift-givers. Add your first item below.</p><div class="workspace-actions"><button class="button button-primary" id="add-item" type="button" style="width:auto;margin:0;gap:22px">Add an item <span>+</span></button><button class="small-button" id="preview-wishlist" type="button">Preview as gift-giver</button><button class="small-button" id="copy-share" type="button">Copy sharing message</button><button class="small-button" id="print-wishlist" type="button">Print / Save PDF</button><button class="small-button" id="show-qr" type="button">Show QR code</button><button class="small-button" id="reveal-purchases-prank" type="button">Reveal what’s being bought</button></div><div id="qr-panel" class="qr-panel hidden"><div id="qr-code"></div><div><strong>Scan to open this wishlist</strong><p class="workspace-sub">Anyone with the link and code can view this list.</p><button class="small-button" id="download-qr" type="button">Download QR</button><button class="small-button" id="hide-qr" type="button">Close</button></div></div>' : '<p class="workspace-sub">Here are the gift ideas. Mark an item purchased to help other gift-givers avoid duplicates.</p>'}
      <div class="list-tools"><label for="item-search">Search items</label><input id="item-search" type="search" placeholder="Search by name or category"><label for="item-category-filter">Category</label><select id="item-category-filter"><option value="">All categories</option>${[...new Set(items.map(item => String(item.category || "Other")))].sort((a,b)=>a.localeCompare(b)).map(category => '<option value="' + escapeHtml(category) + '">' + escapeHtml(category) + '</option>').join("")}</select><label for="item-sort">Sort</label><select id="item-sort"><option value="custom">Custom order</option><option value="name">Name: A–Z</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="priority">Priority</option><option value="category">Category</option></select><div class="list-summary"><span id="visible-count">${items.length} items</span><span>Total listed price: <strong id="price-total"></strong></span></div></div><div class="item-list">${items.length ? items.map((item, index) => {
        const purchased = Boolean(purchases[item.id]);
        const url = safeUrl(item.url);
        const price = item.price !== "" && item.price != null && Number.isFinite(Number(item.price))
          ? '<div class="item-price">$' + Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "</div>"
          : "";
        const actions = owner
          ? '<div class="item-actions"><button class="small-button edit-item" data-index="' + index + '" type="button">Edit</button><button class="small-button remove-item" data-index="' + index + '" type="button">Remove</button></div>'
          : '<button class="small-button toggle-purchased" data-index="' + index + '" type="button" aria-pressed="' + purchased + '">' + (purchased ? "Marked purchased ✓" : "Mark purchased") + '</button>';
        return `<article class="wish-item ${!owner && purchased ? "purchased" : ""}" data-index="${index}" ${owner ? 'draggable="true"' : ""} data-search="${escapeHtml((item.name + " " + (item.category || "")).toLowerCase())}" data-name="${escapeHtml(item.name || "")}" data-category="${escapeHtml(item.category || "Other")}" data-priority="${escapeHtml(item.priority || "Would love")}" data-price="${Number(item.price) || 0}" data-has-price="${item.price !== "" && item.price != null && Number.isFinite(Number(item.price))}">
          <div class="item-placeholder" aria-hidden="true">${safeUrl(item.imageUrl) ? '<img class="item-image" src="' + escapeHtml(safeUrl(item.imageUrl)) + '" alt="" loading="lazy">' : (!owner && purchased ? "✓" : "♡")}</div>
          <div class="item-info"><span class="category-tag">${escapeHtml(item.category || "Other")}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.priority || "Would love")}${item.notes ? " · " + escapeHtml(item.notes) : ""}</p>${url ? '<a class="item-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">View at store ↗</a>' : ""}</div>
          ${price}${actions}
        </article>`;
      }).join("") : '<div class="empty-state">No items yet. Add an item to start building your wishlist.</div>'}</div>
      ${!owner ? '<p class="workspace-sub" style="margin-top:16px">Purchase information is stored separately from the wishlist items.</p>' : ""}
    `;
    $("#copy-code")?.addEventListener("click", () => copyText(list.code, "Wishlist code copied."));
    $("#preview-wishlist")?.addEventListener("click", () => openWishlistPreview(list, items));
    $("#print-wishlist")?.addEventListener("click", () => openWishlistPrintView(list, items));
    $("#copy-share")?.addEventListener("click", () => copyText(`I made a wishlist on Wishly! Open ${new URL("gift.html?code=" + encodeURIComponent(list.code), location.href).href}`, "Sharing message copied."));
    $("#show-qr")?.addEventListener("click", () => {
      const panel = $("#qr-panel"); const target = $("#qr-code");
      panel.classList.remove("hidden"); target.innerHTML = "";
      const shareUrl = new URL("gift.html?code=" + encodeURIComponent(list.code), location.href).href;
      if (window.QRCode) new QRCode(target, {text:shareUrl,width:190,height:190,colorDark:"#24252c",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
      else target.textContent = "QR code library did not load. Copy the sharing link instead.";
      $("#download-qr")?.addEventListener("click", () => { const canvas=target.querySelector("canvas"); const img=target.querySelector("img"); const link=document.createElement("a"); link.download="wishly-qr.png"; link.href=canvas ? canvas.toDataURL("image/png") : img?.src || ""; if(link.href) link.click(); });
    });
    $("#hide-qr")?.addEventListener("click", () => $("#qr-panel")?.classList.add("hidden"));
    $("#reveal-purchases-prank")?.addEventListener("click", () => toast("Woah there! You really thought I’d tell you? Just kidding — gift reservations stay a secret from the list owner."));
    const searchInput = $("#item-search");
    const categoryFilter = $("#item-category-filter");
    const sortSelect = $("#item-sort");
    const filterCards = () => {
      const term = (searchInput?.value || "").trim().toLowerCase();
      const category = categoryFilter?.value || "";
      const cards = [...workspace.querySelectorAll(".wish-item")];
      const priorityRank = value => ({ "must have": 0, "high": 0, "would love": 1, "medium": 1, "nice to have": 2, "low": 2 })[String(value || "").toLowerCase()] ?? 3;
      cards.forEach(card => {
        const matchesText = (card.dataset.search || "").includes(term);
        const matchesCategory = !category || card.dataset.category === category;
        card.classList.toggle("filtered-out", !(matchesText && matchesCategory));
      });
      const sort = sortSelect?.value || "custom";
      cards.sort((a,b) => {
        if (sort === "name") return (a.dataset.name || "").localeCompare(b.dataset.name || "");
        if (sort === "price-low" || sort === "price-high") {
          const fallback = sort === "price-low" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
          const ap = a.dataset.hasPrice === "true" ? Number(a.dataset.price) : fallback;
          const bp = b.dataset.hasPrice === "true" ? Number(b.dataset.price) : fallback;
          return (sort === "price-low" ? ap-bp : bp-ap) || Number(a.dataset.index)-Number(b.dataset.index);
        }
        if (sort === "priority") return priorityRank(a.dataset.priority)-priorityRank(b.dataset.priority) || (a.dataset.name || "").localeCompare(b.dataset.name || "");
        if (sort === "category") return (a.dataset.category || "").localeCompare(b.dataset.category || "") || (a.dataset.name || "").localeCompare(b.dataset.name || "");
        return Number(a.dataset.index)-Number(b.dataset.index);
      });
      const itemList = workspace.querySelector(".item-list");
      cards.forEach(card => { itemList.appendChild(card); card.draggable = activeMode === "owner" && sort === "custom"; });
      let shown = 0, total = 0;
      cards.forEach(card => { if (!card.classList.contains("filtered-out")) { shown++; if (card.dataset.hasPrice === "true") total += Number(card.dataset.price) || 0; } });
      const count = $("#visible-count"); if(count) count.textContent = shown + (shown === 1 ? " item" : " items");
      const sum = $("#price-total"); if(sum) sum.textContent = total.toLocaleString(undefined,{style:"currency",currency:"USD"});
    };
    searchInput?.addEventListener("input", filterCards);
    categoryFilter?.addEventListener("change", filterCards);
    sortSelect?.addEventListener("change", filterCards);
    filterCards();
    $("#add-item")?.addEventListener("click", () => {
      itemForm.reset();
      delete itemForm.dataset.editingId;
      $("#item-dialog-title").textContent = "Add an item";
      $("#item-submit").innerHTML = 'Add to wishlist <span>+</span>';
      $("#item-category").value = "Other";
      dialog.showModal();
      $("#item-name").focus();
    });
    const itemList = workspace.querySelector(".item-list");
    if (owner && itemList) {
      let draggedCard = null;
      itemList.querySelectorAll('.wish-item[draggable="true"]').forEach(card => {
        card.addEventListener("dragstart", event => { draggedCard = card; card.classList.add("is-dragging"); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", card.dataset.index || ""); });
        card.addEventListener("dragend", () => { card.classList.remove("is-dragging"); itemList.querySelectorAll(".wish-item").forEach(item => item.classList.remove("drop-before", "drop-after")); draggedCard = null; });
        card.addEventListener("dragover", event => { if (!draggedCard || draggedCard === card) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; const rect = card.getBoundingClientRect(); const after = event.clientY > rect.top + rect.height / 2; card.classList.toggle("drop-after", after); card.classList.toggle("drop-before", !after); });
        card.addEventListener("dragleave", () => card.classList.remove("drop-before", "drop-after"));
        card.addEventListener("drop", async event => {
          event.preventDefault(); if (!draggedCard || draggedCard === card) return;
          const from = Number(draggedCard.dataset.index); let to = Number(card.dataset.index);
          if (event.clientY > card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2) to += 1; if (from < to) to -= 1;
          const reordered = [...activeItemDocs]; const moved = reordered.splice(from, 1)[0]; reordered.splice(to, 0, moved);
          try { const batch = writeBatch(db); reordered.forEach((item, order) => batch.update(doc(db, "wishlists", activeListId, "items", item.id), { sortOrder: order })); await batch.commit(); await openWorkspace(activeList, "owner"); toast("Wishlist order updated."); } catch (error) { toast(friendlyError(error)); }
        });
      });
    }
    workspace.querySelectorAll(".edit-item").forEach(button => button.addEventListener("click", () => {
      const item = activeItemDocs[Number(button.dataset.index)];
      if (!item) return;
      itemForm.reset();
      itemForm.dataset.editingId = item.id;
      $("#item-name").value = item.name || "";
      $("#item-category").value = item.category || "Other";
      $("#item-url").value = item.url || "";
      $("#item-image").value = item.imageUrl || "";
      $("#item-price").value = item.price ?? "";
      $("#item-priority").value = item.priority || "Would love";
      $("#item-notes").value = item.notes || "";
      $("#item-dialog-title").textContent = "Edit item";
      $("#item-submit").innerHTML = 'Save changes <span>✓</span>';
      dialog.showModal();
      $("#item-name").focus();
    }));
    workspace.querySelectorAll(".remove-item").forEach(button => button.addEventListener("click", async () => {
      const item = activeItemDocs[Number(button.dataset.index)];
      if (!item || !confirm("Remove this item from your wishlist?")) return;
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, "wishlists", activeListId, "items", item.id));
        batch.delete(doc(db, "wishlists", activeListId, "purchases", item.id));
        batch.delete(doc(db, "wishlists", activeListId, "reservations", item.id));
        await batch.commit();
        await openWorkspace(activeList, "owner");
        toast("Item removed.");
      } catch (error) { toast(friendlyError(error)); }
    }));
    workspace.querySelectorAll(".toggle-purchased").forEach(button => button.addEventListener("click", async () => {
      const item = activeItemDocs[Number(button.dataset.index)];
      if (!item) return;
      try {
        await setDoc(doc(db, "wishlists", activeListId, "purchases", item.id), {
          purchased: true, updatedAt: serverTimestamp()
        });
        await openWorkspace(activeList, "gift");
        toast("Purchase status updated.");
      } catch (error) { toast(friendlyError(error)); }
    }));
  } catch (error) {
    workspace.innerHTML = '<div class="empty-state">Could not open this wishlist. Check the Firestore rules and refresh.</div>';
    toast(friendlyError(error));
    console.error("Wishly: failed to open wishlist", error);
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
    const list = {
      code, ownerUid: user.uid, ownerName, title,
      occasion: String(data.get("occasion") || "Other"),
      eventDate: String(data.get("eventDate") || ""),
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, "wishlists", code), list);
    createForm.reset();
    await loadOwnedLists(user);
    await openWorkspace({ ...list, createdAt: new Date() }, "owner");
    window.wishlyCelebrate?.();
    toast("Wishlist created. Copy the code to share it.");
  } catch (error) {
    toast(friendlyError(error));
    console.error("Wishly: failed to create wishlist", error);
  } finally { button.disabled = false; }
});

itemForm.addEventListener("submit", async event => {
  event.preventDefault();
  const user = auth.currentUser;
  if (!user || user.isAnonymous || activeMode !== "owner" || !activeList || activeList.ownerUid !== user.uid) {
    toast("Sign in with the account that owns this wishlist to add items.");
    dialog.close();
    return;
  }
  const data = new FormData(itemForm);
  const name = String(data.get("itemName") || "").trim();
  const rawUrl = String(data.get("itemUrl") || "").trim();
  const url = rawUrl ? safeUrl(rawUrl) : "";
  if (!name) { toast("Please enter an item name."); return; }
  if (rawUrl && !url) { toast("Use a valid http or https store link."); return; }
  const itemData = {
    name,
    category: String(data.get("itemCategory") || "Other").trim() || "Other",
    url,
    imageUrl: safeUrl(String(data.get("itemImage") || "").trim()),
    price: String(data.get("itemPrice") || ""),
    priority: String(data.get("itemPriority") || "Would love"),
    notes: String(data.get("itemNotes") || "").trim()
  };
  const submit = $("#item-submit");
  submit.disabled = true;
  try {
    const editingId = itemForm.dataset.editingId;
    if (editingId) {
      await updateDoc(doc(db, "wishlists", activeListId, "items", editingId), itemData);
    } else {
      await addDoc(collection(db, "wishlists", activeListId, "items"), {
        ...itemData, sortOrder: activeItemDocs.length, createdAt: serverTimestamp()
      });
    }
    delete itemForm.dataset.editingId;
    dialog.close();
    await openWorkspace(activeList, "owner");
    if (!editingId) window.wishlyCelebrate?.();
    toast(editingId ? "Item updated." : "Item added to your wishlist.");
  } catch (error) {
    toast(friendlyError(error));
    console.error("Wishly: failed to save item", error);
  } finally { submit.disabled = false; }
});

$("#show-gift-ideas")?.addEventListener("click", () => $("#gift-ideas")?.classList.toggle("hidden"));
$("#gift-ideas")?.querySelectorAll("button[data-name]").forEach(button => button.addEventListener("click", () => {
  $("#item-name").value = button.dataset.name || "";
  $("#item-category").value = button.dataset.category || "Other";
  $("#item-name").focus();
}));
$("#close-modal").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

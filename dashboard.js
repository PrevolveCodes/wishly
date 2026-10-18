import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth, signOut, onAuthStateChanged
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
const signOutButton = $("#sign-out");
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

signOutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "signup.html";
  } catch (error) { toast(friendlyError(error)); }
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
      <div class="owned-list-icon" aria-hidden="true">♡</div>
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
          for (let i = 0; i < items.docs.length; i += 400) {
            const batch = writeBatch(db);
            items.docs.slice(i, i + 400).forEach(item => batch.delete(item.ref));
            await batch.commit();
          }
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
  const snap = await getDocs(query(
    collection(db, "wishlists", code, "items"),
    orderBy("createdAt", "asc")
  ));
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
      ${owner ? '<p class="workspace-sub">Keep this code safe and share it with your gift-givers. Add your first item below.</p><div class="workspace-actions"><button class="button button-primary" id="add-item" type="button" style="width:auto;margin:0;gap:22px">Add an item <span>+</span></button><button class="small-button" id="copy-share" type="button">Copy sharing message</button><button class="small-button" id="show-qr" type="button">Show QR code</button><button class="small-button" id="reveal-purchases-prank" type="button">Reveal what’s being bought</button></div><div id="qr-panel" class="qr-panel hidden"><div id="qr-code"></div><div><strong>Scan to open this wishlist</strong><p class="workspace-sub">Anyone with the link and code can view this list.</p><button class="small-button" id="download-qr" type="button">Download QR</button><button class="small-button" id="hide-qr" type="button">Close</button></div></div>' : '<p class="workspace-sub">Here are the gift ideas. Mark an item purchased to help other gift-givers avoid duplicates.</p>'}
      <div class="list-tools"><label for="item-search">Search items</label><input id="item-search" type="search" placeholder="Search by name or category"><div class="list-summary"><span id="visible-count">${items.length} items</span><span>Total listed price: <strong id="price-total"></strong></span></div></div><div class="item-list">${items.length ? items.map((item, index) => {
        const purchased = Boolean(purchases[item.id]);
        const url = safeUrl(item.url);
        const price = item.price !== "" && item.price != null && Number.isFinite(Number(item.price))
          ? '<div class="item-price">$' + Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "</div>"
          : "";
        const actions = owner
          ? '<button class="small-button edit-item" data-index="' + index + '" type="button">Edit</button><button class="small-button remove-item" data-index="' + index + '" type="button">Remove</button>'
          : '<button class="small-button toggle-purchased" data-index="' + index + '" type="button" aria-pressed="' + purchased + '">' + (purchased ? "Marked purchased ✓" : "Mark purchased") + "</button>";
        return `<article class="wish-item ${!owner && purchased ? "purchased" : ""}" data-search="${escapeHtml((item.name + " " + (item.category || "")).toLowerCase())}" data-price="${Number(item.price) || 0}" data-has-price="${item.price !== "" && item.price != null && Number.isFinite(Number(item.price))}">
          <div class="item-placeholder" aria-hidden="true">${safeUrl(item.imageUrl) ? '<img class="item-image" src="' + escapeHtml(safeUrl(item.imageUrl)) + '" alt="" loading="lazy">' : (!owner && purchased ? "✓" : "♡")}</div>
          <div class="item-info"><span class="category-tag">${escapeHtml(item.category || "Other")}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.priority || "Would love")}${item.notes ? " · " + escapeHtml(item.notes) : ""}</p>${url ? '<a class="item-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">View at store ↗</a>' : ""}</div>
          ${price}${actions}
        </article>`;
      }).join("") : '<div class="empty-state">No items yet. Add an item to start building your wishlist.</div>'}</div>
      ${!owner ? '<p class="workspace-sub" style="margin-top:16px">Purchase information is stored separately from the wishlist items.</p>' : ""}
    `;
    $("#copy-code")?.addEventListener("click", () => copyText(list.code, "Wishlist code copied."));
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
    const filterCards = () => {
      const term = (searchInput?.value || "").trim().toLowerCase(); let shown = 0; let total = 0;
      workspace.querySelectorAll(".wish-item").forEach(card => { const match = (card.dataset.search || "").includes(term); card.classList.toggle("filtered-out", !match); if(match){shown++; if(card.dataset.hasPrice === "true") total += Number(card.dataset.price)||0;} });
      const count = $("#visible-count"); if(count) count.textContent = shown + (shown === 1 ? " item" : " items");
      const sum = $("#price-total"); if(sum) sum.textContent = total.toLocaleString(undefined,{style:"currency",currency:"USD"});
    };
    searchInput?.addEventListener("input", filterCards); filterCards();
    $("#add-item")?.addEventListener("click", () => {
      itemForm.reset();
      delete itemForm.dataset.editingId;
      $("#item-dialog-title").textContent = "Add an item";
      $("#item-submit").innerHTML = 'Add to wishlist <span>+</span>';
      $("#item-category").value = "Other";
      dialog.showModal();
      $("#item-name").focus();
    });
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
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, "wishlists", code), list);
    createForm.reset();
    await loadOwnedLists(user);
    await openWorkspace({ ...list, createdAt: new Date() }, "owner");
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
        ...itemData, createdAt: serverTimestamp()
      });
    }
    delete itemForm.dataset.editingId;
    dialog.close();
    await openWorkspace(activeList, "owner");
    toast(editingId ? "Item updated." : "Item added to your wishlist.");
  } catch (error) {
    toast(friendlyError(error));
    console.error("Wishly: failed to save item", error);
  } finally { submit.disabled = false; }
});

$("#close-modal").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

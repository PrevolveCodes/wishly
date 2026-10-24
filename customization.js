import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
const $ = (s, root = document) => root.querySelector(s);

const safeUrl = value => {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; }
  catch { return ""; }
};
const safeColor = value => /^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#2878e7";
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function applyCustomization(root, list) {
  if (!root || !list) return;
  const color = safeColor(list.themeColor);
  root.style.setProperty("--wishly-list-accent", color);
  root.classList.add("has-list-customization");
  const old = root.querySelector(".wishlist-custom-banner");
  old?.remove();
  const message = String(list.customMessage || "").trim();
  const cover = safeUrl(list.coverImageUrl);
  if (!message && !cover && !list.eventDate) return;
  const banner = document.createElement("section");
  banner.className = "wishlist-custom-banner";
  banner.style.setProperty("--wishly-list-accent", color);
  banner.innerHTML = `${cover ? `<img class="wishlist-cover" src="${esc(cover)}" alt="" loading="lazy">` : ""}<div class="wishlist-custom-content">${list.eventDate ? `<div class="wishlist-event-date">${esc(formatDate(list.eventDate))}</div>` : ""}${message ? `<p>${esc(message)}</p>` : ""}</div>`;
  const head = root.querySelector(".workspace-head");
  head?.insertAdjacentElement("afterend", banner);
}
function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {month:"long", day:"numeric", year:"numeric"});
}

async function getList(code) {
  if (!code) return null;
  const snap = await getDoc(doc(db, "wishlists", code));
  return snap.exists() ? { code, ...snap.data() } : null;
}

function dashboardMode() {
  const workspace = $("#workspace");
  if (!workspace) return;
  const observer = new MutationObserver(async () => {
    const chip = workspace.querySelector(".code-chip");
    const actions = workspace.querySelector(".workspace-actions");
    if (!chip || !actions) return;
    const code = (chip.textContent || "").replace(/Copy/g, "").trim();
    if (!/^[A-HJ-NP-Z2-9]{10}$/.test(code)) return;
    if (workspace.dataset.customizationCode === code && actions.querySelector("#customize-list")) return;

    workspace.dataset.customizationCode = code;
    actions.querySelector("#customize-list")?.remove();
    workspace.querySelector(".wishlist-custom-banner")?.remove();
    workspace.classList.remove("has-list-customization");

    const button = document.createElement("button");
    button.className = "small-button";
    button.id = "customize-list";
    button.type = "button";
    button.textContent = "Customize wishlist";
    actions.appendChild(button);
    button.addEventListener("click", async () => openEditor(code, true));

    try {
      const list = await getList(code);
      const currentCode = (workspace.querySelector(".code-chip")?.textContent || "").replace(/Copy/g, "").trim();
      if (list && currentCode === code && workspace.dataset.customizationCode === code) {
        applyCustomization(workspace, list);
      }
    } catch (error) {
      console.error("Wishly: could not load wishlist customization", error);
    }
  });
  observer.observe(workspace, {childList:true, subtree:true});
}

function ensureDialog() {
  let dialog = $("#customize-dialog");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "customize-dialog";
  dialog.className = "modal customization-modal";
  dialog.innerHTML = `<form method="dialog" id="customize-form"><div class="modal-top"><div><div class="eyebrow">WISHLIST DESIGN</div><h2>Customize your wishlist</h2></div><button class="icon-button" id="customize-close" type="button" aria-label="Close">×</button></div><p class="workspace-sub">Make this wishlist feel like yours. These details are visible to gift-givers.</p><label for="custom-cover">Cover image URL</label><input id="custom-cover" type="url" placeholder="https://…image.jpg"><label for="custom-color">Theme color</label><div class="custom-color-row"><input id="custom-color" type="color" value="#2878e7"><input id="custom-color-text" maxlength="7" value="#2878e7" aria-label="Theme color hex code"></div><label for="custom-date">Event date</label><input id="custom-date" type="date"><label for="custom-message">Message for gift-givers</label><textarea id="custom-message" maxlength="300" rows="4" placeholder="Thanks for checking out my wishlist!"></textarea><div class="custom-preview" id="custom-preview">Your customization preview will appear here.</div><button class="button button-primary" id="custom-save" type="submit">Save customization <span>✓</span></button></form>`;
  document.body.appendChild(dialog);
  $("#customize-close").addEventListener("click", () => dialog.close());
  $("#custom-color").addEventListener("input", e => $("#custom-color-text").value = e.target.value);
  $("#custom-color-text").addEventListener("input", e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) $("#custom-color").value = e.target.value; });
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
  return dialog;
}

async function openEditor(code, owner) {
  const list = await getList(code);
  if (!list) return;
  const dialog = ensureDialog();
  $("#custom-cover").value = list.coverImageUrl || "";
  $("#custom-color").value = safeColor(list.themeColor);
  $("#custom-color-text").value = safeColor(list.themeColor);
  $("#custom-date").value = list.eventDate || "";
  $("#custom-message").value = list.customMessage || "";
  const form = $("#customize-form");
  form.onsubmit = async event => {
    event.preventDefault();
    const user = getAuth(app).currentUser;
    if (!owner || !user || user.isAnonymous || list.ownerUid !== user.uid) return;
    const coverRaw = $("#custom-cover").value.trim();
    const cover = coverRaw ? safeUrl(coverRaw) : "";
    if (coverRaw && !cover) { alert("Use a valid http or https image URL."); return; }
    const color = safeColor($("#custom-color-text").value.trim());
    const data = { coverImageUrl: cover, themeColor: color, eventDate: $("#custom-date").value, customMessage: $("#custom-message").value.trim() };
    const save = $("#custom-save"); save.disabled = true;
    try {
      await updateDoc(doc(db, "wishlists", code), data);
      dialog.close();
      applyCustomization($("#workspace"), {...list, ...data});
      showToast("Wishlist customization saved.");
    } catch (error) {
      console.error("Wishly: customization save failed", error);
      showToast(error?.code === "permission-denied" ? "Firebase denied the update. Publish the updated Firestore rules first." : "Could not save your customization.");
    } finally { save.disabled = false; }
  };
  dialog.showModal();
}

function showToast(message) {
  const notice = $("#notice");
  if (!notice) return;
  notice.textContent = message;
  notice.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => notice.classList.add("hidden"), 4000);
}

async function giftMode() {
  const workspace = $("#workspace");
  if (!workspace) return;
  let lastAppliedHead = null;
  let loadingHead = null;
  const observer = new MutationObserver(async () => {
    const code = new URLSearchParams(location.search).get("code")?.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 10);
    const head = workspace.querySelector(".workspace-head");
    if (!code || !head || head === lastAppliedHead || head === loadingHead) return;
    loadingHead = head;
    try {
      const list = await getList(code);
      const currentCode = new URLSearchParams(location.search).get("code")?.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 10);
      if (list && currentCode === code && workspace.querySelector(".workspace-head") === head) {
        applyCustomization(workspace, list);
        lastAppliedHead = head;
      }
    } catch (error) {
      console.error("Wishly: could not load shared wishlist customization", error);
    } finally {
      if (loadingHead === head) loadingHead = null;
    }
  });
  observer.observe(workspace, {childList:true, subtree:true});
}

if (document.body.classList.contains("dashboard-page")) dashboardMode();
else giftMode();

import {
  onAuthStateChanged, reload, sendEmailVerification, signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  collection, deleteDoc, doc, getDocFromServer, getDocsFromServer,
  onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export function watchGiftReservations(db, auth) {
  let view;
  let revision = 0;
  let stopClaims;
  onAuthStateChanged(auth, refresh);

  function resetItems(items) {
    for (const item of items) {
      item.hidden = true;
      item.querySelector("[data-reservation-status]").textContent = "";
      const button = item.querySelector("button");
      button.textContent = "Reserve gift";
      button.onclick = null;
    }
  }

  function clear() {
    stopClaims?.();
    stopClaims = undefined;
    revision++;
    if (!view) return;
    view.controls.replaceChildren();
    view.controls.hidden = true;
    resetItems(view.items);
    view = undefined;
  }

  function show(list, workspace) {
    clear();
    view = {
      list,
      controls: workspace.querySelector("#gift-reservation-controls"),
      items: [...workspace.querySelectorAll("[data-reservation-item]")]
    };
    refresh();
  }

  async function refresh() {
    const current = view;
    if (!current) return;
    const request = ++revision;
    const stillHere = () => request === revision;
    stopClaims?.();
    stopClaims = undefined;

    const { list, controls, items } = current;
    const { code, ownerUid } = list;
    resetItems(items);
    controls.hidden = false;
    controls.innerHTML = '<h3>Gift reservations</h3><div class="gift-reservation-actions"></div><p class="gift-reservation-feedback" role="status"></p>';
    const actions = controls.querySelector(".gift-reservation-actions");
    const feedback = controls.querySelector(".gift-reservation-feedback");
    const user = auth.currentUser;
    const signInUrl = "signup.html?gift=" + encodeURIComponent(code);
    const giftUrl = new URL("gift.html?code=" + encodeURIComponent(code), location.href).href;
    const plan = doc(db, "wishlists", code, "giftPlans", ownerUid);
    const guests = collection(plan, "guests");
    const claims = collection(plan, "claims");
    const email = user?.email?.trim().toLowerCase() ?? "";

    function message(text) {
      if (stillHere()) feedback.textContent = text;
    }

    function describe(text) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      actions.append(paragraph);
    }

    function link(label, href, parent = actions) {
      const element = document.createElement("a");
      element.className = "small-button";
      element.href = href;
      element.textContent = label;
      parent.append(element);
      return element;
    }

    function button(label, action) {
      const element = document.createElement("button");
      element.className = "small-button";
      element.type = "button";
      element.textContent = label;
      element.addEventListener("click", () => submit(element, action));
      actions.append(element);
    }

    async function submit(element, action) {
      if (!stillHere() || element.disabled) return;
      element.disabled = true;
      message("");
      try {
        await action();
      } catch (error) {
        message(error?.code === "auth/too-many-requests"
          ? "Please wait a little before trying again."
          : "Wishly couldn’t complete that action. Try again or refresh the page.");
      } finally {
        element.disabled = false;
      }
    }

    function switchAccount() {
      button("Switch account", async () => {
        await signOut(auth);
        location.assign(signInUrl);
      });
    }

    function emailForm(label, submitLabel, action) {
      const form = document.createElement("form");
      form.className = "gift-invite-form";
      form.innerHTML = '<label></label><div><input name="email" type="email" autocomplete="email" maxlength="254" required><button class="small-button" type="submit"></button></div>';
      const input = form.elements.email;
      input.id = "gift-invite-email";
      form.querySelector("label").htmlFor = input.id;
      form.querySelector("label").textContent = label;
      const send = form.querySelector("button");
      send.textContent = submitLabel;
      form.addEventListener("submit", event => {
        event.preventDefault();
        submit(send, async () => {
          const address = input.value.trim().toLowerCase();
          if (!isInviteEmail(address) || address === email) {
            message(address === email ? "Choose someone with a different email address." : "Enter a valid email address.");
            return;
          }
          await action(address);
        });
      });
      actions.append(form);
    }

    function invitationLink(email, organizer, parent = actions) {
      const subject = organizer ? "Help organize gifts on Wishly" : "You’re invited to reserve gifts on Wishly";
      const instructions = organizer
        ? "Sign in with this email to accept the gift organizer invitation."
        : "Sign in with this email to see which gifts are available and reserve one.";
      const recipient = encodeURIComponent(email).replace("%40", "@");
      const draft = link("Open email draft", "mailto:" + recipient +
        "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(instructions + "\n\n" + giftUrl), parent);
      draft.setAttribute("aria-label", "Open email draft for " + email);
    }

    function showOwner(planData) {
      describe("You can browse this wishlist and choose a trusted gift organizer. Reservation activity is hidden from your account.");
      if (!planData) {
        emailForm("Organizer’s email", "Choose organizer", async address => {
          await setDoc(plan, { organizerEmail: address, organizerUid: "", invitedAt: serverTimestamp() });
          await refresh();
        });
      } else if (!planData.organizerUid) {
        describe("Waiting for " + planData.organizerEmail + " to accept. Send them the wishlist link using the email draft below.");
        invitationLink(planData.organizerEmail, true);
        button("Cancel pending invitation", async () => { await deleteDoc(plan); await refresh(); });
      } else {
        describe(planData.organizerEmail + " is organizing gifts and can invite gift-givers.");
      }
    }

    async function showOrganizer() {
      describe("You organize gifts for this wishlist. Add each gift-giver’s email, then send them the wishlist link.");
      const inviteList = document.createElement("ul");
      inviteList.className = "gift-invite-list";
      inviteList.setAttribute("aria-label", "Invited gift-givers");
      const invitations = await getDocsFromServer(guests);
      if (!stillHere()) return;
      const invited = new Set(invitations.docs.map(invite => invite.id));
      for (const address of [...invited].sort()) addInvite(address);
      emailForm("Gift-giver’s email", "Add invitation", async address => {
        if (invited.has(address)) {
          message("That email is already invited. You can open its email draft below.");
          return;
        }
        await setDoc(doc(guests, address), { invitedAt: serverTimestamp() });
        if (!stillHere()) return;
        invited.add(address);
        addInvite(address);
        actions.querySelector("form").reset();
        message("Invitation added. Open the email draft to send the link.");
      });
      actions.append(inviteList);

      function addInvite(address) {
        const row = document.createElement("li");
        const label = document.createElement("span");
        label.textContent = address;
        row.append(label);
        invitationLink(address, false, row);
        inviteList.append(row);
      }
    }

    function watchClaims() {
      const reserved = new Map();
      const pending = new Set();
      let authorized = false;
      const slots = items.map(element => {
        const label = element.querySelector("[data-reservation-status]");
        const button = element.querySelector("button");
        const id = element.dataset.reservationItem;
        button.onclick = () => changeClaim(id);
        return { id, element, label, button };
      });
      function updateItems() {
        for (const { id, element, label, button } of slots) {
          const claim = reserved.get(id);
          const own = claim === user.uid;
          element.hidden = !authorized;
          label.textContent = authorized ? (own ? "Reserved by you" : claim ? "Reserved" : "Available") : "";
          button.textContent = own ? "Undo reservation" : "Reserve gift";
          button.hidden = Boolean(claim && !own);
          button.disabled = !authorized || pending.has(id);
        }
      }

      async function changeClaim(id) {
        if (!stillHere() || !authorized || pending.has(id)) return;
        const existing = reserved.get(id);
        if (existing && existing !== user.uid) return;
        const releasing = existing === user.uid;
        pending.add(id);
        updateItems();
        try {
          const result = await runTransaction(db, async transaction => {
            const reference = doc(claims, id);
            const claim = await transaction.get(reference);
            if (releasing) {
              if (!claim.exists()) return "Reservation released.";
              if (claim.data().reservedBy !== user.uid) return "That gift is now reserved by someone else.";
              transaction.delete(reference);
              return "Reservation released.";
            }
            if (claim.exists()) return claim.data().reservedBy === user.uid
              ? "You already reserved this gift."
              : "Someone else has already reserved that gift.";
            transaction.set(reference, { reservedBy: user.uid, reservedAt: serverTimestamp() });
            return "Gift reserved.";
          });
          message(result);
        } catch {
          message("Wishly couldn’t update that reservation. Refresh and try again.");
        } finally {
          pending.delete(id);
          if (stillHere()) updateItems();
        }
      }

      message("Checking availability…");
      stopClaims = onSnapshot(claims, { includeMetadataChanges: true }, snapshot => {
        if (!stillHere()) return;
        // Only render reservation data after Firestore has authorized a server response for this session.
        if (snapshot.metadata.fromCache) {
          authorized = false;
          updateItems();
          message("Waiting to confirm availability…");
          return;
        }
        if (!authorized) message("");
        authorized = true;
        reserved.clear();
        for (const claim of snapshot.docs) reserved.set(claim.id, claim.data().reservedBy);
        updateItems();
      }, () => {
        if (!stillHere()) return;
        authorized = false;
        updateItems();
        message("Reservation availability couldn’t be loaded. Refresh to try again.");
      });
    }

    try {
      if (user?.uid === ownerUid && !user.isAnonymous) {
        const lookup = await getDocFromServer(plan);
        if (stillHere()) showOwner(lookup.data());
        return;
      }
      if (!user || user.isAnonymous) {
        describe("You can browse this list. If you received an invitation, sign in with the invited email to reserve gifts.");
        link("Sign in or create an account", signInUrl);
        return;
      }
      if (!user.emailVerified || !isInviteEmail(email)) {
        describe("Verify your invited email to access gift reservations.");
        button("Send verification email", async () => {
          await sendEmailVerification(user);
          message("Verification email sent. Open it, then select Check verification here.");
        });
        button("Check verification", async () => {
          await reload(user);
          if (!user.emailVerified) {
            message("This email is still unverified. Open the link in your verification email first.");
            return;
          }
          await user.getIdToken(true);
          if (stillHere()) await refresh();
        });
        switchAccount();
        return;
      }
      const [assignment, invitation] = await Promise.all([
        getDocFromServer(plan).catch(error => {
          if (error?.code === "permission-denied") return null;
          throw error;
        }),
        getDocFromServer(doc(guests, email))
      ]);
      if (!stillHere()) return;
      const planData = assignment?.data();
      if (planData && !planData.organizerUid) {
        describe("You’ve been invited to organize gifts. Accept to invite gift-givers and use reservations.");
        button("Accept organizer invitation", async () => {
          await updateDoc(plan, { organizerUid: user.uid, acceptedAt: serverTimestamp() });
          await refresh();
        });
      } else if (planData?.organizerUid === user.uid) {
        await showOrganizer();
        if (stillHere()) watchClaims();
      } else if (invitation.exists()) {
        describe("You can reserve a gift or undo your own reservation. The list maker won’t see reservation activity.");
        watchClaims();
      } else {
        describe("This account doesn’t have a gift invitation. You can browse, or switch to the email your organizer invited.");
        switchAccount();
      }
    } catch {
      message("Wishly couldn’t check gift invitations. You can still browse the list.");
      if (stillHere()) button("Try again", refresh);
    }
  }

  return { clear, show };
}

function isInviteEmail(email) {
  return email.length <= 254 && /^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email);
}

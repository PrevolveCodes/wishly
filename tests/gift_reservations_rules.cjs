const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const {
  collection, deleteDoc, doc, getDoc, getDocs, runTransaction, serverTimestamp, setDoc, updateDoc
} = require("firebase/firestore");

const code = "ABCD234567";
const otherCode = "BCDE234567";
const ownerUid = "maker";
const organizerEmail = "organizer@example.test";
const approved = ["guest-one@example.test", "guest-two@example.test"];
const planPath = ["wishlists", code, "giftPlans", ownerUid];
const claimPath = [...planPath, "claims", "gift"];
const itemPath = ["wishlists", code, "items", "gift"];
const [host, port = "8080"] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080").split(":");

async function main() {
  const env = await initializeTestEnvironment({
    projectId: "demo-wishly-reservations",
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync(join(__dirname, "..", "firestore.rules"), "utf8")
    }
  });

  function account(uid, email, emailVerified = true, provider = "password") {
    return env.authenticatedContext(uid, {
      email, email_verified: emailVerified, firebase: { sign_in_provider: provider }
    }).firestore();
  }

  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      for (const id of [code, otherCode]) {
        await setDoc(doc(db, "wishlists", id), { code: id, ownerUid, title: "Birthday gifts" });
        await setDoc(doc(db, "wishlists", id, "items", "gift"), { name: "A gift" });
      }
    });

    const maker = account(ownerUid, "maker@example.test");
    const organizer = account("organizer", organizerEmail);
    const one = account("one", approved[0]);
    const two = account("two", approved[1]);
    const unverifiedOrganizer = account("organizer", organizerEmail, false);
    const unverifiedGuest = account("one", approved[0], false);
    const stranger = account("stranger", "second-account@example.test");
    const anonymous = account("anonymous", approved[0], true, "anonymous");
    const signedOut = env.unauthenticatedContext().firestore();

    const organizerInvite = email => ({ organizerEmail: email, organizerUid: "", invitedAt: serverTimestamp() });
    await assertFails(setDoc(doc(maker, ...planPath), organizerInvite("maker@example.test")));
    await assertFails(setDoc(doc(stranger, ...planPath), organizerInvite(organizerEmail)));
    await assertSucceeds(setDoc(doc(maker, ...planPath), organizerInvite(organizerEmail)));
    await assertSucceeds(getDoc(doc(maker, ...planPath)));
    await assertSucceeds(getDoc(doc(organizer, ...planPath)));
    await assertFails(getDoc(doc(stranger, ...planPath)));
    const accept = user => ({ organizerUid: user, acceptedAt: serverTimestamp() });
    const guestInvite = () => ({ invitedAt: serverTimestamp() });
    await assertFails(updateDoc(doc(unverifiedOrganizer, ...planPath), accept("organizer")));
    await assertFails(updateDoc(doc(stranger, ...planPath), accept("stranger")));
    await assertFails(setDoc(doc(organizer, ...planPath, "guests", approved[0]), guestInvite()));
    await assertSucceeds(updateDoc(doc(organizer, ...planPath), accept("organizer")));
    await assertFails(updateDoc(doc(maker, ...planPath), { organizerEmail: "second-account@example.test" }));
    await assertFails(deleteDoc(doc(maker, ...planPath)));
    await assertFails(setDoc(doc(maker, ...planPath, "guests", "second-account@example.test"), guestInvite()));
    await assertFails(setDoc(doc(stranger, ...planPath, "guests", "second-account@example.test"), guestInvite()));
    for (const address of approved) {
      await assertSucceeds(setDoc(doc(organizer, ...planPath, "guests", address), guestInvite()));
    }
    await assertSucceeds(getDocs(collection(organizer, ...planPath, "guests")));
    await assertFails(getDocs(collection(one, ...planPath, "guests")));
    await assertFails(getDoc(doc(one, ...planPath, "guests", approved[1])));
    await assertFails(setDoc(doc(organizer, "wishlists", otherCode, "giftPlans", ownerUid, "guests", approved[0]), guestInvite()));

    function claim(db, uid, path = claimPath) {
      return runTransaction(db, async tx => {
        const ref = doc(db, ...path);
        if ((await tx.get(ref)).exists()) return false;
        tx.set(ref, { reservedBy: uid, reservedAt: serverTimestamp() });
        return true;
      });
    }
    await assertFails(claim(one, "one", [...planPath, "claims", "missing-item"]));
    await assertFails(claim(one, "two"));
    const results = await Promise.all([claim(one, "one"), claim(two, "two")]);
    assert.equal(results.filter(Boolean).length, 1);

    const [winner, loser] = results[0] ? [one, two] : [two, one];
    await assertSucceeds(getDocs(collection(winner, ...planPath, "claims")));
    await assertSucceeds(getDoc(doc(loser, ...claimPath)));
    await assertFails(deleteDoc(doc(loser, ...claimPath)));
    for (const db of [maker, unverifiedGuest, stranger, anonymous, signedOut]) {
      await assertSucceeds(getDoc(doc(db, ...itemPath)));
      await assertFails(getDoc(doc(db, ...claimPath)));
      await assertFails(getDocs(collection(db, ...planPath, "claims")));
    }
    await assertFails(deleteDoc(doc(maker, ...claimPath)));
    await assertFails(setDoc(doc(anonymous, "wishlists", code, "reservations", "gift"), {
      reserved: true, reservedBy: "anonymous", updatedAt: serverTimestamp()
    }));
    await assertSucceeds(deleteDoc(doc(winner, ...claimPath)));
    assert.equal((await assertSucceeds(getDoc(doc(loser, ...claimPath)))).exists(), false);
    assert.equal(await claim(one, "one"), true);
    await assertSucceeds(deleteDoc(doc(maker, "wishlists", code)));
    await assertFails(getDocs(collection(one, ...planPath, "claims")));
    console.log("Passed Firestore tests for invitations, privacy, competing claims, release, and list deletion.");
  } finally {
    await env.cleanup();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

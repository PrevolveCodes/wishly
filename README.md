# Wishly

Wishly is a mobile-friendly wishlist app. Creators register with email/password or Google sign-in, create wishlists, and share a wishlist code with gift-givers.

## Firebase setup

1. In Firebase Console for project `wishly-fd9ff`, enable **Authentication → Sign-in method → Email/Password** and **Google** if you want Google sign-in.
2. Create a Cloud Firestore database in **Production mode**.
3. Open **Firestore Database → Rules**, replace the editor with the contents of `firestore.rules`, and click **Publish**. Updating the file in GitHub does not automatically publish the rules to Firebase.
4. Host this folder over HTTPS, such as GitHub Pages. Opening `index.html` as a local file may not work because the app imports Firebase modules from Google's CDN.
5. Add your deployed site domain under **Authentication → Settings → Authorized domains** if it is not already listed.

## Firestore data layout

- `wishlists/{code}`: wishlist metadata and owner UID. The code lookup is public so a gift-giver can find a list.
- `wishlists/{code}/items/{itemId}`: item details, editable only by the owner.
- `wishlists/{code}/giftAccessConfig/main`: hash for the private gift password. Client rules deliberately deny reading this document so the hash is not exposed.
- `wishlists/{code}/giftAccess/{uid}`: per-session authorization record for a gift-giver.
- `wishlists/{code}/purchases/{itemId}`: purchase status, stored separately from owner-readable item details.
- `wishlists/{code}/giftPlans/{ownerUid}`: the nominated organizer and their acceptance for this wishlist. Its `guests` and `claims` subcollections store verified-email invitations and item reservations. The list maker has no access to either subcollection.
- `wishlists/{code}/reservations/{itemId}`: legacy anonymous reservations. The new gift viewer does not use these records.

## Families and wishlist sharing

- `families/{familyId}` stores family membership and pending email invitations.
- `wishlists/{code}/familyShares/{familyId}` stores which family members were invited to a specific wishlist and whether password setup is unclaimed, delegated, or complete.
- The first invited family member can create the wishlist gift password or pass setup to another invited member. This password is per wishlist; family membership alone does not grant access to every list.
- Once gift access is open, gift-givers can copy a share link that pre-fills the password. The password is stored in the URL fragment, which is not sent to the web server, but anyone with the link can use it.
- Family invitations are stored in Wishly, but the current static site does not send email notifications. Share the wishlist link with invited members; they must sign in with the invited email to use the family password flow.

## Gift reservations

- The list maker chooses **Invite gift-givers** under their wishlist’s sharing options and nominates a trusted organizer. The organizer signs in with the nominated, verified email and accepts.
- The organizer adds gift-givers by email and can open an email draft with the wishlist link. Wishly records the invitation but leaves sending the message to the organizer’s email app. Each invitation applies to one wishlist, without requiring family membership.
- Verified invitees and the organizer can see availability, reserve an item, and release their own reservation. Firestore rules keep reservation records from the list maker and uninvited visitors. The public wishlist link still opens the ordinary item list.
- Wishly verifies the invited email address. Keeping the surprise depends on choosing an organizer who is a separate, trusted person.
- Before enabling this version on the public site, publish the updated `firestore.rules` to Firebase. Run `node tests/gift_reservations_rules.cjs` against a local Firestore emulator with the Firebase SDK and `@firebase/rules-unit-testing` installed. The tests use the `demo-wishly-reservations` project.

## Deleting data

The dashboard now deletes each item's purchase and reservation records when deleting that item or deleting a wishlist. It also attempts to delete the known gift-password configuration document. Firestore does not automatically delete subcollections when a parent document is deleted, and client rules intentionally prevent listing gift-access session records. Old `giftAccess/{uid}` documents may therefore remain orphaned after a wishlist is deleted; complete cleanup requires trusted server-side code. Deleting a wishlist also makes its private gift plan inaccessible. The nested guest and claim documents require trusted server-side cleanup because the list maker has no access to them.

## Important

- Never publish service-account credentials or private server keys in frontend files. The Firebase web configuration is intended to be used by a client app; Firestore Security Rules are what protect data.
- Do not use open rules such as `allow read, write: if true;`.
- Rules in this repository must be manually published in the Firebase Console unless Firebase CLI deployment is separately configured.
- Older `app.js` and `gift.js` files contain legacy flows. The current pages use `dashboard.js` and `gift-access.js`; avoid wiring the legacy files back into the live pages without reviewing their security rules.
- Existing localStorage prototype lists will not migrate automatically to Firestore.

# Wishly

Wishly is a mobile-friendly wishlist app. Creators register with email/password or Google sign-in, create wishlists, and share a wishlist code with gift-givers.

## Firebase setup

1. In Firebase Console for project `wishly-fd9ff`, enable **Authentication → Sign-in method → Email/Password** and **Google** if you want Google sign-in.
2. Enable **Anonymous** sign-in for the gift-giver flow.
3. Create a Cloud Firestore database in **Production mode**.
4. Open **Firestore Database → Rules**, replace the editor with the contents of `firestore.rules`, and click **Publish**. Updating the file in GitHub does not automatically publish the rules to Firebase.
5. Host this folder over HTTPS, such as GitHub Pages. Opening `index.html` as a local file may not work because the app imports Firebase modules from Google's CDN.
6. Add your deployed site domain under **Authentication → Settings → Authorized domains** if it is not already listed.

## Firestore data layout

- `wishlists/{code}`: wishlist metadata and owner UID. The code lookup is public so a gift-giver can find a list.
- `wishlists/{code}/items/{itemId}`: item details, editable only by the owner.
- `wishlists/{code}/giftAccessConfig/main`: hash for the private gift password. Client rules deliberately deny reading this document so the hash is not exposed.
- `wishlists/{code}/giftAccess/{uid}`: per-session authorization record for a gift-giver.
- `wishlists/{code}/purchases/{itemId}`: purchase status, stored separately from owner-readable item details.
- `wishlists/{code}/reservations/{itemId}`: reservation status, stored separately from owner-readable item details.

## Families and wishlist sharing

- `families/{familyId}` stores family membership and pending email invitations.
- `wishlists/{code}/familyShares/{familyId}` stores which family members were invited to a specific wishlist and whether password setup is unclaimed, delegated, or complete.
- The first invited family member can create the wishlist gift password or pass setup to another invited member. This password is per wishlist; family membership alone does not grant access to every list.
- Once gift access is open, gift-givers can copy a share link that pre-fills the password. The password is stored in the URL fragment, which is not sent to the web server, but anyone with the link can use it.
- Family invitations are stored in Wishly, but the current static site does not send email notifications. Share the wishlist link with invited members; they must sign in with the invited email to use the family password flow.

## Privacy limits

Wishly's client-side rules hide purchase and reservation records from a normal signed-in owner session. However, the app currently uses anonymous client sessions for gift-giver access. Firestore rules cannot reliably prove that an anonymous session belongs to the same person as a signed-in wishlist owner. Someone who controls the owner account and deliberately opens a separate guest session may be able to enter the gift-giver flow if they know the wishlist code and the gift password, or claim first-time setup before other gift-givers do.

Do not promise absolute owner secrecy with this client-only design. Stronger separation requires a trusted server-side component, such as Firebase Cloud Functions, that manages gift access and reservation actions. The browser must never be trusted to decide its own role.

## Deleting data

The dashboard now deletes each item's purchase and reservation records when deleting that item or deleting a wishlist. It also attempts to delete the known gift-password configuration document. Firestore does not automatically delete subcollections when a parent document is deleted, and client rules intentionally prevent listing gift-access session records. Old `giftAccess/{uid}` documents may therefore remain orphaned after a wishlist is deleted; complete cleanup requires trusted server-side code.

## Important

- Never publish service-account credentials or private server keys in frontend files. The Firebase web configuration is intended to be used by a client app; Firestore Security Rules are what protect data.
- Do not use open rules such as `allow read, write: if true;`.
- Rules in this repository must be manually published in the Firebase Console unless Firebase CLI deployment is separately configured.
- Older `app.js` and `gift.js` files contain legacy flows. The current pages use `dashboard.js` and `gift-access.js`; avoid wiring the legacy files back into the live pages without reviewing their security rules.
- Existing localStorage prototype lists will not migrate automatically to Firestore.

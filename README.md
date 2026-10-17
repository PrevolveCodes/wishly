# Wishly

Wishly is a mobile-friendly wishlist app. Creators register with email and password, create a list, and share a code with gift-givers.

## Firebase setup

This project uses Firebase Authentication (email/password and anonymous gift-giver sessions) and Cloud Firestore.

1. In Firebase Console for project `wishly-fd9ff`, enable **Authentication → Sign-in method → Email/Password**.
2. Also enable **Anonymous** sign-in for the gift-giver flow.
3. Create a Cloud Firestore database in **Production mode**.
4. Open **Firestore Database → Rules**, replace the editor with the contents of `firestore.rules`, and click **Publish**.
5. Host this folder on HTTPS, such as GitHub Pages. ES module imports from Google's Firebase CDN require a web server/HTTPS; opening `index.html` as a local file may not work.
6. Add your deployed site domain under **Authentication → Settings → Authorized domains** if it is not already listed.

## Data layout

- `wishlists/{code}`: public list metadata and owner UID
- `wishlists/{code}/items/{itemId}`: item details, editable only by the signed-in owner
- `wishlists/{code}/purchases/{itemId}`: purchase status, readable/writable by anonymous gift-giver sessions only

The purchase status is stored separately so it is not included in owner-readable item documents. These rules prevent a normal signed-in creator session from reading purchase records. However, a creator who deliberately signs out and uses a guest session could still access the gift-giver path if they know the code. Stronger role separation would require a trusted server-side component that can distinguish owners from gift-givers; do not promise absolute secrecy with a code-only guest flow.

## Important

- Never publish service-account credentials or private server keys in frontend files. The Firebase web configuration is intended to be used by a client app; Firestore Security Rules are what protect data.
- Do not use open rules such as `allow read, write: if true;`.
- Rules in this repository must be manually published in the Firebase Console unless Firebase CLI deployment is separately configured.
- Existing localStorage prototype lists will not migrate automatically to Firestore.

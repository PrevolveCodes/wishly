# Wishly

Wishly is a mobile-friendly wishlist app concept. Make a list for Christmas, a birthday, or another occasion, then share its short code with a gift-giver.

## Current status

The first UI implementation supports:
- Creating a wishlist with a name, title, and occasion.
- Generating a six-character code.
- Adding items, store links, prices, priority, and notes.
- Removing items and marking items as purchased.
- A responsive layout for desktop and mobile.

**Important limitation:** this version saves data in the current browser's `localStorage`. A code will only find a list in that same browser profile on the same device. It is not yet a real cross-device sharing service, and purchase status is not securely private yet. Do not use it for real private wishlists until the backend and access controls are implemented.

## Run it

Open `index.html` in a browser, or enable GitHub Pages for this repository and publish from the `main` branch, root folder.

## Next implementation milestone

Connect a real backend (for example, Firebase) so list codes work across devices. The production design should separate owner access from gift-giver access, keep purchase status hidden from the owner, validate all writes on the server, and rate-limit code lookups. Do not put server secrets in frontend JavaScript. Configure and test database security rules before making cross-device lists available publicly.

## Files

- `index.html` — page structure
- `styles.css` — responsive visual design
- `app.js` — current local-storage prototype
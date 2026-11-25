"""Run with python -m unittest discover -s tests after installing Playwright and Chromium.

Set CHROMIUM_PATH to use a system Chromium. All requests stay inside the test.
"""

import os
import re
import unittest
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "http://localhost"
FIREBASE_MODULES = {
    "firebase-app.js": "export const initializeApp = () => ({});",
    "firebase-auth.js": """
        const user = window.giftTestUser === undefined
            ? { uid: "owner", email: "owner@example.test" } : window.giftTestUser;
        export const getAuth = () => ({ currentUser: user });
        export const onAuthStateChanged = (_, callback) => queueMicrotask(() => callback(user));
        export const reload = async () => {};
        export const sendEmailVerification = async () => {};
        export const signOut = async () => {};
    """,
    "firebase-firestore.js": """
        const lists = {
            ABCD234567: { title: "First", ownerUid: "owner" },
            BCDE234567: { title: "Second", ownerUid: "owner" }
        };
        const items = {
            a: { name: "Apple", priority: "Would love" },
            b: { name: "Ball", priority: "Really want" },
            z: { name: "Zebra", priority: "Top wish" }
        };
        export const collection = (parent, ...parts) => Array.isArray(parent) ? [...parent, ...parts] : parts;
        export const doc = collection;
        export const query = ref => ref;
        export const getDoc = async ([_, code]) => ({
            exists: () => Boolean(lists[code]), data: () => lists[code]
        });
        export async function getDocs(path) {
            if (window.holdFirst && path[1] === "ABCD234567") {
                await new Promise(resolve => { window.releaseFirst = resolve; });
            }
            const records = path.length === 1 ? lists : items;
            return { docs: Object.entries(records).map(([id, data]) => ({ id, data: () => data })) };
        }
        export const getFirestore = () => ({});
        export const where = () => null;
        const snapshot = data => ({ exists: () => Boolean(data), data: () => data });
        let plan = window.giftTestPlan === undefined
            ? { organizerEmail: "organizer@example.test", organizerUid: "organizer" } : window.giftTestPlan;
        const invitedEmails = new Set(["guest@example.test"]);
        let claims = { b: { reservedBy: "other-guest" } };
        let showClaims;
        export async function getDocFromServer(path) {
            if (path[2] !== "giftPlans") return getDoc(path);
            if (path[4] === "guests") {
                return snapshot(invitedEmails.has(path[5]) ? { invitedAt: 1 } : null);
            }
            if ((window.giftTestUser?.uid ?? "owner") === "owner"
                || plan?.organizerEmail === window.giftTestUser?.email) return snapshot(plan);
            throw Object.assign(new Error("Permission denied"), { code: "permission-denied" });
        }
        export async function getDocsFromServer(path) {
            if (path[4] !== "guests") return getDocs(path);
            return { docs: [...invitedEmails].map(id => ({ id })) };
        }
        export async function setDoc(path, data) {
            if (path[2] !== "giftPlans") return unused();
            if (path[4] === "guests") invitedEmails.add(path[5]);
            else plan = data;
        }
        export async function updateDoc(path, data) {
            if (path[2] !== "giftPlans" || path.length !== 4) return unused();
            plan = { ...plan, ...data };
        }
        export function onSnapshot(path, options, callback) {
            if (path[4] !== "claims") throw new Error("Unexpected snapshot");
            window.claimReads = (window.claimReads || 0) + 1;
            showClaims = () => callback({
                metadata: { fromCache: false },
                docs: Object.entries(claims).map(([id, data]) => ({ id, data: () => data }))
            });
            queueMicrotask(showClaims);
            return () => { showClaims = undefined; };
        }
        export async function runTransaction(_, action) {
            const id = path => path.at(-1);
            const result = await action({
                get: async path => snapshot(claims[id(path)]),
                set: (path, data) => { claims[id(path)] = data; },
                delete: path => { delete claims[id(path)]; }
            });
            showClaims?.();
            return result;
        }
        export const serverTimestamp = () => 1;
        function unused() { throw Error("Unexpected database operation"); }
        export { unused as addDoc, unused as deleteDoc, unused as writeBatch, unused as orderBy };
    """,
}


def serve_fixture(route):
    url = urlparse(route.request.url)
    filename = Path(url.path).name
    if url.hostname == "www.gstatic.com" and filename in FIREBASE_MODULES:
        route.fulfill(body=FIREBASE_MODULES[filename], content_type="application/javascript",
                      headers={"Access-Control-Allow-Origin": "*"})
    elif url.hostname == "localhost" and (ROOT / filename).is_file():
        route.fulfill(path=ROOT / filename)
    else:
        route.abort()


class WishlistBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        runtime = sync_playwright().start()
        cls.addClassCleanup(runtime.stop)
        cls.browser = runtime.chromium.launch(executable_path=os.getenv("CHROMIUM_PATH"))
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        context = self.browser.new_context(reduced_motion="reduce", viewport={"width": 390, "height": 840})
        self.addCleanup(context.close)
        self.page = context.new_page()
        self.page.route("**/*", serve_fixture)

    def test_create_view_hides_saved_lists(self):
        self.page.goto(ORIGIN + "/dashboard.html?view=make-list")
        expect(self.page.locator("#make-a-list")).to_be_visible()
        expect(self.page.locator("#dashboard-grid > .dashboard-lists")).to_be_hidden()

    def test_return_to_light_mode_across_pages_and_tabs(self):
        page = self.page
        page.goto(ORIGIN + "/gift.html")
        page.locator("#theme-toggle").click()
        page.goto(ORIGIN + "/dashboard.html?view=lists")
        page.locator(".mobile-sidebar-toggle").click()
        switch = page.locator("#sidebar-theme-toggle")
        expect(switch).to_have_attribute("aria-pressed", "true")

        other = page.context.new_page()
        self.addCleanup(other.close)
        other.route("**/*", serve_fixture)
        other.goto(ORIGIN + "/gift.html")
        switch.click()
        expect(switch).to_have_attribute("aria-pressed", "false")
        self.assertFalse(page.locator(".dark-mode").count())
        expect(other.locator("#theme-toggle")).to_have_attribute("aria-pressed", "false")
        page.reload()
        expect(page.locator("html")).to_have_attribute("data-theme", "light")
        page.go_back()
        expect(page.locator("#theme-toggle")).to_have_attribute("aria-pressed", "false")

    def enable_family_fixtures(self):
        from unittest.mock import patch
        modules = dict(FIREBASE_MODULES)
        modules["firebase-app.js"] += "export const getApps=()=>[], getApp=()=>({});"
        modules["firebase-firestore.js"] = """
            export const getFirestore = () => ({}), collection = (_, ...p) => p, doc = collection;
            export const query = ref => ref, where = () => null;
            export const updateDoc = async () => {}, setDoc = async () => {}, serverTimestamp = () => 0;
            export function onSnapshot(path, callback) {
                const docs = path[0] === "families" ? [{data: () => ({name: "Family A"})}] : [];
                callback({docs});
                return () => {};
            }
            export async function getDocs() {
                return {docs: ["A","B"].map(id => ({id, data: () => ({name: id, memberEmails: []})}))};
            }
            export async function getDoc(path) {
                if (path[2] === "familyShares") {
                    if (path[3] === "A") await new Promise(resolve => { window.releaseA = resolve; });
                    return {exists: () => true, data: () => ({invitedEmails: [path[3]+"@example.test"]})};
                }
                return {exists: () => true, data: () => ({ownerUid: "owner", title: "Birthday"})};
            }
        """
        overrides = patch.dict(FIREBASE_MODULES, modules)
        overrides.start()
        self.addCleanup(overrides.stop)
        self.page.goto(ORIGIN + "/family-share.html?code=ABCD234567")

    def test_mobile_invitation_inside_drawer(self):
        self.enable_family_fixtures()
        self.page.locator(".mobile-sidebar-toggle").click()
        self.page.locator(".wishly-notification-button").click()
        self.page.get_by_role("link", name="View invitation").click()
        expect(self.page).to_have_url(ORIGIN + "/dashboard.html?view=families")

    def test_sharing_status_keeps_latest_family(self):
        self.enable_family_fixtures()
        picker = self.page.locator("#family-select")
        picker.select_option("A")
        self.page.wait_for_function("typeof releaseA === 'function'")
        picker.select_option("B")
        status = self.page.locator("#share-status")
        expect(status).to_contain_text("B@example.test")
        self.page.evaluate("async () => { releaseA(); await new Promise(r => setTimeout(r, 0)); }")
        expect(status).to_contain_text("B@example.test")

    def test_wishlist_preview_contrast_in_dark_mode(self):
        def luminance(css_color):
            channels = [int(value) / 255 for value in re.fullmatch(
                r"rgb\((\d+), (\d+), (\d+)\)", css_color
            ).groups()]
            linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in channels]
            return sum(v * weight for v, weight in zip(linear, (0.2126, 0.7152, 0.0722)))

        page = self.page
        page.goto(ORIGIN + "/dashboard.html?view=make-list")
        page.locator("#owner-name").fill("Test owner")
        page.locator(".mobile-sidebar-toggle").click()
        page.locator("#sidebar-theme-toggle").click()
        page.locator(".mobile-sidebar-toggle").click()
        preview = page.locator(".draft-preview")
        background = luminance(preview.evaluate("e => getComputedStyle(e).backgroundColor"))
        for field in (".eyebrow", "#draft-title", "#draft-owner", "#draft-occasion"):
            with self.subTest(field=field):
                text = luminance(preview.locator(field).evaluate("e => getComputedStyle(e).color"))
                ratio = (max(text, background) + 0.05) / (min(text, background) + 0.05)
                self.assertGreaterEqual(ratio, 4.5)

    def test_priority_order_for_owner_and_viewer(self):
        for path, control in [
            ("dashboard.html?view=lists&code=ABCD234567", "#item-sort"),
            ("gift.html?code=ABCD234567", "#gift-item-sort"),
        ]:
            with self.subTest(path=path):
                self.page.goto(ORIGIN + "/" + path)
                self.page.locator(control).select_option("priority")
                expect(self.page.locator(".wish-item h3")).to_have_text(["Zebra", "Ball", "Apple"])

    def test_reservation_tutorial_and_privacy_for_list_maker(self):
        page = self.page
        page.goto(ORIGIN + "/dashboard.html?view=lists")
        page.locator(".open-owned-list").first.click()
        page.locator("#workspace").get_by_text("Sharing options", exact=True).click()
        page.get_by_role("button", name="Invite gift-givers").click()
        expect(page.locator("#gift-reservation-controls")).to_contain_text("is organizing gifts")
        expect(page.get_by_role("button", name="Reserve gift")).to_have_count(0)
        self.assertIsNone(page.evaluate("window.claimReads"))
        page.get_by_role("link", name="How reservations work").click()
        expect(page.get_by_role("heading", name="How gift reservations work")).to_be_visible()
        expect(page.get_by_role("heading", name="2. Invite gift-givers")).to_be_visible()
        self.assertTrue(page.evaluate("document.documentElement.scrollWidth <= innerWidth"))

    def test_list_maker_can_nominate_an_organizer(self):
        page = self.page
        page.add_init_script("window.giftTestPlan = null;")
        page.goto(ORIGIN + "/gift.html?code=ABCD234567#gift-reservation-controls")
        page.get_by_label("Organizer’s email").fill("organizer@example.test")
        page.get_by_role("button", name="Choose organizer").click()
        expect(page.get_by_text("Waiting for organizer@example.test", exact=False)).to_be_visible()
        expect(page.get_by_role("link", name="Open email draft for organizer@example.test")).to_have_attribute(
            "href", re.compile(r"^mailto:organizer@example\.test\?")
        )
        self.assertIsNone(page.evaluate("window.claimReads"))

    def test_organizer_can_accept_and_invite_without_a_family(self):
        page = self.page
        page.add_init_script("""
            window.giftTestUser = {uid: 'organizer', email: 'organizer@example.test', emailVerified: true};
            window.giftTestPlan = { organizerEmail: 'organizer@example.test', organizerUid: '' };
        """)
        page.goto(ORIGIN + "/gift.html?code=ABCD234567")
        page.get_by_role("button", name="Accept organizer invitation").click()
        page.get_by_label("Gift-giver’s email").fill("friend@example.test")
        page.get_by_role("button", name="Add invitation").click()
        expect(page.get_by_role("link", name="Open email draft for friend@example.test")).to_have_attribute(
            "href", re.compile(r"^mailto:friend@example\.test\?")
        )

    def test_invited_guest_can_reserve_and_undo_their_own_claim(self):
        page = self.page
        page.add_init_script(
            "window.giftTestUser = {uid: 'guest', email: 'guest@example.test', emailVerified: true};"
        )
        page.goto(ORIGIN + "/gift.html?code=ABCD234567")
        item = page.locator(".wish-item").filter(has=page.get_by_role("heading", name="Apple"))
        other = page.locator(".wish-item").filter(has=page.get_by_role("heading", name="Ball"))
        expect(other.get_by_text("Reserved", exact=True)).to_be_visible()
        expect(other.get_by_role("button", name="Reserve gift")).to_have_count(0)
        item.get_by_role("button", name="Reserve gift").click()
        expect(item.get_by_text("Reserved by you", exact=True)).to_be_visible()
        item.get_by_role("button", name="Undo reservation").click()
        expect(item.get_by_text("Available", exact=True)).to_be_visible()

    def test_signed_out_visitor_can_browse_without_loading_claims(self):
        page = self.page
        page.add_init_script("window.giftTestUser = null;")
        page.goto(ORIGIN + "/gift.html?code=ABCD234567")
        expect(page.get_by_role("heading", name="Apple")).to_be_visible()
        expect(page.get_by_role("link", name="Sign in or create an account")).to_have_attribute(
            "href", "signup.html?gift=ABCD234567"
        )
        expect(page.get_by_role("button", name="Reserve gift")).to_have_count(0)
        self.assertIsNone(page.evaluate("window.claimReads"))

    def test_stale_response_cannot_replace_latest_selection(self):
        page = self.page
        page.goto(ORIGIN + "/dashboard.html?view=lists")
        page.evaluate("window.holdFirst = true")
        buttons = page.locator(".open-owned-list")
        buttons.first.click()
        page.wait_for_function("typeof window.releaseFirst === 'function'")
        buttons.last.click()
        heading = page.locator("#workspace h2")
        expect(heading).to_have_text("Second")
        page.evaluate("async () => { window.releaseFirst(); await new Promise(r => setTimeout(r, 0)); }")
        expect(heading).to_have_text("Second")


if __name__ == "__main__":
    unittest.main()

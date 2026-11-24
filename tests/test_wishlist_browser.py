"""Run with python -m unittest discover -s tests after installing Playwright and Chromium.

Set CHROMIUM_PATH to use a system Chromium. All requests stay inside the test.
"""

import os
import unittest
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "http://localhost"
FIREBASE_MODULES = {
    "firebase-app.js": "export const initializeApp = () => ({});",
    "firebase-auth.js": """
        const user = { uid: "owner", email: "owner@example.test" };
        export const getAuth = () => ({ currentUser: user });
        export const onAuthStateChanged = (_, callback) => queueMicrotask(() => callback(user));
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
        export const collection = (_, ...parts) => parts;
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
        function unused() { throw Error("Unexpected database operation"); }
        export { unused as addDoc, unused as setDoc, unused as updateDoc, unused as deleteDoc,
                 unused as writeBatch, unused as serverTimestamp, unused as orderBy };
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

    def test_priority_order_for_owner_and_viewer(self):
        for path, control in [
            ("dashboard.html?view=lists&code=ABCD234567", "#item-sort"),
            ("gift.html?code=ABCD234567", "#gift-item-sort"),
        ]:
            with self.subTest(path=path):
                self.page.goto(ORIGIN + "/" + path)
                self.page.locator(control).select_option("priority")
                expect(self.page.locator(".wish-item h3")).to_have_text(["Zebra", "Ball", "Apple"])

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

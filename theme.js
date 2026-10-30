(() => {
  const KEY = "wishly-theme";

  // Keep the shared page background clean. The old depth background used large
  // translucent gradients that could appear as repeated hazy bands on pages.
  const cleanPageBackground = () => {
    if (document.getElementById("wishly-clean-background")) return;
    const style = document.createElement("style");
    style.id = "wishly-clean-background";
    style.textContent = `
      html, body { background-image: none !important; }
      body:not(.dark-mode) { background-color: var(--paper, #f5f3ef) !important; }
      body.dark-mode { background-image: none !important; }
    `;
    document.head.appendChild(style);
  };

  // Load the mobile dashboard layout independently from dashboard-loading.css.
  // This avoids the old stylesheet query string keeping an older cached copy.
  const loadMobileDashboardStyles = () => {
    if (!document.body.classList.contains("dashboard-page")) return;
    if (document.getElementById("wishly-mobile-dashboard-css")) return;
    const link = document.createElement("link");
    link.id = "wishly-mobile-dashboard-css";
    link.rel = "stylesheet";
    link.href = "mobile-dashboard.css?v=2";
    document.head.appendChild(link);
  };

  const applyTheme = theme => {
    const dark = theme === "dark";
    document.body.classList.toggle("dark-mode", dark);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const topButton = document.getElementById("theme-toggle");
    if (topButton) {
      topButton.textContent = dark ? "☀ Light mode" : "☾ Dark mode";
      topButton.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      topButton.setAttribute("aria-pressed", String(dark));
    }
    const sidebarButton = document.getElementById("sidebar-theme-toggle");
    if (sidebarButton) {
      const label = sidebarButton.querySelector("span:last-child");
      if (label) label.textContent = dark ? "Switch to light mode" : "Switch to dark mode";
      sidebarButton.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      sidebarButton.setAttribute("aria-pressed", String(dark));
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#171720" : "#f7f6f2";
  };

  const readTheme = () => {
    try { return localStorage.getItem(KEY) || "light"; } catch { return "light"; }
  };
  const saveTheme = theme => {
    try { localStorage.setItem(KEY, theme); } catch {}
  };
  const toggleTheme = () => {
    const next = document.body.classList.contains("dark-mode") ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
  };

  cleanPageBackground();
  applyTheme(readTheme());

  const setup = () => {
    loadMobileDashboardStyles();
    const nav = document.querySelector(".top-nav");
    if (nav && !document.getElementById("theme-toggle")) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = "theme-toggle";
      button.className = "theme-toggle";
      button.addEventListener("click", toggleTheme);
      nav.append(button);
    }
    const sidebarButton = document.getElementById("sidebar-theme-toggle");
    if (sidebarButton && !sidebarButton.dataset.themeBound) {
      sidebarButton.dataset.themeBound = "true";
      sidebarButton.addEventListener("click", toggleTheme);
    }
    cleanPageBackground();
    applyTheme(readTheme());
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, { once: true });
  else setup();
})();
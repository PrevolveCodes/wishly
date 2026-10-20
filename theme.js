(() => {
  const KEY = "wishly-theme";
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

  applyTheme(readTheme());

  const setup = () => {
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
    applyTheme(readTheme());
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, { once: true });
  else setup();
})();
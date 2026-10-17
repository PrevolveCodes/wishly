(() => {
  const KEY = "wishly-theme";
  const applyTheme = theme => {
    const dark = theme === "dark";
    document.body.classList.toggle("dark-mode", dark);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const button = document.getElementById("theme-toggle");
    if (button) {
      button.textContent = dark ? "☀ Light mode" : "☾ Dark mode";
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      button.setAttribute("aria-pressed", String(dark));
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#171720" : "#f7f6f2";
  };

  let savedTheme = "light";
  try { savedTheme = localStorage.getItem(KEY) || "light"; } catch {}
  applyTheme(savedTheme);

  const setup = () => {
    const nav = document.querySelector(".top-nav");
    if (!nav || document.getElementById("theme-toggle")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "theme-toggle";
    button.className = "theme-toggle";
    button.addEventListener("click", () => {
      const next = document.body.classList.contains("dark-mode") ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(KEY, next); } catch {}
    });
    nav.append(button);
    applyTheme(savedTheme);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, { once: true });
  else setup();
})();
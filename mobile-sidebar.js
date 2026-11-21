/* Adds a mobile-only, Discord-style left navigation drawer. */
(() => {
  const init = () => {
    const sidebar = document.querySelector(".wishly-sidebar");
    if (!sidebar || document.querySelector(".mobile-sidebar-toggle")) return;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mobile-sidebar-toggle";
    toggle.setAttribute("aria-label", "Open navigation");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "wishly-mobile-sidebar");
    toggle.textContent = "☰";
    sidebar.id = "wishly-mobile-sidebar";

    const backdrop = document.createElement("div");
    backdrop.className = "mobile-sidebar-backdrop";
    backdrop.setAttribute("aria-hidden", "true");

    const setOpen = (open) => {
      document.body.classList.toggle("mobile-sidebar-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      toggle.textContent = open ? "×" : "☰";
    };

    toggle.addEventListener("click", () => setOpen(!document.body.classList.contains("mobile-sidebar-open")));
    backdrop.addEventListener("click", () => setOpen(false));
    sidebar.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") setOpen(false);
    });

    document.body.append(toggle, backdrop);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
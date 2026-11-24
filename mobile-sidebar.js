// The desktop sidebar doubles as a disclosure on narrow screens.
(() => {
  const sidebar = document.querySelector(".wishly-sidebar");
  if (!sidebar) return;

  const mobile = matchMedia("(max-width: 900px)");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "mobile-sidebar-toggle";
  sidebar.id ||= "wishly-navigation";
  toggle.setAttribute("aria-controls", sidebar.id);
  const backdrop = document.createElement("div");
  backdrop.className = "mobile-sidebar-backdrop";
  sidebar.before(toggle, backdrop);

  let open = false;
  const suspended = new Set();
  function update(expand) {
    open = mobile.matches && expand;
    document.body.classList.toggle("mobile-sidebar-open", open);
    sidebar.inert = mobile.matches && !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    toggle.textContent = open ? "×" : "☰";
    if (open) {
      for (const node of document.body.children) {
        if ([sidebar, toggle, backdrop].includes(node) || node.matches("script, style, dialog, [inert]")) continue;
        suspended.add(node);
        node.inert = true;
      }
      sidebar.querySelector('[aria-current="page"], .sidebar-brand')?.focus();
    } else {
      for (const node of suspended) node.inert = false;
      suspended.clear();
    }
  }

  function close() {
    if (!open) return;
    update(false);
    toggle.focus();
  }

  toggle.addEventListener("click", () => open ? close() : update(true));
  backdrop.addEventListener("click", close);
  sidebar.addEventListener("click", event => {
    if (event.target.closest("a, .sidebar-signout")) close();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !document.querySelector("dialog[open]")) close();
  });
  mobile.addEventListener("change", () => update(false));
  update(false);
})();

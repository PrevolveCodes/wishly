(() => {
  const main = document.getElementById("dashboard-main");
  if (!main) return;

  const overview = document.getElementById("overview-view");
  const welcome = document.getElementById("dashboard-welcome");
  const grid = document.getElementById("dashboard-grid");
  const lists = main.querySelector(".dashboard-lists");
  const create = main.querySelector(".dashboard-create");
  const nav = document.querySelector(".sidebar-nav");
  const links = nav ? [...nav.querySelectorAll("a.sidebar-link[data-dashboard-view]")] : [];

  function showView(view) {
    const selected = ["overview", "make-list", "lists"].includes(view) ? view : "overview";
    if (overview) overview.hidden = selected !== "overview";
    if (welcome) welcome.hidden = selected !== "make-list";
    if (grid) grid.hidden = selected === "overview";
    if (create) create.hidden = selected === "lists";
    if (lists) {
      lists.hidden = selected !== "lists";
      lists.classList.toggle("lists-only-view", selected === "lists");
      const heading = lists.querySelector(".section-heading h2");
      if (heading) heading.textContent = selected === "lists" ? "My Lists" : "Your wishlists";
    }
    if (grid) {
      grid.classList.toggle("lists-only-grid", selected === "lists");
      grid.classList.toggle("make-list-view", selected === "make-list");
    }
    document.title = selected === "overview" ? "Overview — Wishly" : selected === "lists" ? "My Lists — Wishly" : "Make a List — Wishly";
    links.forEach(link => {
      const active = link.dataset.dashboardView === selected;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  nav?.addEventListener("click", event => {
    const link = event.target.closest("a.sidebar-link[data-dashboard-view]");
    if (!link) return;
    event.preventDefault();
    showView(link.dataset.dashboardView);
  });

  main.addEventListener("click", event => {
    const link = event.target.closest('a[href*="dashboard.html?view="]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    const view = url.searchParams.get("view");
    if (!["overview", "make-list", "lists"].includes(view)) return;
    event.preventDefault();
    showView(view);
  });

  const initial = new URLSearchParams(location.search).get("view") || "overview";
  showView(initial);
})();

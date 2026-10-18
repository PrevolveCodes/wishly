(() => {
  const params = new URLSearchParams(location.search);
  const view = params.get("view") || "dashboard";
  const main = document.getElementById("dashboard-main");
  if (!main) return;
  const welcome = main.querySelector(".dashboard-welcome");
  const grid = main.querySelector(".dashboard-grid");
  const lists = main.querySelector(".dashboard-lists");
  const create = main.querySelector(".dashboard-create");
  const nav = document.querySelector(".sidebar-nav");
  const links = nav ? [...nav.querySelectorAll("a.sidebar-link")] : [];
  links.forEach(link => {
    const url = new URL(link.href, location.href);
    const isLists = url.searchParams.get("view") === "lists";
    const active = view === "lists" ? isLists : (!isLists && url.pathname.endsWith("dashboard.html"));
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (view === "lists") {
    document.title = "My Lists — Wishly";
    if (welcome) welcome.hidden = true;
    if (create) create.hidden = true;
    if (lists) {
      lists.classList.add("lists-only-view");
      const heading = lists.querySelector(".section-heading h2");
      if (heading) heading.textContent = "My Lists";
    }
    if (grid) grid.classList.add("lists-only-grid");
  } else {
    document.title = "Your dashboard — Wishly";
    if (welcome) welcome.hidden = false;
    if (create) create.hidden = false;
    if (lists) lists.hidden = true;
    if (grid) {
      grid.classList.remove("lists-only-grid");
      grid.classList.add("dashboard-overview-grid");
    }
  }
})();
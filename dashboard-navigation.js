(() => {
  const main = document.getElementById("dashboard-main");
  if (!main) return;
  const overview = document.getElementById("overview-view");
  const welcome = document.getElementById("dashboard-welcome");
  const grid = document.getElementById("dashboard-grid");
  const lists = main.querySelector(".dashboard-lists");
  const create = main.querySelector("#create-list-view");
  const views = {
    overview,
    "make-list": create,
    lists,
    families: document.getElementById("families-view"),
    messages: document.getElementById("messages-view"),
    achievements: document.getElementById("achievements-view"),
    suggestions: document.getElementById("suggestions-view")
  };
  const links = [...document.querySelectorAll(".sidebar-nav a.sidebar-link")];
  function showView(name) {
    if (!views[name]) name = "overview";
    Object.entries(views).forEach(([key, node]) => { if (node) node.hidden = key !== name; });
    if (welcome) welcome.hidden = name !== "overview";
    if (grid) grid.hidden = name !== "overview";
    links.forEach(link => {
      const target = link.dataset.dashboardView || (link.getAttribute("href") || "").match(/dashboard\.html\?view=([^&]+)/)?.[1];
      link.classList.toggle("active", target === name);
      if (target) link.setAttribute("aria-current", target === name ? "page" : "false");
    });
    document.title = ({overview:"Wishly Dashboard", "make-list":"Make a List — Wishly",lists:"My Lists — Wishly",families:"Families — Wishly",messages:"Messages — Wishly",achievements:"Achievements — Wishly",suggestions:"Gift Suggestions — Wishly"})[name] || "Wishly Dashboard";
    main.dataset.currentView = name;
  }
  document.addEventListener("click", event => {
    const link = event.target.closest(".sidebar-nav a.sidebar-link");
    if (!link) return;
    const target = link.dataset.dashboardView || (link.getAttribute("href") || "").match(/dashboard\.html\?view=([^&]+)/)?.[1];
    if (!target || !views[target]) return;
    event.preventDefault();
    showView(target);
  });
  showView("overview");
})();
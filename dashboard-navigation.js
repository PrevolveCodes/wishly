(() => {
  const main = document.getElementById("dashboard-main");
  if (!main) return;

  const overview = document.getElementById("overview-view");
  const makeListCard = document.getElementById("make-a-list");
  const welcome = document.getElementById("dashboard-welcome");
  const grid = document.getElementById("dashboard-grid");
  const lists = main.querySelector(".dashboard-lists");
  const workspace = document.getElementById("workspace");
  const views = {
    overview,
    "make-list": makeListCard,
    lists,
    families: document.getElementById("families-view"),
    achievements: document.getElementById("achievements-view"),
    suggestions: document.getElementById("suggestions-view"),
    settings: document.getElementById("settings-view")
  };
  const links = [...document.querySelectorAll("a[data-dashboard-view]")];

  function showView(name) {
    if (!views[name]) name = "overview";

    if (overview) overview.hidden = name !== "overview";
    if (welcome) welcome.hidden = name !== "make-list";
    if (grid) grid.hidden = name !== "make-list" && name !== "lists";
    if (makeListCard) makeListCard.hidden = name !== "make-list";
    if (lists) lists.hidden = name !== "lists";

    Object.entries(views).forEach(([key, node]) => {
      if (!node || key === "overview" || key === "make-list" || key === "lists") return;
      node.hidden = key !== name;
    });

    if (workspace) workspace.classList.toggle("hidden", name !== "lists" || !workspace.innerHTML.trim());

    links.forEach(link => {
      const target = link.dataset.dashboardView;
      link.classList.toggle("active", target === name);
      if (target) {
        if (target === name) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
    });

    document.title = ({
      overview: "Wishly Dashboard",
      "make-list": "Make a List — Wishly",
      lists: "My Lists — Wishly",
      families: "Families — Wishly",
      achievements: "Achievements — Wishly",
      suggestions: "Gift Suggestions — Wishly",
      settings: "Settings — Wishly"
    })[name] || "Wishly Dashboard";

    main.dataset.currentView = name;
  }

  document.addEventListener("click", event => {
    const link = event.target.closest("a[data-dashboard-view]");
    if (!link) return;
    const target = link.dataset.dashboardView;
    if (!target || !views[target]) return;
    event.preventDefault();
    showView(target);
  });

  window.wishlyShowDashboardView = showView;
  showView("overview");
})();
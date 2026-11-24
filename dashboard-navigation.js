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
    suggestions: document.getElementById("suggestions-view"),
    settings: document.getElementById("settings-view")
  };

  const draft = document.getElementById("create-form");
  function updatePreview() {
    const fields = draft.elements;
    document.getElementById("draft-title").textContent = fields.title.value.trim() || "Your wishlist";
    const owner = fields.ownerName.value.trim();
    const byline = document.getElementById("draft-owner");
    byline.hidden = !owner;
    byline.textContent = owner ? "For " + owner : "";
    const date = fields.eventDate.valueAsDate;
    const occasion = fields.occasion.value;
    document.getElementById("draft-occasion").textContent = date
      ? occasion + " · " + date.toLocaleDateString(undefined, { dateStyle: "long", timeZone: "UTC" })
      : occasion;
  }
  draft.addEventListener("input", updatePreview);
  draft.addEventListener("reset", () => queueMicrotask(updatePreview));
  window.addEventListener("pageshow", updatePreview);
  updatePreview();

  function showView(name) {
    if (!Object.hasOwn(views, name) || !views[name]) name = "overview";

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

    document.querySelectorAll("a[data-dashboard-view]").forEach(link => {
      const target = link.dataset.dashboardView;
      link.classList.toggle("active", target === name);
      link.classList.toggle("is-active", target === name);
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
      suggestions: "Gift Suggestions — Wishly",
      settings: "Settings — Wishly"
    })[name] || "Wishly Dashboard";

    main.dataset.currentView = name;
  }

  document.addEventListener("click", event => {
    const link = event.target.closest("a[data-dashboard-view]");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = link.dataset.dashboardView;
    if (!target || !views[target]) return;
    event.preventDefault();
    navigate(target);
  });

  function navigate(name) {
    if (main.dataset.currentView === name) return;
    const url = new URL(location.href);
    url.searchParams.set("view", name);
    history.pushState(null, "", url);
    showView(name);
  }

  function readLocation() {
    showView(new URLSearchParams(location.search).get("view"));
  }

  window.wishlyShowDashboardView = navigate;
  window.addEventListener("popstate", readLocation);
  readLocation();
})();

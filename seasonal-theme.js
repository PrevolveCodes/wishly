(() => {
  "use strict";

  // Holiday styling runs from December 1 through January 2, using the
  // visitor's local calendar date. Outside that period, no seasonal effects run.
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  const winterTheme = (month === 11) || (month === 0 && day <= 2);

  if (!winterTheme) {
    document.documentElement.classList.remove("wishly-winter");
    return;
  }

  document.documentElement.classList.add("wishly-winter");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const addSnow = () => {
    if (document.querySelector(".wishly-snow-layer")) return;
    const layer = document.createElement("div");
    layer.className = "wishly-snow-layer";
    layer.setAttribute("aria-hidden", "true");

    const count = window.matchMedia("(max-width: 600px)").matches ? 22 : 48;
    for (let i = 0; i < count; i++) {
      const flake = document.createElement("span");
      flake.className = "wishly-snowflake";
      flake.textContent = Math.random() > 0.45 ? "•" : "❄";
      flake.style.setProperty("--snow-left", Math.random() * 100 + "vw");
      flake.style.setProperty("--snow-size", (Math.random() * 8 + 5) + "px");
      flake.style.setProperty("--snow-opacity", (Math.random() * 0.55 + 0.25).toFixed(2));
      flake.style.setProperty("--snow-duration", (Math.random() * 12 + 9) + "s");
      flake.style.setProperty("--snow-delay", (-Math.random() * 20) + "s");
      flake.style.setProperty("--snow-drift", (Math.random() * 100 - 50) + "px");
      layer.appendChild(flake);
    }
    document.body.appendChild(layer);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addSnow, { once: true });
  } else {
    addSnow();
  }
})();

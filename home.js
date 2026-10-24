(() => {
  const aboutLink = document.querySelector('.top-nav a[href="#about"]');
  const aboutSection = document.getElementById("about");

  if (aboutLink && aboutSection) {
    aboutLink.addEventListener("click", event => {
      event.preventDefault();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      aboutSection.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      });
    });
  }

  // A small hidden Easter egg: tap the Wishly logo five times.
  const brand = document.querySelector(".topbar .brand");
  if (!brand) return;
  let taps = 0;
  let resetTapTimer;
  let secretShown = false;

  brand.addEventListener("click", event => {
    if (secretShown) return;
    event.preventDefault();
    taps += 1;
    window.clearTimeout(resetTapTimer);

    if (taps >= 5) {
      secretShown = true;
      const notice = document.querySelector("#notice");
      if (notice) {
        notice.textContent = "✨ Secret unlocked! Wishly wishes you a little extra luck today. ✨";
        notice.classList.remove("hidden");
        notice.classList.add("wishly-secret-notice");
        notice.setAttribute("role", "status");
        notice.setAttribute("aria-live", "polite");
      }
      brand.classList.add("wishly-secret-found");
      window.setTimeout(() => brand.classList.remove("wishly-secret-found"), 1100);
      return;
    }

    resetTapTimer = window.setTimeout(() => { taps = 0; }, 1800);
  });
})();
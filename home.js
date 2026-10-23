(() => {
  const aboutLink = document.querySelector('.top-nav a[href="#about"]');
  const aboutSection = document.getElementById("about");
  if (!aboutLink || !aboutSection) return;

  aboutLink.addEventListener("click", event => {
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    aboutSection.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });
  });
})();
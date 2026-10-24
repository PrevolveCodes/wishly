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

  // Hidden keyboard Easter egg: type "wishly".
  let typed = "";
  let typedTimer;
  const secretThemeKey = "wishly-secret-theme";
  const themeCss = document.createElement("style");
  themeCss.textContent = `
    body.wishly-secret-theme { --paper:#f4e8ff; --purple:#a13fd1; --purple-dark:#7d2fa8; }
    body.wishly-secret-theme .topbar { border-bottom:1px solid #d9b7ee; }
    body.wishly-secret-theme .brand-dot, body.wishly-secret-theme h1 span { color:#a13fd1; }
    body.wishly-secret-theme .button-primary { background:#a13fd1; }
    body.wishly-secret-theme .gift-box-front { background:#c77de8; }
    body.wishly-secret-theme .gift-ribbon { background:#ffe18f; }
    .wishly-secret-actions { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-top:10px; }
    .wishly-secret-actions button { border:1px solid currentColor; border-radius:999px; padding:8px 12px; background:transparent; color:inherit; font:inherit; cursor:pointer; }
    .wishly-fortune { margin:24px auto 0; padding:14px 18px; border:1px solid var(--line); border-radius:16px; background:var(--white); color:var(--ink); text-align:center; max-width:480px; }
    .wishly-fortune p { margin:8px 0 0; color:var(--muted); }
  `;
  document.head.appendChild(themeCss);
  const applySecretTheme = enabled => {
    document.body.classList.toggle("wishly-secret-theme", enabled);
    try { localStorage.setItem(secretThemeKey, enabled ? "on" : "off"); } catch {}
  };
  try { applySecretTheme(localStorage.getItem(secretThemeKey) === "on"); } catch {}

  const showSecret = () => {
    const notice = document.querySelector("#notice");
    if (!notice) return;
    notice.innerHTML = `✨ Secret unlocked! Wishly wishes you a little extra luck today.
      <div class="wishly-secret-actions"><button type="button" id="secret-theme-toggle">${document.body.classList.contains("wishly-secret-theme") ? "Turn secret theme off" : "Try secret theme"}</button></div>`;
    notice.classList.remove("hidden");
    notice.classList.add("wishly-secret-notice");
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    window.setTimeout(() => notice.classList.add("hidden"), 6500);
    document.querySelector("#secret-theme-toggle")?.addEventListener("click", event => {
      event.stopPropagation();
      const enabled = !document.body.classList.contains("wishly-secret-theme");
      applySecretTheme(enabled);
      const button = event.currentTarget;
      button.textContent = enabled ? "Turn secret theme off" : "Try secret theme";
    });
  };
  document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key.length !== 1) return;
    typed = (typed + event.key.toLowerCase()).slice(-6);
    window.clearTimeout(typedTimer);
    typedTimer = window.setTimeout(() => { typed = ""; }, 1800);
    if (typed.endsWith("wishly")) {
      showSecret();
      typed = "";
    }
  });

  // A small visible fortune button.
  const fortune = document.createElement("section");
  fortune.className = "wishly-fortune";
  fortune.innerHTML = '<button type="button" id="wishly-fortune-button">Get a random gift fortune</button><p id="wishly-fortune-text" aria-live="polite">A tiny bit of Wishly wisdom, whenever you need it.</p>';
  const about = document.getElementById("about");
  if (about) about.insertAdjacentElement("afterend", fortune);
  const fortunes = [
    "Your future contains at least one suspiciously large box.",
    "A thoughtful gift beats a perfectly wrapped mystery.",
    "The wishlist knows what the heart wants.",
    "May your batteries be included and your instructions understandable.",
    "A surprise is just a plan wearing a disguise.",
    "Your next great idea is probably one note away."
  ];
  document.getElementById("wishly-fortune-button")?.addEventListener("click", () => {
    const output = document.getElementById("wishly-fortune-text");
    output.textContent = fortunes[Math.floor(Math.random() * fortunes.length)];
  });
})();
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
    .wishly-fortune { position:relative; isolation:isolate; overflow:hidden; margin:30px auto 12px; padding:25px 24px 23px; border:1px solid #ded7fb; border-radius:22px; background:radial-gradient(ellipse at 50% -25%,#eee9ff 0,transparent 70%),linear-gradient(145deg,#fff 0%,#faf8ff 100%); color:var(--ink); text-align:center; max-width:520px; box-shadow:0 12px 30px rgba(75,57,153,.09),inset 0 1px 0 #fff; }
    .wishly-fortune::before { content:"✦"; position:absolute; z-index:-1; right:22px; top:8px; color:#c9bdf9; font-size:40px; transform:rotate(12deg); }
    .wishly-fortune::after { content:"✧"; position:absolute; z-index:-1; left:20px; bottom:8px; color:#d9cafa; font-size:30px; }
    .wishly-fortune-symbol { display:grid; place-items:center; width:46px; height:46px; margin:0 auto 12px; border:1px solid #e1d9ff; border-radius:15px; background:linear-gradient(145deg,#f1edff,#e5ddff); color:#6552cc; font-size:25px; box-shadow:inset 0 1px 0 #fff,0 5px 12px #6552cc16; }
    .wishly-fortune h2 { margin:0 0 5px; font:800 20px Manrope,sans-serif; letter-spacing:-.6px; }
    .wishly-fortune .wishly-fortune-intro { margin:0 auto 17px; max-width:340px; color:var(--muted); font-size:13px; }
    .wishly-fortune .wishly-fortune-button { display:inline-flex; align-items:center; justify-content:center; gap:9px; min-height:44px; padding:11px 18px; border:1px solid #5947c7; border-radius:12px; background:linear-gradient(135deg,#7968e4,#5946c5); color:white; font:700 13px 'DM Sans',sans-serif; cursor:pointer; box-shadow:inset 0 1px 0 #ffffff55,0 3px 0 #4535a5,0 7px 14px #5946c526; transition:transform .16s,box-shadow .16s; }
    .wishly-fortune .wishly-fortune-button:hover { transform:translateY(-2px); box-shadow:inset 0 1px 0 #ffffff55,0 4px 0 #4535a5,0 10px 18px #5946c532; }
    .wishly-fortune .wishly-fortune-button:active { transform:translateY(2px); box-shadow:inset 0 1px 0 #ffffff35,0 1px 0 #4535a5; }
    .wishly-fortune .wishly-fortune-result { margin:17px auto 0; max-width:390px; padding:12px 14px; border:1px dashed #d6cdf8; border-radius:12px; background:#fff; color:#5748a6; font-size:14px; font-weight:600; line-height:1.6; }
    .wishly-fortune .wishly-fortune-result:empty { display:none; }
    body.dark-mode .wishly-fortune { border-color:#39364e; background:radial-gradient(ellipse at 50% -25%,rgba(112,94,190,.22) 0,transparent 70%),linear-gradient(145deg,#22222e 0%,#1c1c27 100%); color:var(--ink); box-shadow:0 12px 30px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.035); }
    body.dark-mode .wishly-fortune::before { color:#5c507d; }
    body.dark-mode .wishly-fortune::after { color:#51476d; }
    body.dark-mode .wishly-fortune-symbol { border-color:#46405f; background:linear-gradient(145deg,#34304a,#29263c); color:#c5b8ff; box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 5px 12px rgba(0,0,0,.15); }
    body.dark-mode .wishly-fortune .wishly-fortune-result { border-color:#49415f; background:#292735; color:#d7ceff; }
    body.wishly-secret-theme.dark-mode .wishly-fortune { border-color:#514064; background:radial-gradient(ellipse at 50% -25%,rgba(133,91,176,.22) 0,transparent 70%),linear-gradient(145deg,#26212f,#1d1a25); }
    @media(max-width:520px) { .wishly-fortune { margin-top:22px; padding:22px 16px; } .wishly-fortune h2 { font-size:18px; } }
    @media(prefers-reduced-motion:reduce) { .wishly-fortune .wishly-fortune-button { transition:none; } }
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
  // Keep the original five-tap logo Easter egg too.
  const brand = document.querySelector(".topbar .brand");
  let logoTaps = 0;
  let logoTapTimer;
  brand?.addEventListener("click", event => {
    if (logoTaps >= 4) {
      event.preventDefault();
      logoTaps = 0;
      window.clearTimeout(logoTapTimer);
      showSecret();
      brand.classList.add("wishly-secret-found");
      window.setTimeout(() => brand.classList.remove("wishly-secret-found"), 700);
      return;
    }
    logoTaps += 1;
    window.clearTimeout(logoTapTimer);
    logoTapTimer = window.setTimeout(() => { logoTaps = 0; }, 1800);
    event.preventDefault();
  });

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
  fortune.innerHTML = '<div class="wishly-fortune-symbol" aria-hidden="true">✧</div><h2>The Wishly Fortune Teller</h2><p class="wishly-fortune-intro">Need a little gift-day wisdom? Let fate pick a message for you.</p><button type="button" class="wishly-fortune-button" id="wishly-fortune-button">Reveal my fortune <span aria-hidden="true">✦</span></button><p class="wishly-fortune-result" id="wishly-fortune-text" aria-live="polite"></p>';
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
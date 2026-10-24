(() => {
  const workspace = document.querySelector('#workspace');
  if (!workspace) return;

  let pendingReservation = false;
  let pendingTimer = null;
  let lastReservedButton = null;

  const style = document.createElement('style');
  style.textContent = `
    .wishly-reservation-banner {
      position: fixed;
      left: 50%;
      top: 24px;
      z-index: 9999;
      transform: translate(-50%, -14px);
      opacity: 0;
      pointer-events: none;
      padding: 12px 18px;
      border: 1px solid rgba(101,83,199,.2);
      border-radius: 999px;
      background: var(--card, #fff);
      color: var(--text, #282538);
      box-shadow: 0 12px 34px rgba(35,29,70,.16);
      font-weight: 700;
      transition: opacity .2s ease, transform .2s ease;
    }
    .wishly-reservation-banner.show {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    .wishly-confetti {
      position: fixed;
      inset: 0;
      z-index: 9998;
      pointer-events: none;
      overflow: hidden;
    }
    .wishly-confetti-piece {
      position: absolute;
      left: 50%;
      top: 43%;
      width: 9px;
      height: 15px;
      border-radius: 2px;
      opacity: 1;
      animation: wishly-confetti-burst var(--fall-time) cubic-bezier(.12,.72,.22,1) forwards;
      transform: translate(-50%, -50%) rotate(0deg);
      will-change: transform, opacity;
    }
    @keyframes wishly-confetti-burst {
      0% { transform: translate(-50%, -50%) rotate(0deg) scale(.35); opacity: 1; }
      12% { opacity: 1; }
      65% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--spin)) scale(1); opacity: 1; }
      100% { transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) rotate(calc(var(--spin) * 1.7)) scale(.75); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .wishly-reservation-banner { transition: none; }
      .wishly-confetti { display: none; }
    }
  `;
  document.head.appendChild(style);

  function showBanner() {
    let banner = document.querySelector('.wishly-reservation-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'wishly-reservation-banner';
      banner.setAttribute('role', 'status');
      banner.textContent = 'Gift reserved!';
      document.body.appendChild(banner);
    }
    banner.classList.remove('show');
    requestAnimationFrame(() => banner.classList.add('show'));
    clearTimeout(showBanner.timer);
    showBanner.timer = setTimeout(() => banner.classList.remove('show'), 2400);
  }

  function launchConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = document.createElement('div');
    layer.className = 'wishly-confetti';
    const pieces = 125;
    for (let i = 0; i < pieces; i += 1) {
      const piece = document.createElement('span');
      piece.className = 'wishly-confetti-piece';
      const angle = Math.random() * Math.PI * 2;
      const distance = 110 + Math.random() * Math.min(window.innerWidth * 0.52, 460);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance * 0.72;
      piece.style.setProperty('--dx', `${dx}px`);
      piece.style.setProperty('--dy', `${dy}px`);
      piece.style.setProperty('--end-x', `${dx * 1.18}px`);
      piece.style.setProperty('--end-y', `${dy * 1.18 + 170 + Math.random() * 130}px`);
      piece.style.setProperty('--spin', `${(Math.random() - 0.5) * 1500}deg`);
      piece.style.setProperty('--fall-time', `${1.35 + Math.random() * 0.9}s`);
      piece.style.animationDelay = `${Math.random() * 0.1}s`;
      piece.style.background = `hsl(${Math.floor(Math.random() * 360)} 78% 58%)`;
      if (Math.random() < 0.25) {
        piece.style.width = '6px';
        piece.style.height = '6px';
        piece.style.borderRadius = '50%';
      }
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 2600);
  }

  function celebrate() {
    showBanner();
    launchConfetti();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('.reserve-toggle');
    if (!button || button.disabled) return;
    const label = button.textContent.trim();
    if (label !== 'Reserve gift') return;
    pendingReservation = true;
    lastReservedButton = button;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      pendingReservation = false;
      lastReservedButton = null;
    }, 6000);
  }, true);

  const observer = new MutationObserver(() => {
    if (!pendingReservation) return;
    const success = [...workspace.querySelectorAll('.reserve-toggle')].some(button =>
      button !== lastReservedButton && button.textContent.trim() === 'Undo reservation'
    );
    if (!success) return;
    pendingReservation = false;
    clearTimeout(pendingTimer);
    lastReservedButton = null;
    celebrate();
  });

  observer.observe(workspace, { childList: true, subtree: true, characterData: true });
})();

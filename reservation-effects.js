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
      top: -16px;
      width: 8px;
      height: 13px;
      border-radius: 2px;
      animation: wishly-confetti-fall var(--fall-time) cubic-bezier(.2,.7,.3,1) forwards;
      transform: translate3d(0,0,0) rotate(0deg);
    }
    @keyframes wishly-confetti-fall {
      0% { transform: translate3d(0,0,0) rotate(0deg); opacity: 1; }
      75% { opacity: 1; }
      100% { transform: translate3d(var(--drift), 105vh, 0) rotate(var(--spin)); opacity: 0; }
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
    const pieces = 72;
    for (let i = 0; i < pieces; i += 1) {
      const piece = document.createElement('span');
      piece.className = 'wishly-confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 260}px`);
      piece.style.setProperty('--spin', `${(Math.random() - 0.5) * 1100}deg`);
      piece.style.setProperty('--fall-time', `${1.15 + Math.random() * 1.05}s`);
      piece.style.animationDelay = `${Math.random() * 0.18}s`;
      piece.style.background = `hsl(${Math.floor(Math.random() * 360)} 70% 58%)`;
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

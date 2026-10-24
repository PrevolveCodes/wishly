/* Visible first-gift-giver password setup UI.
   This wraps the existing setup flow without changing its Firebase logic. */
(function(){
  let allowOriginalSetup = false;
  let originalPrompt = window.prompt;

  function escapeHtml(value){
    return String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function closeModal(){
    const modal = document.getElementById("gift-password-modal");
    if(modal) modal.remove();
    document.body.classList.remove("gift-password-modal-open");
  }

  function showModal(button){
    closeModal();
    const modal = document.createElement("div");
    modal.id = "gift-password-modal";
    modal.className = "gift-password-modal";
    modal.innerHTML = `
      <div class="gift-password-backdrop" data-close="1"></div>
      <section class="gift-password-dialog" role="dialog" aria-modal="true" aria-labelledby="gift-password-title">
        <button class="gift-password-close" type="button" aria-label="Close">×</button>
        <div class="eyebrow">FIRST GIFT-GIVER</div>
        <h2 id="gift-password-title">Create the private gift password</h2>
        <p class="gift-password-description">This password is for gift-givers only. Share it with the other people buying gifts, but do not share it with the wishlist owner.</p>
        <form id="gift-password-form">
          <label for="gift-password-new">Private gift password</label>
          <input id="gift-password-new" type="password" minlength="8" maxlength="32" autocomplete="new-password" placeholder="At least 8 characters" required>
          <label for="gift-password-confirm">Confirm password</label>
          <input id="gift-password-confirm" type="password" minlength="8" maxlength="32" autocomplete="new-password" placeholder="Enter it again" required>
          <p class="gift-password-error" id="gift-password-error" aria-live="polite"></p>
          <div class="gift-password-actions">
            <button class="small-button" id="gift-password-cancel" type="button">Cancel</button>
            <button class="button button-primary" type="submit">Create password <span>→</span></button>
          </div>
        </form>
      </section>`;
    document.body.appendChild(modal);
    document.body.classList.add("gift-password-modal-open");

    const first = modal.querySelector("#gift-password-new");
    const confirm = modal.querySelector("#gift-password-confirm");
    const error = modal.querySelector("#gift-password-error");
    setTimeout(() => first.focus(), 30);

    const cancel = () => closeModal();
    modal.querySelector(".gift-password-close").addEventListener("click", cancel);
    modal.querySelector("#gift-password-cancel").addEventListener("click", cancel);
    modal.querySelector(".gift-password-backdrop").addEventListener("click", cancel);

    modal.querySelector("#gift-password-form").addEventListener("submit", event => {
      event.preventDefault();
      const pin = first.value.trim();
      const confirmation = confirm.value.trim();
      if(pin.length < 8 || pin.length > 32){
        error.textContent = "The password must be 8–32 characters long.";
        first.focus();
        return;
      }
      if(pin !== confirmation){
        error.textContent = "The passwords do not match.";
        confirm.focus();
        return;
      }

      error.textContent = "Creating your private gift access…";
      const oldPrompt = window.prompt;
      let promptCount = 0;
      window.prompt = function(){
        promptCount += 1;
        const value = promptCount === 1 ? pin : confirmation;
        if(promptCount >= 2){
          setTimeout(() => { window.prompt = oldPrompt; }, 0);
        }
        return value;
      };
      allowOriginalSetup = true;
      closeModal();
      button.click();
      setTimeout(() => {
        if(window.prompt !== oldPrompt && promptCount < 2) window.prompt = oldPrompt;
        allowOriginalSetup = false;
      }, 10000);
    });
  }

  document.addEventListener("click", event => {
    if(allowOriginalSetup) return;
    const button = event.target.closest("#setup-gift-access");
    if(!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showModal(button);
  }, true);

  const style = document.createElement("style");
  style.textContent = `
    body.gift-password-modal-open{overflow:hidden}
    .gift-password-modal{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px}
    .gift-password-backdrop{position:absolute;inset:0;background:rgba(20,16,35,.55);backdrop-filter:blur(3px)}
    .gift-password-dialog{position:relative;width:min(520px,100%);max-height:calc(100vh - 40px);overflow:auto;padding:30px;border:1px solid rgba(120,105,170,.22);border-radius:22px;background:var(--card,#fff);box-shadow:0 24px 80px rgba(20,16,35,.28);color:var(--text,#29243a)}
    .gift-password-dialog h2{margin:7px 42px 8px 0;font-size:26px;line-height:1.15}
    .gift-password-description{margin:0 0 22px;color:var(--muted,#706b80);line-height:1.55}
    .gift-password-dialog label{display:block;margin:14px 0 7px;font-weight:700;font-size:13px}
    .gift-password-dialog input{width:100%;min-height:48px;padding:12px 14px;border:1px solid #dcd8e8;border-radius:10px;background:transparent;color:inherit;font:inherit;box-sizing:border-box}
    .gift-password-dialog input:focus{outline:2px solid rgba(101,83,199,.35);outline-offset:1px;border-color:#6553c7}
    .gift-password-close{position:absolute;top:16px;right:16px;width:38px;height:38px;border:0;border-radius:50%;background:transparent;color:inherit;font-size:28px;line-height:1;cursor:pointer}
    .gift-password-close:hover{background:rgba(101,83,199,.09)}
    .gift-password-error{min-height:20px;margin:8px 0 0;color:#b23b55;font-size:13px}
    .gift-password-actions{display:flex;justify-content:flex-end;gap:10px;align-items:center;margin-top:14px}
    @media(max-width:560px){.gift-password-modal{padding:12px}.gift-password-dialog{padding:23px 18px;border-radius:17px}.gift-password-dialog h2{font-size:23px}.gift-password-actions{display:grid;grid-template-columns:1fr 1fr}.gift-password-actions button{width:100%;min-height:46px}}
  `;
  document.head.appendChild(style);
})();

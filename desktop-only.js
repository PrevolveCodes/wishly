(() => {
  const mobileUserAgent = /Android|iPhone|iPad|iPod|IEMobile|Windows Phone|webOS|BlackBerry|Opera Mini|Mobile/i.test(navigator.userAgent);
  const mobileDevice = navigator.userAgentData?.mobile === true || mobileUserAgent;

  if (!mobileDevice) {
    document.documentElement.classList.add("wishly-desktop-allowed");
    return;
  }

  document.documentElement.classList.add("wishly-mobile-blocked");
  const style = document.createElement("style");
  style.textContent = `
    html.wishly-mobile-blocked body { display: none !important; }
    html.wishly-mobile-blocked.wishly-mobile-blocked-ready body {
      display: grid !important;
      place-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
      background: #f7f6f2;
      color: #24252c;
      font: 16px/1.6 Arial, sans-serif;
    }
    .wishly-desktop-message {
      width: min(100%, 440px);
      padding: 36px 28px;
      box-sizing: border-box;
      text-align: center;
      background: #fff;
      border: 1px solid #e8e5df;
      border-radius: 18px;
      box-shadow: 0 12px 32px rgba(30, 25, 50, .08);
    }
    .wishly-desktop-message h1 { margin: 0 0 12px; font-size: 25px; line-height: 1.2; }
    .wishly-desktop-message p { margin: 0; color: #686579; }
  `;
  document.head.appendChild(style);

  document.addEventListener("DOMContentLoaded", () => {
    window.alert("Wishly is designed for computers. You can try enabling Desktop site or Request desktop website in your browser menu, but it may not work on every device. For the full experience, open Wishly on a desktop or laptop.");
    document.body.innerHTML = '<main class="wishly-desktop-message"><h1>Wishly only works on a computer.</h1><p>You can try enabling <strong>Desktop site</strong> or <strong>Request desktop website</strong> in your browser menu. It may not work on every device. For the full experience, use a desktop or laptop.</p></main>';
    document.documentElement.classList.add("wishly-mobile-blocked-ready");
  }, { once: true });
})();
import { collection, doc, query, where, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export function mountNotifications(db,user,controls,settingsButton) {
  const email=String(user.email||"").toLowerCase();
  if(!email||!settingsButton)return ()=>{};
  const style=document.createElement("style");
  style.textContent=`
    .wishly-account-controls{grid-template-columns:minmax(0,1fr) 38px 44px!important;gap:6px!important;position:relative}
    .wishly-account-controls .wishly-profile-button{gap:7px;padding:5px}
    .wishly-account-controls .wishly-profile-avatar{width:32px;height:32px;flex-basis:32px}
    .wishly-notification-button{position:relative;display:grid;place-items:center;width:38px;height:44px;padding:0;border:1px solid var(--line);border-radius:12px;background:var(--card,var(--white));color:var(--muted);cursor:pointer}
    .wishly-notification-button:hover,.wishly-notification-button[aria-expanded=true]{color:var(--purple);border-color:var(--purple)}
    .wishly-notification-button svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .wishly-notification-badge{position:absolute;right:-5px;top:-5px;min-width:18px;height:18px;padding:0 4px;display:grid;place-items:center;background:#c43b4d;color:#fff;border:2px solid var(--white);border-radius:20px;font:700 10px/1 sans-serif}
    .wishly-notification-panel{position:fixed;inset:auto;margin:0;z-index:10000;width:330px;max-width:calc(100vw - 24px);max-height:min(440px,70vh);overflow:auto;padding:14px;background:var(--white);color:var(--ink);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 36px #0003}
    .wishly-notification-panel header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 0 10px;border-bottom:1px solid var(--line)}
    .wishly-notification-panel h2{font:700 16px/1.3 Manrope,sans-serif;margin:0}
    .wishly-notification-panel .notification-close{border:0;background:transparent;color:var(--muted);font-size:23px;cursor:pointer;padding:0 4px;line-height:1}
    .wishly-notification-item{padding:12px 2px;border-bottom:1px solid var(--line);display:grid;gap:5px}
    .wishly-notification-item:last-child{border-bottom:0}
    .wishly-notification-item strong{font-size:13px;overflow-wrap:anywhere}
    .wishly-notification-item p,.wishly-notification-empty{font-size:12px;color:var(--muted);margin:0;overflow-wrap:anywhere}
    .wishly-notification-empty{padding:14px 0}
    .wishly-notification-item a{font-size:12px;color:var(--purple);font-weight:700;text-decoration:none;justify-self:start}
    .wishly-notification-item a:hover{text-decoration:underline}
    .wishly-notification-item[data-unread=true] strong::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--purple);margin-right:7px}
    body.dark-mode .wishly-notification-button{background:#1c2332;border-color:#39465c;color:#c5cee1}
    body.dark-mode .wishly-notification-panel{background:#22222e;border-color:#39465c}
    .wishly-notification-badge[hidden],.wishly-notification-panel[hidden]{display:none!important}
  `;
  document.head.append(style);
  const button=document.createElement("button");
  button.type="button";button.className="wishly-notification-button";button.title="Notifications";button.setAttribute("aria-label","Notifications");button.setAttribute("aria-expanded","false");button.setAttribute("aria-controls","wishly-notification-panel");
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span class="wishly-notification-badge" hidden></span>';
  settingsButton.before(button);
  const badge=button.querySelector("span");
  const panel=document.createElement("section");panel.id="wishly-notification-panel";panel.className="wishly-notification-panel";panel.popover="auto";panel.setAttribute("aria-label","Notifications");
  panel.innerHTML='<header><h2>Notifications</h2><button type="button" class="notification-close" aria-label="Close notifications">×</button></header><div class="notification-list" aria-live="polite"></div>';
  controls.append(panel);
  const list=panel.querySelector(".notification-list");
  let invites=[],shares=[],inviteReady=false,shareReady=false,failed=false;
  function addItem(title,message,label,href,unread,click){
    const item=document.createElement("article");item.className="wishly-notification-item";item.dataset.unread=String(unread);
    const strong=document.createElement("strong");strong.textContent=title;
    const p=document.createElement("p");p.textContent=message;
    const a=document.createElement("a");a.href=href;a.textContent=label;if(click)a.addEventListener("click",click);
    item.append(strong,p,a);list.append(item);
  }
  function note(message){const p=document.createElement("p");p.className="wishly-notification-empty";p.textContent=message;list.append(p);}
  function render(){
    const count=invites.length+shares.filter(s=>!s.read).length;
    badge.hidden=count===0;badge.textContent=count>99?"99+":String(count);
    button.setAttribute("aria-label",count?"Notifications ("+count+" unread)":"Notifications");
    list.replaceChildren();
    for(const f of invites)addItem("Family invitation","You've been invited to join "+(f.name||"a family")+".","View invitation","dashboard.html?view=families",true,e=>{if(typeof window.wishlyShowDashboardView==="function"){e.preventDefault();window.wishlyShowDashboardView("families");close();}});
    for(const s of shares)addItem(s.title||"Shared wishlist",(s.ownerName||"A family member")+" shared a wishlist with you.","Open wishlist","gift.html?code="+encodeURIComponent(s.code),!s.read,async e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();const href=e.currentTarget.href;try{if(!s.read)await updateDoc(doc(db,"notificationInboxes",email,"shares",s.id),{read:true});}catch(error){console.warn("Could not mark notification read",error);}location.href=href;});
    if(!invites.length&&!shares.length)note(!inviteReady||!shareReady?"Loading notifications…":failed?"Some notifications could not be loaded.":"You're all caught up.");
    else if(failed)note("Some notifications could not be loaded.");
  }
  function position(){const rect=button.getBoundingClientRect(),width=panel.offsetWidth,height=panel.offsetHeight;panel.style.left=Math.max(12,Math.min(rect.right-width,innerWidth-width-12))+"px";panel.style.top=Math.max(12,Math.min(rect.top-height-12,innerHeight-height-12))+"px";}
  function isOpen() { return panel.matches(":popover-open"); }
  function close() {
    if (isOpen()) panel.hidePopover();
  }
  function refreshPosition() {
    if (isOpen()) position();
  }
  panel.addEventListener("toggle", () => {
    button.setAttribute("aria-expanded", String(isOpen()));
    if (isOpen()) {
      position();
      panel.querySelector(".notification-close").focus();
    }
  });
  button.popoverTargetElement = panel;
  panel.querySelector(".notification-close").addEventListener("click", () => {
    close();
    button.focus();
  });
  window.addEventListener("resize", refreshPosition);
  const stopInvites=onSnapshot(query(collection(db,"families"),where("pendingEmails","array-contains",email)),snap=>{invites=snap.docs.map(d=>d.data()).filter(f=>!(f.memberEmails||[]).includes(email));inviteReady=true;render();refreshPosition();},error=>{console.warn("Family notifications",error);inviteReady=true;failed=true;render();});
  const stopShares=onSnapshot(collection(db,"notificationInboxes",email,"shares"),snap=>{shares=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));shareReady=true;render();refreshPosition();},error=>{console.warn("Wishlist notifications",error);shareReady=true;failed=true;render();});
  render();
  return ()=>{stopInvites();stopShares();window.removeEventListener("resize",refreshPosition);panel.remove();button.remove();style.remove();};
}

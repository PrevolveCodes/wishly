/* Wishly starter. Lists currently stay in this browser; cross-device codes require a secure backend. */
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const createForm = $('#create-form');
  const viewForm = $('#view-form');
  const workspace = $('#workspace');
  const notice = $('#notice');
  const dialog = $('#item-dialog');
  const itemForm = $('#item-form');
  let activeListId = null;
  let activeMode = 'owner';
  let noticeTimer;

  const readLists = () => {
    try { return JSON.parse(localStorage.getItem('wishly-lists') || '{}'); }
    catch { return {}; }
  };
  const writeLists = (lists) => localStorage.setItem('wishly-lists', JSON.stringify(lists));
  const makeCode = (lists) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
      code = Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (lists[code]);
    return code;
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = (value) => {
    try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : ''; }
    catch { return ''; }
  };
  function toast(message) {
    notice.textContent = message;
    notice.classList.remove('hidden');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => notice.classList.add('hidden'), 3400);
  }
  function openWorkspace(list, mode) {
    activeListId = list.code;
    activeMode = mode;
    const owner = mode === 'owner';
    const items = Array.isArray(list.items) ? list.items : [];
    workspace.innerHTML = `
      <div class="workspace-head">
        <div><div class="eyebrow">${owner ? 'YOUR WISHLIST' : 'A WISHLIST FOR SOMEONE'}</div><h2>${escapeHtml(list.title)}</h2><p class="workspace-sub">${escapeHtml(list.ownerName)} · ${escapeHtml(list.occasion)}</p></div>
        <div class="code-chip" title="Wishlist code">${escapeHtml(list.code)} ${owner ? '<button class="small-button" id="copy-code" type="button">Copy</button>' : ''}</div>
      </div>
      ${owner ? '<p class="workspace-sub">Keep this code somewhere safe and share it with your gift-givers. Add your first item below.</p><div class="workspace-actions"><button class="button button-primary" id="add-item" type="button" style="width:auto;margin:0;gap:22px">Add an item <span>+</span></button><button class="small-button" id="copy-share" type="button">Copy sharing message</button></div>' : '<p class="workspace-sub">Here are the gift ideas they added. Please keep purchase plans a surprise.</p>'}
      <div class="item-list">${items.length ? items.map((item, index) => {
        const url = safeUrl(item.url);
        return `<article class="wish-item ${!owner && item.purchased ? 'purchased' : ''}">
          <div class="item-placeholder" aria-hidden="true">${item.purchased && !owner ? '✓' : '♡'}</div>
          <div class="item-info"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.priority || 'Would love')}${item.notes ? ' · ' + escapeHtml(item.notes) : ''}</p>${url ? '<a class="item-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">View at store ↗</a>' : ''}</div>
          ${item.price !== '' && item.price != null ? '<div class="item-price">$' + Number(item.price).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) + '</div>' : ''}
          ${owner ? '<button class="small-button remove-item" data-index="' + index + '" type="button" aria-label="Remove ' + escapeHtml(item.name) + '">Remove</button>' : '<button class="small-button toggle-purchased" data-index="' + index + '" type="button">' + (item.purchased ? 'Purchased ✓' : 'Mark purchased') + '</button>'}
        </article>`;
      }).join('') : '<div class="empty-state">No items yet. Add the things you’re wishing for.</div>'}</div>
      ${!owner ? '<p class="workspace-sub" style="margin-top:16px">Purchase status is saved only on this device in this starter version.</p>' : ''}
    `;
    workspace.classList.remove('hidden');
    workspace.scrollIntoView({behavior:'smooth', block:'start'});
    $('#copy-code')?.addEventListener('click', () => copyText(list.code, 'Wishlist code copied.'));
    $('#copy-share')?.addEventListener('click', () => copyText(`I made a wishlist on Wishly! Enter code ${list.code} to see it.`, 'Sharing message copied.'));
    $('#add-item')?.addEventListener('click', () => { itemForm.reset(); dialog.showModal(); $('#item-name').focus(); });
    workspace.querySelectorAll('.remove-item').forEach(button => button.addEventListener('click', () => {
      const lists = readLists(); const current = lists[activeListId];
      if (!current || !confirm('Remove this item from your wishlist?')) return;
      current.items.splice(Number(button.dataset.index), 1); writeLists(lists); openWorkspace(current, 'owner');
    }));
    workspace.querySelectorAll('.toggle-purchased').forEach(button => button.addEventListener('click', () => {
      const lists = readLists(); const current = lists[activeListId];
      if (!current) return;
      current.items[Number(button.dataset.index)].purchased = !current.items[Number(button.dataset.index)].purchased;
      writeLists(lists); openWorkspace(current, 'gift');
    }));
  }
  async function copyText(text, success) {
    try {
      await navigator.clipboard.writeText(text);
      toast(success);
    } catch {
      const field = document.createElement('textarea');
      field.value = text; document.body.append(field); field.select();
      const copied = document.execCommand('copy'); field.remove();
      toast(copied ? success : 'Copy was blocked. Please select and copy the text.');
    }
  }
  createForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(createForm);
    const lists = readLists();
    const code = makeCode(lists);
    const list = {code, ownerName:String(data.get('ownerName')).trim(), title:String(data.get('title')).trim(), occasion:String(data.get('occasion')), items:[], createdAt:new Date().toISOString()};
    if (!list.ownerName || !list.title) return;
    lists[code] = list;
    try { writeLists(lists); }
    catch { toast('Could not save this wishlist. Your browser storage may be full.'); return; }
    openWorkspace(list, 'owner');
  });
  viewForm.addEventListener('submit', event => {
    event.preventDefault();
    const code = String(new FormData(viewForm).get('code') || '').trim().toUpperCase().replace(/\s/g, '');
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) { toast('Enter a valid 6-character wishlist code.'); return; }
    const list = readLists()[code];
    if (!list) { toast('Wishlist not found in this browser. Shared codes will work once online storage is connected.'); return; }
    openWorkspace(list, 'gift');
  });
  itemForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(itemForm);
    const name = String(data.get('itemName') || '').trim();
    const rawUrl = String(data.get('itemUrl') || '').trim();
    const url = rawUrl ? safeUrl(rawUrl) : '';
    if (!name) { toast('Please enter an item name.'); return; }
    if (rawUrl && !url) { toast('Use a valid http or https store link.'); return; }
    const lists = readLists();
    const list = lists[activeListId];
    if (!list) { toast('Could not find that wishlist.'); dialog.close(); return; }
    list.items.push({name, url, price:String(data.get('itemPrice') || ''), priority:String(data.get('itemPriority') || 'Would love'), notes:String(data.get('itemNotes') || '').trim(), purchased:false});
    try { writeLists(lists); }
    catch { toast('Could not save this item. Browser storage may be full.'); return; }
    dialog.close();
    openWorkspace(list, 'owner');
    toast('Item added to your wishlist.');
  });
  $('#close-modal').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  $('#list-code').addEventListener('input', event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0,6); });
})();
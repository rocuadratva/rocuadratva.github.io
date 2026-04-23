(function () {
  'use strict';

  /* ── CSS ── */
  var style = document.createElement('style');
  style.textContent = [
    '#rc-hub{position:fixed;bottom:24px;right:24px;z-index:100001;font-family:"Inter",system-ui,sans-serif;display:flex;flex-direction:column;align-items:flex-end;gap:10px}',

    '#rc-hub-fab{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#F26C38,#D72F58);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(242,108,56,.45),0 0 28px rgba(242,108,56,.18);animation:hub-pulse 2.5s ease-in-out infinite;transition:transform .2s,filter .2s;flex-shrink:0}',
    '#rc-hub-fab:hover{transform:translateY(-2px);filter:brightness(1.1);animation-play-state:paused}',
    '@keyframes hub-pulse{0%,100%{box-shadow:0 0 10px rgba(242,108,56,.45),0 0 28px rgba(242,108,56,.18)}50%{box-shadow:0 0 22px rgba(242,108,56,.75),0 0 55px rgba(215,47,88,.35)}}',

    '#rc-hub-menu{display:flex;flex-direction:column;gap:8px;align-items:flex-end;opacity:0;pointer-events:none;transform:translateY(10px);transition:opacity .22s,transform .22s}',
    '#rc-hub-menu.hub-open{opacity:1;pointer-events:all;transform:translateY(0)}',

    '.hub-opt{display:flex;align-items:center;gap:10px;background:#1E1E1E;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 16px 10px 12px;cursor:pointer;font-size:13px;color:#fff;font-family:inherit;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.45);transition:border-color .15s,background .15s,transform .15s;text-align:left}',
    '.hub-opt:hover{border-color:rgba(242,108,56,.6);background:#252525;transform:translateX(-3px)}',
    '.hub-opt-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:17px;line-height:1}',
    '.hub-opt-label{font-size:13px;font-weight:600;line-height:1.2;color:#fff}',
    '.hub-opt-sub{font-size:11px;color:#A1A1A1;margin-top:2px}',
    '.hub-opt-text{display:flex;flex-direction:column}',

    '.hub-soon{font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:linear-gradient(135deg,#F26C38,#D72F58);color:#fff;border-radius:4px;padding:2px 5px;margin-left:6px;vertical-align:middle;display:inline-block;line-height:1.4}',

    '#rc-hub-backdrop{position:fixed;inset:0;z-index:100000;background:transparent}',

    '@media(max-width:420px){.hub-opt{padding:9px 12px 9px 10px}.hub-opt-icon{width:30px;height:30px;font-size:15px}}'
  ].join('');
  document.head.appendChild(style);

  /* ── DOM ── */
  var hub = document.createElement('div');
  hub.id = 'rc-hub';
  hub.innerHTML = [
    '<div id="rc-hub-menu" role="menu">',

      '<button class="hub-opt" data-action="voice" role="menuitem">',
        '<span class="hub-opt-icon" style="background:rgba(167,139,250,.14)">🎤</span>',
        '<span class="hub-opt-text">',
          '<span class="hub-opt-label">Voice Receptionist<span class="hub-soon">Soon</span></span>',
          '<span class="hub-opt-sub" id="hub-voice-sub">Talk to our AI receptionist</span>',
        '</span>',
      '</button>',

      '<button class="hub-opt" data-action="chat" role="menuitem">',
        '<span class="hub-opt-icon" style="background:rgba(242,108,56,.14)">💬</span>',
        '<span class="hub-opt-text">',
          '<span class="hub-opt-label">Chat with Roc</span>',
          '<span class="hub-opt-sub">Questions &amp; appointment booking</span>',
        '</span>',
      '</button>',

      '<button class="hub-opt" data-action="book" role="menuitem">',
        '<span class="hub-opt-icon" style="background:rgba(52,211,153,.14)">📅</span>',
        '<span class="hub-opt-text">',
          '<span class="hub-opt-label">Book a Discovery Call</span>',
          '<span class="hub-opt-sub">Schedule directly on my calendar</span>',
        '</span>',
      '</button>',

      '<button class="hub-opt" data-action="form" role="menuitem">',
        '<span class="hub-opt-icon" style="background:rgba(96,165,250,.14)">📝</span>',
        '<span class="hub-opt-text">',
          '<span class="hub-opt-label">Describe My Problem</span>',
          '<span class="hub-opt-sub">Get a free automation audit</span>',
        '</span>',
      '</button>',

    '</div>',

    '<button id="rc-hub-fab" aria-label="Get help" aria-expanded="false" aria-haspopup="true">',
      '<svg id="hub-icon-closed" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
        '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
      '</svg>',
      '<svg id="hub-icon-open" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:none">',
        '<path d="M18 6L6 18M6 6l12 12"/>',
      '</svg>',
    '</button>'
  ].join('');
  document.body.appendChild(hub);

  var fab        = document.getElementById('rc-hub-fab');
  var menu       = document.getElementById('rc-hub-menu');
  var iconClosed = document.getElementById('hub-icon-closed');
  var iconOpen   = document.getElementById('hub-icon-open');
  var voiceSub   = document.getElementById('hub-voice-sub');
  var isOpen     = false;
  var backdrop   = null;

  function openMenu() {
    isOpen = true;
    menu.classList.add('hub-open');
    fab.setAttribute('aria-expanded', 'true');
    iconClosed.style.display = 'none';
    iconOpen.style.display   = 'block';
    fab.style.animation = 'none';
    backdrop = document.createElement('div');
    backdrop.id = 'rc-hub-backdrop';
    backdrop.addEventListener('click', closeMenu);
    document.body.insertBefore(backdrop, hub);
  }

  function closeMenu() {
    isOpen = false;
    menu.classList.remove('hub-open');
    fab.setAttribute('aria-expanded', 'false');
    iconClosed.style.display = 'block';
    iconOpen.style.display   = 'none';
    fab.style.animation = '';
    if (backdrop) { backdrop.remove(); backdrop = null; }
  }

  fab.addEventListener('click', function (e) {
    e.stopPropagation();
    if (isOpen) closeMenu(); else openMenu();
  });

  menu.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');

    if (action === 'voice') {
      var orig = voiceSub.textContent;
      if (orig === '🚀 Coming soon — stay tuned!') return;
      voiceSub.textContent = '🚀 Coming soon — stay tuned!';
      btn.style.borderColor = 'rgba(242,108,56,.6)';
      setTimeout(function () {
        voiceSub.textContent = orig;
        btn.style.borderColor = '';
      }, 2500);
      return;
    }

    closeMenu();

    if (action === 'form') {
      if (window.rcCloseChat) window.rcCloseChat();
      setTimeout(function () {
        if (window.openLeadModal) window.openLeadModal('form');
      }, 50);
    } else if (action === 'book') {
      if (window.rcCloseChat) window.rcCloseChat();
      setTimeout(function () {
        if (window.openLeadModal) window.openLeadModal('book');
      }, 50);
    } else if (action === 'chat') {
      if (window.rcToggleChat) window.rcToggleChat();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });

})();

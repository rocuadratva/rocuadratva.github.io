(function () {
  'use strict';

  var WEBHOOK_URL = 'https://n8n.srv1326537.hstgr.cloud/webhook/ghl-appointment-bot';
  var OPENING_MSG = "Hi! I'm Raphael's AI assistant. I can book, reschedule, or cancel your discovery call. How can I help?";

  var sessionId = sessionStorage.getItem('rc_chat_sid');
  if (!sessionId) {
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    sessionStorage.setItem('rc_chat_sid', sessionId);
  }

  var state = { open: false, waiting: false };

  /* ── CSS ── */
  var style = document.createElement('style');
  style.textContent = [
    '#rc-chat-widget{position:fixed;bottom:24px;right:24px;z-index:99999;font-family:"Inter",system-ui,sans-serif}',

    /* Bubble */
    '#rc-bubble{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#F26C38,#D72F58);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(242,108,56,.45),0 0 28px rgba(242,108,56,.18);animation:rc-pulse 2.5s ease-in-out infinite;transition:transform .2s,filter .2s}',
    '#rc-bubble:hover{transform:translateY(-2px);filter:brightness(1.1);animation-play-state:paused}',
    '@keyframes rc-pulse{0%,100%{box-shadow:0 0 10px rgba(242,108,56,.45),0 0 28px rgba(242,108,56,.18)}50%{box-shadow:0 0 22px rgba(242,108,56,.75),0 0 55px rgba(215,47,88,.35)}}',

    /* Panel */
    '#rc-panel{position:absolute;bottom:68px;right:0;width:360px;height:480px;background:#1E1E1E;border:1px solid rgba(255,255,255,.15);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.6),0 0 40px rgba(242,108,56,.08);display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;transform:translateY(12px) scale(.97);transition:opacity .25s,transform .25s}',
    '#rc-panel.rc-open{opacity:1;pointer-events:all;transform:translateY(0) scale(1)}',

    /* Header */
    '#rc-header{display:flex;align-items:center;gap:10px;padding:14px 16px;background:#252525;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}',
    '#rc-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#F26C38,#D72F58);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;font-weight:700;color:#fff}',
    '#rc-header-text{flex:1}',
    '#rc-header-name{font-size:13px;font-weight:700;color:#fff;line-height:1.2}',
    '#rc-header-sub{font-size:11px;color:#A1A1A1;margin-top:1px}',
    '#rc-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.4);font-size:18px;line-height:1;padding:4px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:color .15s}',
    '#rc-close:hover{color:#fff}',

    /* Messages */
    '#rc-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}',
    '#rc-messages::-webkit-scrollbar{width:4px}',
    '#rc-messages::-webkit-scrollbar-track{background:transparent}',
    '#rc-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:2px}',
    '.rc-msg{max-width:80%;font-size:13px;line-height:1.55;padding:10px 14px;word-break:break-word}',
    '.rc-msg--ai{align-self:flex-start;background:#2A2A2A;color:#fff;border-radius:12px 12px 12px 4px}',
    '.rc-msg--user{align-self:flex-end;background:linear-gradient(135deg,#F26C38,#D72F58);color:#fff;border-radius:12px 12px 4px 12px}',

    /* Typing indicator */
    '#rc-typing{align-self:flex-start;background:#2A2A2A;border-radius:12px 12px 12px 4px;padding:12px 16px;display:none;gap:5px;align-items:center}',
    '#rc-typing.rc-show{display:flex}',
    '.rc-dot{width:6px;height:6px;border-radius:50%;background:#A1A1A1;animation:rc-bounce .9s ease-in-out infinite}',
    '.rc-dot:nth-child(2){animation-delay:.15s}',
    '.rc-dot:nth-child(3){animation-delay:.3s}',
    '@keyframes rc-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',

    /* Input row */
    '#rc-input-row{display:flex;align-items:center;gap:8px;padding:12px 14px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0}',
    '#rc-input{flex:1;background:#2A2A2A;border:none;border-radius:999px;padding:10px 16px;font-size:13px;color:#fff;font-family:inherit;outline:none;caret-color:#F26C38}',
    '#rc-input::placeholder{color:#A1A1A1}',
    '#rc-send{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#F26C38,#D72F58);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:filter .15s,transform .15s}',
    '#rc-send:hover{filter:brightness(1.15);transform:scale(1.05)}',
    '#rc-send:disabled{opacity:.4;cursor:default;transform:none}',

    /* Mobile */
    '@media(max-width:420px){#rc-panel{width:calc(100vw - 32px);right:-8px}}'
  ].join('');
  document.head.appendChild(style);

  /* ── DOM ── */
  var wrap = document.createElement('div');
  wrap.id = 'rc-chat-widget';
  wrap.innerHTML = [
    '<button id="rc-bubble" aria-label="Chat with AI">',
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      '</svg>',
    '</button>',
    '<div id="rc-panel" role="dialog" aria-label="AI Chat" aria-hidden="true">',
      '<div id="rc-header">',
        '<div id="rc-avatar">R</div>',
        '<div id="rc-header-text">',
          '<div id="rc-header-name">Raphael\'s AI</div>',
          '<div id="rc-header-sub">AI Appointment Setter</div>',
        '</div>',
        '<button id="rc-close" aria-label="Close chat">&times;</button>',
      '</div>',
      '<div id="rc-messages">',
        '<div id="rc-typing"><span class="rc-dot"></span><span class="rc-dot"></span><span class="rc-dot"></span></div>',
      '</div>',
      '<div id="rc-input-row">',
        '<input id="rc-input" type="text" placeholder="Type a message..." autocomplete="off">',
        '<button id="rc-send" aria-label="Send">',
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
            '<path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>',
          '</svg>',
        '</button>',
      '</div>',
    '</div>'
  ].join('');
  document.body.appendChild(wrap);

  var bubble   = document.getElementById('rc-bubble');
  var panel    = document.getElementById('rc-panel');
  var messages = document.getElementById('rc-messages');
  var typing   = document.getElementById('rc-typing');
  var input    = document.getElementById('rc-input');
  var sendBtn  = document.getElementById('rc-send');
  var closeBtn = document.getElementById('rc-close');

  /* ── Helpers ── */
  function scrollBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function appendMsg(text, role) {
    var div = document.createElement('div');
    div.className = 'rc-msg rc-msg--' + role;
    div.textContent = text;
    messages.insertBefore(div, typing);
    scrollBottom();
  }

  function setWaiting(val) {
    state.waiting = val;
    sendBtn.disabled = val;
    input.disabled = val;
    typing.classList.toggle('rc-show', val);
    scrollBottom();
  }

  /* ── Toggle panel ── */
  function togglePanel() {
    state.open = !state.open;
    panel.classList.toggle('rc-open', state.open);
    panel.setAttribute('aria-hidden', String(!state.open));
    if (state.open) input.focus();
  }

  bubble.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  /* ── Send message ── */
  function send() {
    var text = input.value.trim();
    if (!text || state.waiting) return;
    input.value = '';
    appendMsg(text, 'user');
    setWaiting(true);

    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId: sessionId })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        setWaiting(false);
        appendMsg(data.reply || 'Sorry, I didn\'t get a response. Please try again.', 'ai');
      })
      .catch(function () {
        setWaiting(false);
        appendMsg('Sorry, something went wrong. Please try again.', 'ai');
      });
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  /* ── Opening message ── */
  appendMsg(OPENING_MSG, 'ai');

})();

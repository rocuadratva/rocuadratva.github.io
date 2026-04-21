(function () {
  'use strict';

  var WEBHOOK_URL = 'https://n8n.srv1326537.hstgr.cloud/webhook/ghl-appointment-bot';

  var sessionId = sessionStorage.getItem('rc_chat_sid');
  if (!sessionId) {
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    sessionStorage.setItem('rc_chat_sid', sessionId);
  }

  var state = { open: false, waiting: false, step: 'intent', intent: '', name: '', email: '', slot: '', timezone: '' };

  var TIMEZONES = [
    { label: 'UTC−10 · Hawaii',                value: 'Pacific/Honolulu' },
    { label: 'UTC−8  · Pacific Time (US)',      value: 'America/Los_Angeles' },
    { label: 'UTC−7  · Mountain Time (US)',     value: 'America/Denver' },
    { label: 'UTC−6  · Central Time (US)',      value: 'America/Chicago' },
    { label: 'UTC−5  · Eastern Time (US)',      value: 'America/New_York' },
    { label: 'UTC−4  · Atlantic / Toronto',     value: 'America/Halifax' },
    { label: 'UTC−3  · São Paulo / Buenos Aires', value: 'America/Sao_Paulo' },
    { label: 'UTC+0  · London / Lisbon',        value: 'Europe/London' },
    { label: 'UTC+1  · Paris / Berlin',         value: 'Europe/Paris' },
    { label: 'UTC+2  · Cairo / Athens',         value: 'Europe/Athens' },
    { label: 'UTC+3  · Moscow / Nairobi',       value: 'Europe/Moscow' },
    { label: 'UTC+4  · Dubai / Baku',           value: 'Asia/Dubai' },
    { label: 'UTC+5:30 · India',                value: 'Asia/Kolkata' },
    { label: 'UTC+7  · Bangkok / Jakarta',      value: 'Asia/Bangkok' },
    { label: 'UTC+8  · Philippines / Singapore',value: 'Asia/Manila' },
    { label: 'UTC+9  · Japan / Korea',          value: 'Asia/Tokyo' },
    { label: 'UTC+10 · Sydney / Melbourne',     value: 'Australia/Sydney' },
    { label: 'UTC+12 · Auckland',               value: 'Pacific/Auckland' }
  ];

  function getTzLabel(tz) {
    for (var i = 0; i < TIMEZONES.length; i++) {
      if (TIMEZONES[i].value === tz) return TIMEZONES[i].label;
    }
    return tz.replace(/_/g, ' ');
  }

  function formatSlot(iso, tz) {
    try {
      return new Date(iso).toLocaleString('en-US', {
        timeZone: tz || 'Asia/Manila',
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      });
    } catch (e) { return iso; }
  }

  /* ── CSS ── */
  var style = document.createElement('style');
  style.textContent = [
    '#rc-chat-widget{position:fixed;bottom:24px;right:24px;z-index:99999;font-family:"Inter",system-ui,sans-serif}',

    /* Bubble */
    '#rc-bubble{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#F26C38,#D72F58);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(242,108,56,.45),0 0 28px rgba(242,108,56,.18);animation:rc-pulse 2.5s ease-in-out infinite;transition:transform .2s,filter .2s}',
    '#rc-bubble:hover{transform:translateY(-2px);filter:brightness(1.1);animation-play-state:paused}',
    '@keyframes rc-pulse{0%,100%{box-shadow:0 0 10px rgba(242,108,56,.45),0 0 28px rgba(242,108,56,.18)}50%{box-shadow:0 0 22px rgba(242,108,56,.75),0 0 55px rgba(215,47,88,.35)}}',

    /* Panel */
    '#rc-panel{position:absolute;bottom:68px;right:0;width:360px;height:520px;background:#1E1E1E;border:1px solid rgba(255,255,255,.15);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.6),0 0 40px rgba(242,108,56,.08);display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;transform:translateY(12px) scale(.97);transition:opacity .25s,transform .25s}',
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
    '.rc-msg{max-width:82%;font-size:13px;line-height:1.55;padding:10px 14px;word-break:break-word}',
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

    /* Option pills */
    '.rc-options{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;align-self:flex-start;max-width:92%}',
    '.rc-opt{padding:7px 16px;border-radius:999px;background:#2A2A2A;border:1px solid rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:12px;font-family:inherit;transition:border-color .15s,color .15s}',
    '.rc-opt:hover{border-color:#F26C38;color:#F26C38}',

    /* Timezone select */
    '.rc-tz-select{width:100%;background:#2A2A2A;border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;padding:9px 12px;outline:none;cursor:pointer;-webkit-appearance:none;appearance:none}',
    '.rc-tz-select:focus{border-color:#F26C38}',
    '.rc-tz-select option{background:#2A2A2A;color:#fff}',

    /* Datetime picker */
    '.rc-datetime{width:100%;background:#2A2A2A;border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;padding:9px 12px;outline:none;color-scheme:dark}',
    '.rc-datetime:focus{border-color:#F26C38}',

    /* Mobile */
    '@media(max-width:420px){#rc-panel{width:calc(100vw - 32px);right:-8px}}'
  ].join('');
  document.head.appendChild(style);

  /* ── DOM ── */
  var wrap = document.createElement('div');
  wrap.id = 'rc-chat-widget';
  wrap.innerHTML = [
    '<button id="rc-bubble" aria-label="Chat with Roc">',
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      '</svg>',
    '</button>',
    '<div id="rc-panel" role="dialog" aria-label="Roc AI Chat" aria-hidden="true">',
      '<div id="rc-header">',
        '<div id="rc-avatar">R</div>',
        '<div id="rc-header-text">',
          '<div id="rc-header-name">Roc</div>',
          '<div id="rc-header-sub">AI Appointment Setter · n8n + GHL</div>',
        '</div>',
        '<button id="rc-close" aria-label="Close chat">&times;</button>',
      '</div>',
      '<div id="rc-messages">',
        '<div id="rc-typing"><span class="rc-dot"></span><span class="rc-dot"></span><span class="rc-dot"></span></div>',
      '</div>',
      '<div id="rc-input-row">',
        '<input id="rc-input" type="text" placeholder="Type here..." autocomplete="off">',
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
  var inputRow = document.getElementById('rc-input-row');
  var input    = document.getElementById('rc-input');
  var sendBtn  = document.getElementById('rc-send');
  var closeBtn = document.getElementById('rc-close');

  /* ── Helpers ── */
  function scrollBottom() { messages.scrollTop = messages.scrollHeight; }

  function appendMsg(text, role) {
    var div = document.createElement('div');
    div.className = 'rc-msg rc-msg--' + role;
    div.textContent = text;
    messages.insertBefore(div, typing);
    scrollBottom();
  }

  function renderOptions(items, onPick) {
    var container = document.createElement('div');
    container.className = 'rc-options';
    items.forEach(function (label) {
      var btn = document.createElement('button');
      btn.className = 'rc-opt';
      btn.textContent = label;
      btn.addEventListener('click', function () {
        container.remove();
        onPick(label);
      });
      container.appendChild(btn);
    });
    messages.insertBefore(container, typing);
    scrollBottom();
  }

  function showInput(placeholder) {
    inputRow.style.display = 'flex';
    input.placeholder = placeholder || 'Type here...';
    input.value = '';
    input.type = 'text';
    input.focus();
  }

  function hideInput() { inputRow.style.display = 'none'; }

  function setWaiting(val) {
    state.waiting = val;
    sendBtn.disabled = val;
    input.disabled = val;
    typing.classList.toggle('rc-show', val);
    scrollBottom();
  }

  /* ── Flow ── */
  function startFlow() {
    appendMsg("👋 Hi! I\u2019m Roc, Raphael\u2019s AI appointment setter \u2014 built with n8n + GHL. No forms, no back-and-forth. Just pick what you need and we\u2019ll handle the rest.", 'ai');
    showIntentOptions();
  }

  function showIntentOptions() {
    state.step = 'intent';
    state.intent = ''; state.name = ''; state.email = ''; state.slot = ''; state.timezone = '';
    hideInput();
    renderOptions(['\uD83D\uDCC5 Book a Call', '\u274C Cancel Appointment', '\uD83D\uDD04 Reschedule'], function (label) {
      if (label.indexOf('Book') !== -1) {
        state.intent = 'book';
        appendMsg('Book a Call', 'user');
        askName();
      } else if (label.indexOf('Cancel') !== -1) {
        state.intent = 'cancel';
        appendMsg('Cancel Appointment', 'user');
        askEmail();
      } else {
        state.intent = 'reschedule';
        appendMsg('Reschedule', 'user');
        askEmail();
      }
    });
  }

  function askName() {
    state.step = 'name';
    appendMsg("Great! What\u2019s your full name?", 'ai');
    showInput("Your full name...");
  }

  function askEmail() {
    state.step = 'email';
    var prompt = state.intent === 'book'
      ? 'Nice to meet you, ' + state.name + '! What\u2019s your email address?'
      : 'What\u2019s the email address on your appointment?';
    appendMsg(prompt, 'ai');
    showInput("your@email.com");
  }

  function askTimezone() {
    state.step = 'timezone';
    hideInput();
    var detected = '';
    try { detected = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    if (!detected) detected = 'Asia/Manila';
    state.timezone = detected;
    appendMsg("I detected your timezone as " + getTzLabel(detected) + ". Is that correct?", 'ai');
    renderOptions(['\u2705 Yes, that\u2019s correct', '\uD83C\uDF0D Choose a different timezone'], function (label) {
      if (label.indexOf('Yes') !== -1) {
        appendMsg('Yes, that\u2019s correct', 'user');
        askSlot();
      } else {
        appendMsg('Choose a different timezone', 'user');
        showTimezoneSelect();
      }
    });
  }

  function showTimezoneSelect() {
    state.step = 'timezone-select';
    appendMsg("Select your timezone:", 'ai');

    var container = document.createElement('div');
    container.className = 'rc-options';
    container.style.cssText = 'flex-direction:column;align-items:stretch;width:90%';

    var sel = document.createElement('select');
    sel.className = 'rc-tz-select';
    TIMEZONES.forEach(function (tz) {
      var opt = document.createElement('option');
      opt.value = tz.value;
      opt.textContent = tz.label;
      sel.appendChild(opt);
    });

    var confirmBtn = document.createElement('button');
    confirmBtn.className = 'rc-opt';
    confirmBtn.textContent = 'Confirm \u2192';
    confirmBtn.style.alignSelf = 'flex-start';

    confirmBtn.addEventListener('click', function () {
      state.timezone = sel.value;
      container.remove();
      appendMsg(getTzLabel(sel.value), 'user');
      askSlot();
    });

    container.appendChild(sel);
    container.appendChild(confirmBtn);
    messages.insertBefore(container, typing);
    scrollBottom();
  }

  function askSlot() {
    state.step = 'slot';
    hideInput();
    appendMsg("Let me pull up available times for you\u2026", 'ai');
    setWaiting(true);

    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'get_slots', sessionId: sessionId, timezone: state.timezone })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        setWaiting(false);
        var slots = Array.isArray(data.slots) && data.slots.length ? data.slots : null;
        if (!slots) { showDatePicker(); return; }

        appendMsg("Here are the next available times:", 'ai');

        var slotMap = {};
        var labels = slots.slice(0, 5).map(function (iso) {
          var label = formatSlot(iso, state.timezone);
          slotMap[label] = iso;
          return label;
        });
        labels.push('\uD83D\uDD50 None of these work');

        renderOptions(labels, function (label) {
          if (label.indexOf('None') !== -1) {
            appendMsg('None of these work', 'user');
            appendMsg("No problem! Pick a date and time that works for you:", 'ai');
            showDatePicker();
            return;
          }
          state.slot = slotMap[label];
          appendMsg(label, 'user');
          confirmAndSubmit();
        });
      })
      .catch(function () {
        setWaiting(false);
        showDatePicker();
      });
  }

  function showDatePicker() {
    state.step = 'slot-picker';
    hideInput();

    var container = document.createElement('div');
    container.className = 'rc-options';
    container.style.cssText = 'flex-direction:column;align-items:flex-start;gap:8px;width:90%';

    var dt = document.createElement('input');
    dt.type = 'datetime-local';
    dt.className = 'rc-datetime';
    var now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dt.min = now.toISOString().slice(0, 16);

    var confirmBtn = document.createElement('button');
    confirmBtn.className = 'rc-opt';
    confirmBtn.textContent = 'Confirm this time \u2192';

    confirmBtn.addEventListener('click', function () {
      if (!dt.value) { dt.style.borderColor = '#D72F58'; return; }
      container.remove();
      state.slot = dt.value + ':00';
      var label = formatSlot(new Date(dt.value).toISOString(), state.timezone);
      appendMsg(label, 'user');
      confirmAndSubmit();
    });

    container.appendChild(dt);
    container.appendChild(confirmBtn);
    messages.insertBefore(container, typing);
    scrollBottom();
    dt.focus();
  }

  function askCancelConfirm() {
    state.step = 'cancel-confirm';
    hideInput();
    appendMsg("Ready to cancel the appointment linked to " + state.email + "?", 'ai');
    renderOptions(['\u2714 Yes, cancel it', '\u2190 No, go back'], function (label) {
      if (label.indexOf('Yes') !== -1) {
        appendMsg('Yes, cancel it', 'user');
        confirmAndSubmit();
      } else {
        appendMsg('No, go back', 'user');
        showIntentOptions();
      }
    });
  }

  function confirmAndSubmit() {
    state.step = 'done';
    hideInput();
    setWaiting(true);

    var payload = {
      sessionId: sessionId,
      intent: state.intent,
      email: state.email,
      timezone: state.timezone
    };
    if (state.intent === 'book') { payload.name = state.name; payload.slot = state.slot; }
    if (state.intent === 'reschedule') { payload.slot = state.slot; }

    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        setWaiting(false);
        appendMsg(data.reply || 'All done! You\u2019ll receive a confirmation shortly.', 'ai');
        appendMsg("Need anything else?", 'ai');
        showIntentOptions();
      })
      .catch(function () {
        setWaiting(false);
        appendMsg('Something went wrong. Please try again.', 'ai');
        showIntentOptions();
      });
  }

  /* ── Text input handler ── */
  function handleSubmit() {
    var text = input.value.trim();
    if (!text || state.waiting) return;
    input.value = '';
    appendMsg(text, 'user');

    if (state.step === 'name') {
      state.name = text;
      askEmail();
    } else if (state.step === 'email') {
      if (!text.includes('@')) {
        appendMsg("That doesn\u2019t look like a valid email. Please try again.", 'ai');
        return;
      }
      state.email = text.toLowerCase();
      if (state.intent === 'book' || state.intent === 'reschedule') {
        askTimezone();
      } else {
        askCancelConfirm();
      }
    }
  }

  sendBtn.addEventListener('click', handleSubmit);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  });

  /* ── Toggle panel ── */
  function togglePanel() {
    state.open = !state.open;
    panel.classList.toggle('rc-open', state.open);
    panel.setAttribute('aria-hidden', String(!state.open));
    if (state.open && messages.querySelectorAll('.rc-msg').length === 0) {
      startFlow();
    } else if (state.open) {
      input.focus();
    }
  }

  bubble.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

})();

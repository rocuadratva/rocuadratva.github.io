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
    { label: 'UTC−10 · Hawaii',                 value: 'Pacific/Honolulu' },
    { label: 'UTC−8  · Pacific Time (US)',       value: 'America/Los_Angeles' },
    { label: 'UTC−7  · Mountain Time (US)',      value: 'America/Denver' },
    { label: 'UTC−6  · Central Time (US)',       value: 'America/Chicago' },
    { label: 'UTC−5  · Eastern Time (US)',       value: 'America/New_York' },
    { label: 'UTC−4  · Atlantic / Toronto',      value: 'America/Halifax' },
    { label: 'UTC−3  · São Paulo / Buenos Aires',value: 'America/Sao_Paulo' },
    { label: 'UTC+0  · London / Lisbon',         value: 'Europe/London' },
    { label: 'UTC+1  · Paris / Berlin',          value: 'Europe/Paris' },
    { label: 'UTC+2  · Cairo / Athens',          value: 'Europe/Athens' },
    { label: 'UTC+3  · Moscow / Nairobi',        value: 'Europe/Moscow' },
    { label: 'UTC+4  · Dubai / Baku',            value: 'Asia/Dubai' },
    { label: 'UTC+5:30 · India',                 value: 'Asia/Kolkata' },
    { label: 'UTC+7  · Bangkok / Jakarta',       value: 'Asia/Bangkok' },
    { label: 'UTC+8  · Philippines / Singapore', value: 'Asia/Manila' },
    { label: 'UTC+9  · Japan / Korea',           value: 'Asia/Tokyo' },
    { label: 'UTC+10 · Sydney / Melbourne',      value: 'Australia/Sydney' },
    { label: 'UTC+12 · Auckland',                value: 'Pacific/Auckland' }
  ];

  var TIME_SLOTS = [
    { label: '9:00 AM',  hour: 9  },
    { label: '10:00 AM', hour: 10 },
    { label: '11:00 AM', hour: 11 },
    { label: '1:00 PM',  hour: 13 },
    { label: '2:00 PM',  hour: 14 },
    { label: '3:00 PM',  hour: 15 },
    { label: '4:00 PM',  hour: 16 },
    { label: '5:00 PM',  hour: 17 }
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

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* ── CSS ── */
  var style = document.createElement('style');
  style.textContent = [
    '#rc-chat-widget{position:fixed;bottom:24px;right:24px;z-index:99999;font-family:"Inter",system-ui,sans-serif}',
    /* bubble styles removed — hub-widget.js owns the FAB */
    '#rc-panel{position:absolute;bottom:68px;right:0;width:360px;height:520px;background:#1E1E1E;border:1px solid rgba(255,255,255,.15);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.6),0 0 40px rgba(242,108,56,.08);display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;transform:translateY(12px) scale(.97);transition:opacity .25s,transform .25s}',
    '#rc-panel.rc-open{opacity:1;pointer-events:all;transform:translateY(0) scale(1)}',
    '#rc-header{display:flex;align-items:center;gap:10px;padding:14px 16px;background:#252525;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}',
    '#rc-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#F26C38,#D72F58);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;font-weight:700;color:#fff}',
    '#rc-header-text{flex:1}',
    '#rc-header-name{font-size:13px;font-weight:700;color:#fff;line-height:1.2}',
    '#rc-header-sub{font-size:11px;color:#A1A1A1;margin-top:1px}',
    '#rc-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.4);font-size:18px;line-height:1;padding:4px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:color .15s}',
    '#rc-close:hover{color:#fff}',
    '#rc-messages{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:16px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}',
    '#rc-messages::-webkit-scrollbar{width:4px}',
    '#rc-messages::-webkit-scrollbar-track{background:transparent}',
    '#rc-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:2px}',
    '.rc-msg{max-width:82%;font-size:13px;line-height:1.55;padding:10px 14px;word-break:break-word}',
    '.rc-msg--ai{align-self:flex-start;background:#2A2A2A;color:#fff;border-radius:12px 12px 12px 4px}',
    '.rc-msg--user{align-self:flex-end;background:linear-gradient(135deg,#F26C38,#D72F58);color:#fff;border-radius:12px 12px 4px 12px}',
    '#rc-typing{align-self:flex-start;background:#2A2A2A;border-radius:12px 12px 12px 4px;padding:12px 16px;display:none;gap:5px;align-items:center}',
    '#rc-typing.rc-show{display:flex}',
    '.rc-dot{width:6px;height:6px;border-radius:50%;background:#A1A1A1;animation:rc-bounce .9s ease-in-out infinite}',
    '.rc-dot:nth-child(2){animation-delay:.15s}',
    '.rc-dot:nth-child(3){animation-delay:.3s}',
    '@keyframes rc-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
    '#rc-input-row{display:flex;align-items:center;gap:8px;padding:12px 14px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0}',
    '#rc-input{flex:1;background:#2A2A2A;border:none;border-radius:999px;padding:10px 16px;font-size:13px;color:#fff;font-family:inherit;outline:none;caret-color:#F26C38}',
    '#rc-input::placeholder{color:#A1A1A1}',
    '#rc-send{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#F26C38,#D72F58);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:filter .15s,transform .15s}',
    '#rc-send:hover{filter:brightness(1.15);transform:scale(1.05)}',
    '#rc-send:disabled{opacity:.4;cursor:default;transform:none}',
    '.rc-options{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;align-self:flex-start;max-width:92%}',
    '.rc-opt{padding:7px 16px;border-radius:999px;background:#2A2A2A;border:1px solid rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:12px;font-family:inherit;transition:border-color .15s,color .15s}',
    '.rc-opt:hover{border-color:#F26C38;color:#F26C38}',
    '.rc-tz-select{width:100%;background:#2A2A2A;border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-family:inherit;font-size:13px;padding:9px 12px;outline:none;cursor:pointer;-webkit-appearance:none;appearance:none}',
    '.rc-tz-select:focus{border-color:#F26C38}',
    '.rc-tz-select option{background:#2A2A2A;color:#fff}',
    '@media(max-width:420px){#rc-panel{width:calc(100vw - 32px);right:-8px}}'
  ].join('');
  document.head.appendChild(style);

  /* ── DOM ── */
  var wrap = document.createElement('div');
  wrap.id = 'rc-chat-widget';
  wrap.innerHTML = [
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

  var panel    = document.getElementById('rc-panel');
  var messages = document.getElementById('rc-messages');
  var typing   = document.getElementById('rc-typing');
  var inputRow = document.getElementById('rc-input-row');
  var input    = document.getElementById('rc-input');
  var sendBtn  = document.getElementById('rc-send');
  var closeBtn = document.getElementById('rc-close');

  /* ── Core helpers ── */
  function scrollBottom() { requestAnimationFrame(function () { messages.scrollTop = messages.scrollHeight; }); }

  function appendMsg(text, role) {
    var div = document.createElement('div');
    div.className = 'rc-msg rc-msg--' + role;
    div.textContent = text;
    messages.insertBefore(div, typing);
    scrollBottom();
  }

  /* typing delay before each of Roc's messages — scales with length, max 1.6s */
  function speakMsg(text) {
    return new Promise(function (resolve) {
      typing.classList.add('rc-show');
      scrollBottom();
      var delay = Math.min(400 + text.length * 14, 1600);
      setTimeout(function () {
        typing.classList.remove('rc-show');
        appendMsg(text, 'ai');
        resolve();
      }, delay);
    });
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
    requestAnimationFrame(function () { container.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
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
    speakMsg('👋 Hi! I’m Roc, Raphael’s AI appointment setter — built with n8n + GHL. No forms, no back-and-forth. Just pick what you need and we’ll handle the rest.').then(function () {
      showIntentOptions();
    });
  }

  function showIntentOptions() {
    state.step = 'intent';
    state.intent = ''; state.name = ''; state.email = ''; state.slot = ''; state.timezone = '';
    hideInput();
    renderOptions(['📅 Book a Call', '❌ Cancel Appointment', '🔄 Reschedule'], function (label) {
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
    speakMsg('Great! What’s your full name?').then(function () {
      showInput('Your full name...');
    });
  }

  function askEmail() {
    state.step = 'email';
    var prompt = state.intent === 'book'
      ? 'Nice to meet you, ' + state.name + '! What’s your email address?'
      : 'What’s the email address on your appointment?';
    speakMsg(prompt).then(function () {
      showInput('your@email.com');
    });
  }

  function askTimezone() {
    state.step = 'timezone';
    hideInput();
    var detected = '';
    try { detected = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    if (!detected) detected = 'Asia/Manila';
    state.timezone = detected;
    speakMsg('I detected your timezone as ' + getTzLabel(detected) + '. Is that correct?').then(function () {
      renderOptions(['✅ Yes, that’s correct', '🌍 Choose a different timezone'], function (label) {
        if (label.indexOf('Yes') !== -1) {
          appendMsg('Yes, that’s correct', 'user');
          askSlot();
        } else {
          appendMsg('Choose a different timezone', 'user');
          showTimezoneSelect();
        }
      });
    });
  }

  function showTimezoneSelect() {
    state.step = 'timezone-select';
    speakMsg('Select your timezone:').then(function () {
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
      confirmBtn.textContent = 'Confirm →';
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
      requestAnimationFrame(function () { container.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    });
  }

  function askSlot() {
    state.step = 'slot';
    hideInput();
    speakMsg('Let me pull up available times for you…').then(function () {
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

          var slotMap = {};
          var labels = slots.slice(0, 5).map(function (iso) {
            var label = formatSlot(iso, state.timezone);
            slotMap[label] = iso;
            return label;
          });
          labels.push('🕐 None of these work');

          speakMsg('Here are the next available times:').then(function () {
            renderOptions(labels, function (label) {
              if (label.indexOf('None') !== -1) {
                appendMsg('None of these work', 'user');
                showDatePicker();
                return;
              }
              state.slot = slotMap[label];
              appendMsg(label, 'user');
              confirmAndSubmit();
            });
          });
        })
        .catch(function () {
          setWaiting(false);
          showDatePicker();
        });
    });
  }

  /* ── 2-step date picker: day buttons → time buttons ── */
  function showDatePicker() {
    state.step = 'slot-day';
    speakMsg('No problem! Pick a day that works for you:').then(function () {
      renderDayPicker();
    });
  }

  function renderDayPicker() {
    var container = document.createElement('div');
    container.className = 'rc-options';

    var now = new Date();
    for (var i = 1; i <= 7; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      (function (day) {
        var label = day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        var btn = document.createElement('button');
        btn.className = 'rc-opt';
        btn.textContent = label;
        btn.addEventListener('click', function () {
          container.remove();
          appendMsg(label, 'user');
          speakMsg('Got it! What time works best?').then(function () {
            renderTimePicker(day);
          });
        });
        container.appendChild(btn);
      })(d);
    }

    messages.insertBefore(container, typing);
    requestAnimationFrame(function () { container.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  }

  function renderTimePicker(selectedDay) {
    state.step = 'slot-time';
    var container = document.createElement('div');
    container.className = 'rc-options';

    TIME_SLOTS.forEach(function (t) {
      var btn = document.createElement('button');
      btn.className = 'rc-opt';
      btn.textContent = t.label;
      btn.addEventListener('click', function () {
        container.remove();
        appendMsg(t.label, 'user');
        state.slot = selectedDay.getFullYear() + '-' +
          pad(selectedDay.getMonth() + 1) + '-' +
          pad(selectedDay.getDate()) + 'T' +
          pad(t.hour) + ':00:00';
        confirmAndSubmit();
      });
      container.appendChild(btn);
    });

    messages.insertBefore(container, typing);
    requestAnimationFrame(function () { container.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  }

  function askCancelConfirm() {
    state.step = 'cancel-confirm';
    hideInput();
    speakMsg('Ready to cancel the appointment linked to ' + state.email + '?').then(function () {
      renderOptions(['✔ Yes, cancel it', '← No, go back'], function (label) {
        if (label.indexOf('Yes') !== -1) {
          appendMsg('Yes, cancel it', 'user');
          confirmAndSubmit();
        } else {
          appendMsg('No, go back', 'user');
          showIntentOptions();
        }
      });
    });
  }

  function confirmAndSubmit() {
    state.step = 'done';
    hideInput();
    setWaiting(true);

    var payload = { sessionId: sessionId, intent: state.intent, email: state.email, timezone: state.timezone };
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
        speakMsg(data.reply || 'All done! You’ll receive a confirmation shortly.').then(function () {
          return speakMsg('Need anything else?');
        }).then(function () {
          showIntentOptions();
        });
      })
      .catch(function () {
        setWaiting(false);
        speakMsg('Something went wrong. Please try again.').then(function () {
          showIntentOptions();
        });
      });
  }

  /* ── Text input handler (name + email only) ── */
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
        appendMsg('That doesn’t look like a valid email. Please try again.', 'ai');
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

  closeBtn.addEventListener('click', togglePanel);

  window.rcToggleChat = togglePanel;
  window.rcCloseChat  = function () { if (state.open) togglePanel(); };

})();

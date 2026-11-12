/* Dental Desk in-app AI assistant.
   Self-contained chat drawer that talks to /api/assistant and reuses the
   app shell's design tokens. Loaded after adapter.js on /app. */
(function () {
  "use strict";

  if (window.__ddAssistantLoaded) return;
  window.__ddAssistantLoaded = true;

  var LANG = (function () {
    var l = (document.documentElement.getAttribute("lang") || localStorage.getItem("dd_lang") || "uz").slice(0, 2);
    return l === "ru" || l === "en" ? l : "uz";
  })();

  var TEXT = {
    uz: {
      title: "AI yordamchi",
      sub: "Navbat, bemor va hisobotlar",
      placeholder: "Savol yoki buyruq yozing…",
      send: "Yuborish",
      close: "Yopish",
      open: "AI yordamchi",
      thinking: "O'ylayapti…",
      local: "Lokal AI",
      llm: "AI",
      readOnly: "Faqat o'qish",
      chips: ["Bugungi navbatlar", "Ertaga bo'sh vaqt", "Statistika", "Yangi bemor"],
      prefill: "yangi bemor ",
      hello:
        "Assalomu alaykum! Men klinikaning AI yordamchisiman.\nNavbatlarni ko'rsataman, bo'sh vaqtlarni topaman, bemor qo'shaman va statistikani hisoblayman.\nNima qilay?",
      error: "Ulanish xatosi. Qayta urinib ko'ring.",
      rate: "Juda ko'p so'rov. Bir oz kutib turing.",
      done: "Bajarildi",
    },
    ru: {
      title: "AI-помощник",
      sub: "Записи, пациенты и отчёты",
      placeholder: "Напишите вопрос или команду…",
      send: "Отправить",
      close: "Закрыть",
      open: "AI-помощник",
      thinking: "Думает…",
      local: "Локальный AI",
      llm: "AI",
      readOnly: "Только чтение",
      chips: ["Записи на сегодня", "Свободное время", "Статистика", "Новый пациент"],
      prefill: "новый пациент ",
      hello:
        "Здравствуйте! Я AI-помощник клиники.\nПокажу расписание, найду свободное время, добавлю пациента и посчитаю статистику.",
      error: "Ошибка соединения. Попробуйте ещё раз.",
      rate: "Слишком много запросов. Подождите немного.",
      done: "Готово",
    },
    en: {
      title: "AI assistant",
      sub: "Appointments, patients and reports",
      placeholder: "Ask a question or type a command…",
      send: "Send",
      close: "Close",
      open: "AI assistant",
      thinking: "Thinking…",
      local: "Local AI",
      llm: "AI",
      readOnly: "Read only",
      chips: ["Today's appointments", "Free time tomorrow", "Statistics", "New patient"],
      prefill: "new patient ",
      hello:
        "Hello! I am the clinic AI assistant.\nI can show the schedule, find free time, add patients and compute statistics.",
      error: "Connection error. Please try again.",
      rate: "Too many requests. Please wait a moment.",
      done: "Done",
    },
  };

  var t = TEXT[LANG];
  var messages = [];
  var pending = false;

  /* ---------- styles ---------- */
  var css = document.createElement("style");
  css.textContent = [
    "#ddai-fab{position:fixed;right:20px;bottom:20px;z-index:900;display:flex;align-items:center;gap:9px;",
    "padding:11px 16px 11px 13px;border-radius:999px;border:1px solid var(--line,#d6e1e2);",
    "background:var(--accent,#0c6a72);color:var(--accent-ink,#fff);font:700 13.5px/1 var(--font-body,'Inter',sans-serif);",
    "box-shadow:0 14px 34px -12px rgba(6,42,46,.55),0 2px 6px rgba(6,42,46,.18);cursor:pointer;",
    "transition:transform .16s ease,box-shadow .16s ease}",
    "#ddai-fab:hover{transform:translateY(-1px);box-shadow:0 18px 40px -12px rgba(6,42,46,.6)}",
    "#ddai-fab svg{width:18px;height:18px;flex:none}",
    "@media(min-width:901px){#ddai-fab{display:none}}",
    "@media(max-width:900px){#ddai-fab{bottom:calc(78px + env(safe-area-inset-bottom))}}",
    "@media(max-width:560px){#ddai-fab{right:14px;bottom:calc(74px + env(safe-area-inset-bottom));padding:13px;border-radius:50%}#ddai-fab span{display:none}}",
    "#ddai{position:fixed;top:0;right:0;bottom:0;z-index:950;width:min(408px,100vw);display:flex;flex-direction:column;",
    "background:var(--surface,#fff);color:var(--ink,#13262a);border-left:1px solid var(--line,#d6e1e2);",
    "box-shadow:-24px 0 60px -30px rgba(10,26,29,.45);transform:translateX(102%);transition:transform .26s cubic-bezier(.22,.8,.28,1);",
    "font-family:var(--font-body,'Onest',sans-serif)}",
    "#ddai.open{transform:none}",
    ".ddai-head{display:flex;align-items:center;gap:10px;padding:14px 14px 13px;border-bottom:1px solid var(--line,#d6e1e2);",
    "background:var(--surface-2,#f4f8f8)}",
    ".ddai-badge{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:none;",
    "background:var(--accent-soft,#d8eef0);color:var(--accent,#0c6a72)}",
    ".ddai-badge svg{width:19px;height:19px}",
    ".ddai-titles{min-width:0;flex:1}",
    ".ddai-titles b{display:block;font:800 14px/1.2 var(--font-display,'Manrope',sans-serif);color:var(--ink,#13262a)}",
    ".ddai-titles small{display:block;margin-top:2px;font-size:11.5px;color:var(--muted,#587076);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".ddai-mode{font:700 10px/1 var(--font-body,'Onest',sans-serif);letter-spacing:.06em;text-transform:uppercase;",
    "padding:5px 8px;border-radius:999px;background:var(--ok-soft,#dcf2e5);color:var(--ok,#1c7549);white-space:nowrap}",
    ".ddai-mode.ro{background:var(--warn-soft,#fdeedb);color:var(--warn,#a85408)}",
    ".ddai-x{width:34px;height:34px;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--muted,#587076);cursor:pointer;display:grid;place-items:center}",
    ".ddai-x:hover{border-color:var(--line,#d6e1e2);color:var(--ink,#13262a)}",
    ".ddai-x svg{width:16px;height:16px}",
    ".ddai-body{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:11px;overscroll-behavior:contain}",
    ".ddai-msg{max-width:88%;padding:10px 12px;border-radius:14px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word}",
    ".ddai-msg.bot{align-self:flex-start;background:var(--surface-2,#f4f8f8);border:1px solid var(--line,#d6e1e2);border-bottom-left-radius:5px}",
    ".ddai-msg.user{align-self:flex-end;background:var(--accent,#0c6a72);color:var(--accent-ink,#fff);border-bottom-right-radius:5px}",
    ".ddai-actions{display:flex;flex-direction:column;gap:4px;margin-top:7px;padding-top:7px;border-top:1px dashed var(--line-strong,#b7cacd)}",
    ".ddai-actions small{display:flex;gap:6px;align-items:flex-start;font-size:11.5px;color:var(--ok,#1c7549);font-weight:600}",
    ".ddai-actions svg{width:12px;height:12px;flex:none;margin-top:2px}",
    ".ddai-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 12px}",
    ".ddai-chip{border:1px solid var(--line,#d6e1e2);background:var(--surface,#fff);color:var(--muted,#587076);",
    "border-radius:999px;padding:7px 11px;font:600 12px/1 var(--font-body,'Onest',sans-serif);cursor:pointer;transition:border-color .12s,color .12s}",
    ".ddai-chip:hover{border-color:var(--accent,#0c6a72);color:var(--accent,#0c6a72)}",
    ".ddai-typing{display:flex;gap:4px;align-self:flex-start;background:var(--surface-2,#f4f8f8);border:1px solid var(--line,#d6e1e2);",
    "border-radius:14px;border-bottom-left-radius:5px;padding:12px 14px}",
    ".ddai-typing i{width:5px;height:5px;border-radius:50%;background:var(--muted,#587076);animation:ddai-p 1s infinite}",
    ".ddai-typing i:nth-child(2){animation-delay:.15s}.ddai-typing i:nth-child(3){animation-delay:.3s}",
    "@keyframes ddai-p{0%,70%,100%{opacity:.28;transform:translateY(0)}35%{opacity:1;transform:translateY(-2px)}}",
    ".ddai-foot{border-top:1px solid var(--line,#d6e1e2);padding:10px 12px;display:flex;gap:8px;align-items:flex-end;background:var(--surface,#fff)}",
    ".ddai-input{flex:1;resize:none;max-height:110px;min-height:40px;border:1px solid var(--line,#d6e1e2);border-radius:12px;",
    "background:var(--surface-2,#f4f8f8);padding:10px 12px;font-size:13.5px;line-height:1.4;color:var(--ink,#13262a)}",
    ".ddai-input:focus{outline:2px solid var(--accent,#0c6a72);outline-offset:-1px}",
    ".ddai-send{width:42px;height:42px;border-radius:12px;border:0;background:var(--accent,#0c6a72);color:var(--accent-ink,#fff);",
    "display:grid;place-items:center;cursor:pointer;flex:none}",
    ".ddai-send:disabled{opacity:.45;cursor:default}",
    ".ddai-send svg{width:17px;height:17px}",
    ".ddai-scrim{position:fixed;inset:0;background:rgba(6,20,22,.28);z-index:940;opacity:0;pointer-events:none;transition:opacity .2s}",
    ".ddai-scrim.open{opacity:1;pointer-events:auto}",
    "@media(min-width:561px){.ddai-scrim{display:none}}",
    "@media(prefers-reduced-motion:reduce){#ddai{transition:none}#ddai-fab{transition:none}}",
  ].join("");
  document.head.appendChild(css);

  /* ---------- skeleton ---------- */
  var ICON_SPARK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3l1.9 4.9L19 9.8l-5.1 1.9L12 16.6l-1.9-4.9L5 9.8l5.1-1.9z"/>' +
    '<path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg>';
  var ICON_X =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_SEND =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>';
  var ICON_CHECK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

  var fab = document.createElement("button");
  fab.id = "ddai-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", t.open);
  fab.innerHTML = ICON_SPARK + "<span>" + t.open + "</span>";

  var scrim = document.createElement("div");
  scrim.className = "ddai-scrim";

  var panel = document.createElement("section");
  panel.id = "ddai";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", t.title);
  panel.innerHTML =
    '<div class="ddai-head">' +
    '<span class="ddai-badge">' + ICON_SPARK + "</span>" +
    '<span class="ddai-titles"><b>' + t.title + "</b><small>" + t.sub + "</small></span>" +
    '<span class="ddai-mode" id="ddai-mode">' + t.local + "</span>" +
    '<button type="button" class="ddai-x" id="ddai-close" aria-label="' + t.close + '">' + ICON_X + "</button>" +
    "</div>" +
    '<div class="ddai-body" id="ddai-body"></div>' +
    '<div class="ddai-chips" id="ddai-chips"></div>' +
    '<div class="ddai-foot">' +
    '<textarea class="ddai-input" id="ddai-input" rows="1" placeholder="' + t.placeholder + '"></textarea>' +
    '<button type="button" class="ddai-send" id="ddai-send" aria-label="' + t.send + '">' + ICON_SEND + "</button>" +
    "</div>";

  document.body.appendChild(fab);
  document.body.appendChild(scrim);
  document.body.appendChild(panel);

  var body = panel.querySelector("#ddai-body");
  var input = panel.querySelector("#ddai-input");
  var sendBtn = panel.querySelector("#ddai-send");
  var chips = panel.querySelector("#ddai-chips");
  var modeBadge = panel.querySelector("#ddai-mode");
  var opened = false;
  var greeted = false;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function scrollDown() {
    body.scrollTop = body.scrollHeight;
  }

  function addBubble(role, text, actions) {
    var el = document.createElement("div");
    el.className = "ddai-msg " + (role === "user" ? "user" : "bot");
    el.textContent = text;
    if (actions && actions.length) {
      var list = document.createElement("div");
      list.className = "ddai-actions";
      actions.forEach(function (a) {
        var line = document.createElement("small");
        line.innerHTML = ICON_CHECK;
        var span = document.createElement("span");
        span.textContent = a;
        line.appendChild(span);
        list.appendChild(line);
      });
      el.appendChild(list);
    }
    body.appendChild(el);
    scrollDown();
  }

  function setChips() {
    chips.innerHTML = "";
    if (messages.length) {
      chips.hidden = true;
      return;
    }
    chips.hidden = false;
    t.chips.forEach(function (label, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ddai-chip";
      b.textContent = label;
      b.addEventListener("click", function () {
        if (i === t.chips.length - 1) {
          input.value = t.prefill;
          input.focus();
          return;
        }
        send(b.textContent);
      });
      chips.appendChild(b);
    });
  }

  function setPending(on) {
    pending = on;
    sendBtn.disabled = on;
    if (on) {
      var el = document.createElement("div");
      el.className = "ddai-typing";
      el.id = "ddai-typing";
      el.setAttribute("aria-label", t.thinking);
      el.innerHTML = "<i></i><i></i><i></i>";
      body.appendChild(el);
      scrollDown();
    } else {
      var el = document.getElementById("ddai-typing");
      if (el) el.remove();
    }
  }

  function refreshApp() {
    if (typeof window.__ddRefresh === "function") {
      try {
        window.__ddRefresh();
      } catch (e) {}
    }
  }

  function send(textOverride) {
    var text = (textOverride != null ? textOverride : input.value).trim();
    if (!text || pending) return;
    input.value = "";
    autoGrow();
    addBubble("user", text);
    messages.push({ role: "user", content: text });
    setChips();
    setPending(true);

    fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ messages: messages.slice(-12) }),
    })
      .then(function (res) {
        if (res.status === 401) {
          location.href = "/login";
          throw new Error("unauthorized");
        }
        if (res.status === 429) {
          return res.json().catch(function () {}).then(function () {
            throw new Error("rate");
          });
        }
        if (!res.ok) throw new Error("http");
        return res.json();
      })
      .then(function (data) {
        setPending(false);
        if (data.mode === "llm") modeBadge.textContent = t.llm;
        else modeBadge.textContent = t.local;
        if (data.writable === false) {
          modeBadge.classList.add("ro");
          modeBadge.textContent = t.readOnly;
        }
        var reply = data.reply || t.done;
        addBubble("bot", reply, data.actions || []);
        messages.push({ role: "assistant", content: reply });
        if (data.actions && data.actions.length) refreshApp();
      })
      .catch(function (err) {
        setPending(false);
        addBubble("bot", err && err.message === "rate" ? t.rate : t.error);
      });
  }

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(110, input.scrollHeight) + "px";
  }

  function open() {
    if (opened) return;
    opened = true;
    panel.classList.add("open");
    scrim.classList.add("open");
    fab.setAttribute("aria-expanded", "true");
    if (!greeted) {
      greeted = true;
      addBubble("bot", t.hello);
      setChips();
    }
    setTimeout(function () {
      input.focus();
    }, 180);
  }

  function close() {
    if (!opened) return;
    opened = false;
    panel.classList.remove("open");
    scrim.classList.remove("open");
    fab.setAttribute("aria-expanded", "false");
    fab.focus();
  }

  fab.addEventListener("click", function () {
    if (opened) close();
    else open();
  });
  panel.querySelector("#ddai-close").addEventListener("click", close);
  scrim.addEventListener("click", close);
  sendBtn.addEventListener("click", function () {
    send();
  });
  input.addEventListener("input", autoGrow);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && opened) close();
  });

  setChips();
  window.DD_ASSISTANT = { open: open, close: close };

  /* The app toggles language via documentElement[lang]; keep our labels in sync. */
  var observer = new MutationObserver(function () {
    var l = (document.documentElement.getAttribute("lang") || "uz").slice(0, 2);
    if (!TEXT[l] || l === LANG) return;
    LANG = l === "ru" || l === "en" ? l : "uz";
    t = TEXT[LANG];
    panel.setAttribute("aria-label", t.title);
    fab.setAttribute("aria-label", t.open);
    fab.querySelector("span").textContent = t.open;
    panel.querySelector(".ddai-titles b").textContent = t.title;
    panel.querySelector(".ddai-titles small").textContent = t.sub;
    input.placeholder = t.placeholder;
    if (!pending) modeBadge.textContent = t.local;
    setChips();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
})();
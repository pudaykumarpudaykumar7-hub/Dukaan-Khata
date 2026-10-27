/* Dukaan Khata Shop Copilot UI. Isolated from the existing app code. */
(() => {
  const getLanguage = () => {
    try { return (window.state && window.state.settings && window.state.settings.language) || document.documentElement.lang || "English"; }
    catch (_) { return document.documentElement.lang || "English"; }
  };
  function init() {
    if (document.getElementById("dk-copilot-launcher")) return;
    const launcher = document.createElement("button");
    launcher.id = "dk-copilot-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open Shop Copilot");
    launcher.innerHTML = '<span class="dk-copilot-spark">✦</span><span>Shop Copilot</span>';
    launcher.addEventListener("click", openPanel);
    document.body.appendChild(launcher);
  }
  function openPanel() {
    if (document.getElementById("dk-copilot-panel")) return;
    const panel = document.createElement("section");
    panel.id = "dk-copilot-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Dukaan Khata Shop Copilot");
    panel.innerHTML = `
      <header class="dk-copilot-head"><div class="dk-copilot-mark">✦</div><div class="dk-copilot-heading"><strong>Shop Copilot</strong><small>AI helper · Owner-controlled</small></div><button type="button" class="dk-copilot-close" aria-label="Close">×</button></header>
      <div class="dk-copilot-notice">Ask in your selected language. This preview can advise and draft workflows; it cannot change shop records or send messages until secure app actions are connected.</div>
      <div class="dk-copilot-chat" aria-live="polite"><div class="dk-copilot-bubble assistant">Namaste! I can help plan shop tasks, prepare customer messages, and organise daily work. What would you like help with?</div></div>
      <form class="dk-copilot-form"><textarea name="message" rows="2" maxlength="1800" placeholder="Ask your shop assistant…" aria-label="Message to Shop Copilot" required></textarea><div class="dk-copilot-actions"><button type="button" class="dk-copilot-voice">🎙 Voice</button><button type="submit" class="dk-copilot-send">Ask Copilot ↑</button></div></form>
      <div class="dk-copilot-status" role="status">Connect the API key in Vercel to enable AI replies.</div>`;
    document.body.appendChild(panel);
    panel.querySelector(".dk-copilot-close").addEventListener("click", () => panel.remove());
    const chat = panel.querySelector(".dk-copilot-chat");
    const form = panel.querySelector("form");
    const input = form.elements.message;
    const status = panel.querySelector(".dk-copilot-status");
    const send = panel.querySelector(".dk-copilot-send");
    const history = [];
    function addBubble(role, text) {
      const bubble = document.createElement("div");
      bubble.className = "dk-copilot-bubble " + role;
      bubble.textContent = text;
      chat.appendChild(bubble);
      chat.scrollTop = chat.scrollHeight;
    }
    function speak(text) {
      if (!("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const langMap = { English:"en-IN", Hindi:"hi-IN", Telugu:"te-IN", Tamil:"ta-IN", Kannada:"kn-IN", Malayalam:"ml-IN", Marathi:"mr-IN", Bengali:"bn-IN", Gujarati:"gu-IN", Punjabi:"pa-IN", Urdu:"ur-IN" };
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = langMap[getLanguage()] || navigator.language || "en-IN";
        window.speechSynthesis.speak(utter);
      } catch (_) {}
    }
    panel.querySelector(".dk-copilot-voice").addEventListener("click", () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { status.textContent = "Voice input is not supported in this browser. You can type instead."; return; }
      const rec = new SR();
      const voiceMap = { English:"en-IN", Hindi:"hi-IN", Telugu:"te-IN", Tamil:"ta-IN", Kannada:"kn-IN", Malayalam:"ml-IN", Marathi:"mr-IN", Bengali:"bn-IN", Gujarati:"gu-IN", Punjabi:"pa-IN", Urdu:"ur-IN" };
      rec.lang = voiceMap[getLanguage()] || navigator.language || "en-IN";
      rec.interimResults = false;
      status.textContent = "Listening…";
      rec.onresult = e => { input.value = e.results[0][0].transcript; input.focus(); status.textContent = "Voice captured. Tap Ask Copilot to send."; };
      rec.onerror = () => { status.textContent = "Could not hear that. Try again or type your request."; };
      rec.onend = () => { if (status.textContent === "Listening…") status.textContent = "Listening stopped."; };
      try { rec.start(); } catch (_) { status.textContent = "Voice input could not start. Please type instead."; }
    });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message || send.disabled) return;
      input.value = "";
      addBubble("user", message);
      history.push({ role:"user", content:message });
      send.disabled = true;
      status.textContent = "Thinking…";
      try {
        const base = String(window.DUKAAN_COPILOT_API_BASE || "").replace(/\/$/, "");
        const response = await fetch((base || "") + "/api/shop-copilot", {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({ message, language:getLanguage(), history:history.slice(-8) })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Copilot unavailable. Deploy the API on Vercel and configure its secret key.");
        const answer = String(data.answer || "").trim();
        if (!answer) throw new Error("No answer received. Please try again.");
        addBubble("assistant", answer);
        history.push({ role:"assistant", content:answer });
        status.textContent = "Reply ready. Shop actions are not enabled in this preview.";
        speak(answer);
      } catch (error) {
        addBubble("assistant", error && error.message ? error.message : "Could not connect to Shop Copilot.");
        status.textContent = "Check Vercel deployment and API configuration.";
      } finally { send.disabled = false; input.focus(); }
    });
    input.focus();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();
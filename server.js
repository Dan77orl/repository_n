<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RuWave Чат</title>
  <style>
    body {
      margin: 0;
      font-family: sans-serif;
    }

    #ruwave-button {
      position: fixed;
      bottom: 120px;
      right: 24px;
      background-color: #ff2f2f;
      border: none;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.1s ease, background-color 0.2s ease;
    }

    #ruwave-button.animate {
      transform: rotate(90deg) scale(1.1);
    }

    #ruwave-button svg {
      width: 32px;
      height: 32px;
      position: absolute;
      transition: opacity 0.2s ease;
    }

    #ruwave-icon-close {
      opacity: 0;
    }

    #ruwave-icon-play.show,
    #ruwave-icon-close.show {
      opacity: 1;
    }

    #ruwave-icon-play.hide,
    #ruwave-icon-close.hide {
      opacity: 0;
    }

    #ruwave-chatbox {
      position: fixed;
      bottom: 190px;
      right: 20px;
      width: 350px;
      height: 500px;
      display: none;
      flex-direction: column;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      z-index: 9998;
      overflow: hidden;
      transform: scale(0.9);
      opacity: 0;
      transition: transform 0.25s ease, opacity 0.25s ease;
    }

    #ruwave-chatbox.open {
      display: flex;
      transform: scale(1);
      opacity: 1;
    }

    #ruwave-messages {
      flex: 1;
      padding: 10px;
      overflow-y: auto;
    }

    #ruwave-input {
      display: flex;
      border-top: 1px solid #ccc;
    }

    #ruwave-input input {
      flex: 1;
      border: none;
      padding: 10px;
      font-size: 14px;
    }

    #ruwave-input button {
      background: #ff2f2f;
      color: white;
      border: none;
      padding: 10px 15px;
      font-size: 16px;
      cursor: pointer;
    }

    .typing {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 5px 0;
      color: #888;
      font-style: italic;
    }

    .typing span {
      width: 6px;
      height: 6px;
      background: #aaa;
      border-radius: 50%;
      display: inline-block;
      animation: blink 1.4s infinite ease-in-out both;
    }

    .typing span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes blink {
      0%, 80%, 100% { opacity: 0; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }
  </style>
</head>
<body>

  <button id="ruwave-button" onclick="toggleRuWaveChat()">
    <svg id="ruwave-icon-play" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" class="show">
      <path d="M8 5v14l11-7z"/>
    </svg>
    <svg id="ruwave-icon-close" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" class="hide">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>

  <div id="ruwave-chatbox">
    <div id="ruwave-messages"></div>
    <div id="ruwave-input">
      <input type="text" id="ruwave-text" placeholder="Напиши что-то..." />
      <button onclick="sendRuWaveMessage()">➤</button>
    </div>
  </div>

  <script>
    const PROMPT_TXT_URL = "https://botpromtsite-production.up.railway.app/system-prompt";


    const API_URL = "https://botpromtsite-production.up.railway.app/chat";

    let sessionId = localStorage.getItem("ruwave-session-id");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("ruwave-session-id", sessionId);
    }

    document.addEventListener("DOMContentLoaded", () => {
      const input = document.getElementById("ruwave-text");
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey && !input.disabled) {
          e.preventDefault();
          sendRuWaveMessage();
        }
      });
    });

    function toggleRuWaveChat() {
      const chat = document.getElementById("ruwave-chatbox");
      const playIcon = document.getElementById("ruwave-icon-play");
      const closeIcon = document.getElementById("ruwave-icon-close");
      const button = document.getElementById("ruwave-button");

      const isOpen = chat.classList.contains("open");
      button.classList.add("animate");
      setTimeout(() => button.classList.remove("animate"), 200);

      if (isOpen) {
        chat.classList.remove("open");
        setTimeout(() => chat.style.display = "none", 250);
      } else {
        chat.style.display = "flex";
        requestAnimationFrame(() => {
          chat.classList.add("open");
          sendInitialMessageIfNeeded();
        });
      }

      if (isOpen) {
        playIcon.classList.remove("hide");
        playIcon.classList.add("show");
        closeIcon.classList.remove("show");
        closeIcon.classList.add("hide");
      } else {
        playIcon.classList.remove("show");
        playIcon.classList.add("hide");
        closeIcon.classList.remove("hide");
        closeIcon.classList.add("show");
      }
    }

    async function sendInitialMessageIfNeeded() {
  const messagesBox = document.getElementById("ruwave-messages");
  const input = document.getElementById("ruwave-text");
  const sendBtn = document.querySelector("#ruwave-input button");

  if (messagesBox.childElementCount === 0) {
    input.disabled = true;
    sendBtn.disabled = true;

    const typingEl = document.createElement("div");
    typingEl.id = "typing-indicator";
    typingEl.className = "typing";
    typingEl.innerHTML = `<span></span><span></span><span></span>`;

    const wrapper = document.createElement("div");
    wrapper.id = "typing-wrapper";
    wrapper.innerHTML = `<strong>Майкл (24/7):</strong> `;
    wrapper.appendChild(typingEl);

    messagesBox.appendChild(wrapper);
    messagesBox.scrollTop = messagesBox.scrollHeight;

    try {
      const promptRes = await fetch(PROMPT_TXT_URL);
      const promptText = await promptRes.text();

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptText,
          sessionId: sessionId
        })
      });

      const data = await res.json();
      wrapper.remove();

      if (data.reply) {
        appendMessage("Майкл (24/7)", data.reply);
        speak(data.reply);
      }
    } catch (err) {
      wrapper.remove();
      console.error("Ошибка:", err);
      appendMessage("Майкл (24/7)", "❌ Приветственное сообщение не загружено.");
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }
}


    async function sendRuWaveMessage() {
      const input = document.getElementById("ruwave-text");
      if (input.disabled) return;

      const text = input.value.trim();
      if (!text) return;

      appendMessage("Вы", text);
      input.value = "";
      input.disabled = true;

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            sessionId: sessionId
          })
        });

        const data = await res.json();

        if (data.reply && typeof data.reply === "string") {
          appendMessage("Майкл (24/7)", data.reply);
          speak(data.reply);
        } else {
          appendMessage("Майкл (24/7)", "❌ Ответ не получен от сервера");
        }
      } catch (err) {
        console.error("Ошибка:", err);
        appendMessage("Майкл (24/7)", "❌ Сервер временно недоступен");
      } finally {
        input.disabled = false;
      }
    }

    function appendMessage(sender, text) {
      const box = document.getElementById("ruwave-messages");
      const el = document.createElement("div");
      el.innerHTML = `<strong>${sender}:</strong> ${text}`;
      el.style.margin = "5px 0";
      box.appendChild(el);
      box.scrollTop = box.scrollHeight;
    }

    function speak(text) {
      // const synth = window.speechSynthesis;
      // const utter = new SpeechSynthesisUtterance(text);
      // synth.speak(utter);
    }
  </script>
</body>
</html>

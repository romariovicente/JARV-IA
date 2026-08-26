// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD-aKfpRaNuaCpIoNZMp1IVF2RFGxSB9Oo",
  authDomain: "jarv-ia.firebaseapp.com",
  projectId: "jarv-ia",
  storageBucket: "jarv-ia.firebasestorage.app",
  messagingSenderId: "275886641350",
  appId: "1:275886641350:web:69bd0e534fb71a3a1e47c7"
};

let auth, db, provider;
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
  auth = firebase.auth();
  db = firebase.firestore();
  provider = new firebase.auth.GoogleAuthProvider();
}

// MODELO ATIVO ESTÁVEL NA GROQ
const ULTRA_FAST_MODEL = 'llama3-70b-8192';
localStorage.setItem('jarv_model', ULTRA_FAST_MODEL);

let currentLang = localStorage.getItem('jarv_lang') || 'pt-BR';
let ttsEnabled = true;
let chatsStore = JSON.parse(localStorage.getItem('jarv_chats_v2')) || {};
let activeChatId = localStorage.getItem('jarv_active_chat') || null;

let msgArea, chatInput, statusEl, loginModal, userNameEl, logoutBtn, hiddenFileInput, hiddenImageInput, jarvisOrb;
let attachedImageBase64 = null;

document.addEventListener("DOMContentLoaded", () => {
  msgArea = document.getElementById('msgArea');
  chatInput = document.getElementById('chatInput');
  statusEl = document.getElementById('jarvStatus');
  loginModal = document.getElementById('loginModal');
  userNameEl = document.getElementById('userName');
  logoutBtn = document.getElementById('logoutBtn');

  injectJarvisOrbStyles();
  createJarvisOrbElement();
  startRealTimeClock();

  if (auth) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        const name = user.displayName || user.email;
        if (userNameEl) userNameEl.textContent = name;
        if (statusEl) statusEl.textContent = `Autenticado (${name}) - J.A.R.V.I.S. Ativo`;
        if (loginModal) loginModal.style.display = "none";
      } else {
        if (userNameEl) userNameEl.textContent = "Operador";
        if (statusEl) statusEl.textContent = "Modo Operacional - J.A.R.V.I.S. Ativo";
      }
    });
  }

  initChatStore();
  setupFileUploads();
  setupToolbarButtons();
});

// 1. Criação Visual da Esfera Holográfica (Orb Matrix / Waveform Sphere)
function injectJarvisOrbStyles() {
  if (document.getElementById('jarvisOrbStyle')) return;
  const style = document.createElement('style');
  style.id = 'jarvisOrbStyle';
  style.innerHTML = `
    .jarvis-orb-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 15px auto;
      padding: 10px;
    }
    .jarvis-orb {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: radial-gradient(circle, #00ffff 0%, #0077ff 60%, #001133 100%);
      box-shadow: 0 0 20px #00ffff, inset 0 0 15px #ffffff;
      animation: orb-pulse 2s infinite ease-in-out;
      position: relative;
    }
    .jarvis-orb::after {
      content: '';
      position: absolute;
      top: -5px; left: -5px; right: -5px; bottom: -5px;
      border-radius: 50%;
      border: 2px dashed rgba(0, 255, 255, 0.6);
      animation: orb-rotate 8s linear infinite;
    }
    .jarvis-orb.active-speaking {
      animation: orb-speaking 0.5s infinite alternate ease-in-out;
      box-shadow: 0 0 35px #00ffcc, 0 f 0 15px rgba(0, 255, 204, 0.4);
    }
    @keyframes orb-pulse {
      0% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 15px #00ffff; }
      50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 30px #00ffff; }
      100% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 15px #00ffff; }
    }
    @keyframes orb-speaking {
      0% { transform: scale(0.9); box-shadow: 0 0 20px #ff0055; background: radial-gradient(circle, #ff0055 0%, #770033 100%); }
      100% { transform: scale(1.2); box-shadow: 0 0 40px #00ffcc; background: radial-gradient(circle, #00ffcc 0%, #007777 100%); }
    }
    @keyframes orb-rotate {
      100% { transform: rotate(360deg); }
    }
    .jarvis-orb-label {
      margin-top: 8px;
      font-family: monospace;
      font-size: 0.75rem;
      color: #00ffff;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
  `;
  document.head.appendChild(style);
}

function createJarvisOrbElement() {
  const sidebar = document.querySelector('.sidebar') || document.body;
  if (document.getElementById('jarvisOrbWidget')) return;
  
  const container = document.createElement('div');
  container.id = 'jarvisOrbWidget';
  container.className = 'jarvis-orb-container';
  container.innerHTML = `
    <div id="visualOrb" class="jarvis-orb"></div>
    <div class="jarvis-orb-label">J.A.R.V.I.S. CORE</div>
  `;
  
  const historyList = document.getElementById('chatHistoryList');
  if (historyList && historyList.parentNode) {
    historyList.parentNode.insertBefore(container, historyList);
  } else {
    sidebar.appendChild(container);
  }
  jarvisOrb = document.getElementById('visualOrb');
}

function setOrbState(active) {
  if (!jarvisOrb) jarvisOrb = document.getElementById('visualOrb');
  if (jarvisOrb) {
    if (active) jarvisOrb.classList.add('active-speaking');
    else jarvisOrb.classList.remove('active-speaking');
  }
}

// Relógio em Tempo Real
function startRealTimeClock() {
  const clockEl = document.getElementById('clockDisplay');
  if (!clockEl) return;
  const update = () => { clockEl.textContent = new Date().toLocaleTimeString('pt-BR'); };
  update();
  setInterval(update, 1000);
}

// Histórico
function initChatStore() {
  if (!activeChatId || !chatsStore[activeChatId]) {
    createNewChat(false);
  } else {
    renderHistoryList();
    loadChatMessages(activeChatId);
  }
}

function createNewChat(shouldRender = true) {
  const id = 'chat_' + Date.now();
  chatsStore[id] = { title: `Sessão ${Object.keys(chatsStore).length + 1}`, timestamp: Date.now(), messages: [] };
  activeChatId = id;
  saveStore();
  if (shouldRender) { renderHistoryList(); loadChatMessages(activeChatId); }
}

function loadChatMessages(id) {
  activeChatId = id;
  saveStore();
  renderHistoryList();
  if (!msgArea) return;
  msgArea.innerHTML = '';
  const chat = chatsStore[id];
  if (!chat || !chat.messages || chat.messages.length === 0) {
    appendMessage("J.A.R.V.I.S. Operacional. Esfera holográfica ativa.", 'system', false);
    return;
  }
  chat.messages.forEach(msg => {
    if (msg.type === 'user') appendCustomMessage(msg.content, 'user', false);
    else appendMessage(msg.content, msg.type, false);
  });
}

function renderHistoryList() {
  const listEl = document.getElementById('chatHistoryList');
  if (!listEl) return;
  listEl.innerHTML = '';
  Object.keys(chatsStore).reverse().forEach(id => {
    const btn = document.createElement('button');
    btn.className = `history-item ${id === activeChatId ? 'active' : ''}`;
    btn.textContent = chatsStore[id].title;
    btn.onclick = () => loadChatMessages(id);
    listEl.appendChild(btn);
  });
}

function saveStore() {
  localStorage.setItem('jarv_chats_v2', JSON.stringify(chatsStore));
  localStorage.setItem('jarv_active_chat', activeChatId);
}

// Pesquisa Web na Wikipédia
async function fetchWikipedia(query) {
  try {
    const searchUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    if (!searchData.query.search || searchData.query.search.length === 0) return "Nenhum resultado encontrado.";
    const pageId = searchData.query.search[0].pageid;
    const contentUrl = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}&format=json&origin=*`;
    const contentRes = await fetch(contentUrl);
    const contentData = await contentRes.json();
    return contentData.query.pages[pageId].extract || "Resumo indisponível.";
  } catch (err) {
    return `Erro na pesquisa: ${err.message}`;
  }
}

// Arquivos
function downloadAsFile(filename, textContent, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([textContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadAsWord(filename, textContent) {
  const htmlDoc = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${filename}</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
      <h2>Documento Gerado por J.A.R.V.I.S.</h2>
      <hr>
      <div>${formatMarkdown(textContent)}</div>
    </body>
    </html>`;
  downloadAsFile(filename, htmlDoc, 'application/msword');
}

// Voz (TTS com ativação da Esfera Holográfica)
function speakJARVIS(text) {
  if (!ttsEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const cleanText = text.replace(/[*_#`\[\]]/g, '').substring(0, 350);
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.05;
  
  setOrbState(true);
  utterance.onend = () => setOrbState(false);
  utterance.onerror = () => setOrbState(false);
  
  window.speechSynthesis.speak(utterance);
}

// Comando Principal
async function sendMsg() {
  const text = chatInput.value.trim();
  if (!text && !attachedImageBase64) return;

  const lowerText = text.toLowerCase();
  chatInput.value = '';

  // Imagem
  if (lowerText.startsWith("gere uma imagem de") || lowerText.startsWith("gerar imagem") || lowerText.startsWith("criar imagem")) {
    const promptImg = text.replace(/^(gere|gerar|criar)\s+(uma\s+)?imagem\s+(de\s+)?/i, '').trim();
    appendCustomMessage(escapeHTML(text), 'user', true);
    const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptImg)}?width=1024&height=1024&nologo=true`;
    const botHtml = `<strong>[J.A.R.V.I.S. IMAGEM]</strong><br><img src="${imgUrl}" style="max-width:100%; border-radius:8px; border:1px solid #00d2ff;"><br><a href="${imgUrl}" target="_blank" style="color:#00d2ff;">Abrir em Alta Resolução</a>`;
    appendCustomHtml(botHtml, 'bot', true);
    speakJARVIS(`Imagem gerada para ${promptImg}`);
    return;
  }

  // Pesquisa
  const isSearchQuery = text.startsWith('!wiki ') || lowerText.includes('pesquise sobre') || lowerText.includes('pesquisa de') || lowerText.includes('pesquisa sobre');
  if (isSearchQuery) {
    let wikiQuery = text.replace(/^!wiki\s+/i, '').replace(/.*(pesquise|pesquisa|busque)\s+(sobre|de)?\s+/i, '').replace(/por\s+favor.*$/i, '').trim();
    appendCustomMessage(escapeHTML(text), 'user', true);
    
    setOrbState(true);
    const wikiResult = await fetchWikipedia(wikiQuery);
    setOrbState(false);

    appendMessage(`**Resultados da Pesquisa para "${wikiQuery}":**\n\n${wikiResult}`, 'bot', true);
    speakJARVIS(wikiResult);
    return;
  }

  // IA Groq
  let userDisplayHtml = escapeHTML(text);
  if (attachedImageBase64) {
    userDisplayHtml += `<br><img src="${attachedImageBase64}" style="max-width: 200px; border-radius: 6px;">`;
  }
  appendCustomMessage(userDisplayHtml, 'user', true);

  setOrbState(true);
  try {
    let promptInstruction = text;
    if (lowerText.includes("slide")) promptInstruction += "\n\n(Formato: Crie uma apresentação de slides estruturada com títulos e tópicos)";
    if (lowerText.includes("documento") || lowerText.includes("relatório")) promptInstruction += "\n\n(Formato: Crie um documento formal com introdução e conclusão)";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: ULTRA_FAST_MODEL,
        messages: [
          { role: "system", content: "Você é o J.A.R.V.I.S., assistente holográfico avançado. Responda de forma precisa e eficiente." },
          { role: { role: "user", content: promptInstruction } },
          { role: "user", content: promptInstruction }
        ]
      })
    });

    const data = await response.json();
    setOrbState(false);
    attachedImageBase64 = null;

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const botResponse = data.choices[0].message.content;
      appendMessage(botResponse, 'bot', true);
      speakJARVIS(botResponse);
    } else {
      appendMessage(`Erro no núcleo de IA: ${data.error ? data.error.message : 'Falha na resposta.'}`, 'system', true);
    }
  } catch (err) {
    setOrbState(false);
    appendMessage(`Erro de conexão: ${err.message}`, 'system', true);
  }
}

function appendMessage(text, type, save = true) {
  const msgDiv = document.createElement('div');
  if (type === 'user') {
    msgDiv.className = 'jarv-msg jarv-msg-user';
    msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${escapeHTML(text)}`;
  } else if (type === 'bot') {
    msgDiv.className = 'jarv-msg jarv-msg-bot';
    let htmlContent = `<span class="jarv-code">[J.A.R.V.I.S.]</span> ${formatMarkdown(text)}`;
    const uniqueId = 'doc_' + Date.now();
    window[uniqueId] = text;

    const lower = text.toLowerCase();
    if (lower.includes('slide') || lower.includes('apresentação')) {
      htmlContent += `<div style="margin-top:10px; display:flex; gap:8px;"><button class="btn-send" style="padding:4px 8px; font-size:0.75rem;" onclick="downloadAsFile('slides.md', window['${uniqueId}'])">📥 Baixar Slides (.md)</button><button class="btn-send" style="padding:4px 8px; font-size:0.75rem; background:#0088cc;" onclick="downloadAsWord('slides.doc', window['${uniqueId}'])">📄 Word (.doc)</button></div>`;
    } else if (lower.includes('documento') || lower.includes('relatório')) {
      htmlContent += `<div style="margin-top:10px;"><button class="btn-send" style="padding:4px 8px; font-size:0.75rem; background:#0088cc;" onclick="downloadAsWord('relatorio.doc', window['${uniqueId}'])">📄 Word (.doc)</button></div>`;
    }
    msgDiv.innerHTML = htmlContent;
  } else {
    msgDiv.className = 'jarv-msg jarv-msg-system';
    msgDiv.innerHTML = `<span class="jarv-code">[SYSTEM]</span> ${escapeHTML(text)}`;
  }
  msgArea.appendChild(msgDiv);
  msgArea.scrollTop = msgArea.scrollHeight;

  if (save && chatsStore[activeChatId]) {
    chatsStore[activeChatId].messages.push({ type, content: text });
    saveStore();
  }
}

function appendCustomHtml(htmlContent, type, save = true) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'jarv-msg jarv-msg-bot';
  msgDiv.innerHTML = `<span class="jarv-code">[J.A.R.V.I.S.]</span> ${htmlContent}`;
  msgArea.appendChild(msgDiv);
  msgArea.scrollTop = msgArea.scrollHeight;
  if (save && chatsStore[activeChatId]) {
    chatsStore[activeChatId].messages.push({ type: 'bot', content: htmlContent });
    saveStore();
  }
}

function appendCustomMessage(htmlContent, type, save = true) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'jarv-msg jarv-msg-user';
  msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${htmlContent}`;
  msgArea.appendChild(msgDiv);
  msgArea.scrollTop = msgArea.scrollHeight;
  if (save && chatsStore[activeChatId]) {
    chatsStore[activeChatId].messages.push({ type: 'user', content: htmlContent });
    saveStore();
  }
}

function setupFileUploads() {
  hiddenImageInput = document.createElement('input');
  hiddenImageInput.type = 'file'; hiddenImageInput.accept = 'image/*'; hiddenImageInput.style.display = 'none';
  document.body.appendChild(hiddenImageInput);
  hiddenImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => { attachedImageBase64 = ev.target.result; appendMessage(`Imagem carregada: ${file.name}`, 'system', false); };
      reader.readAsDataURL(file);
    }
  });
  hiddenFileInput = document.createElement('input');
  hiddenFileInput.type = 'file'; hiddenFileInput.style.display = 'none';
  document.body.appendChild(hiddenFileInput);
}

function setupToolbarButtons() {
  document.querySelectorAll('.action-toolbar button').forEach(btn => {
    const title = btn.getAttribute('title') || '';
    if (title.includes('Câmera') || title.includes('Imagem')) btn.onclick = () => hiddenImageInput.click();
    else if (title.includes('Anexo')) btn.onclick = () => hiddenFileInput.click();
    else if (title.includes('Voz')) btn.onclick = () => startVoiceRecognition();
  });
}

function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return alert("Microfone não suportado.");
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.start();
  setOrbState(true);
  recognition.onresult = (e) => {
    setOrbState(false);
    chatInput.value = e.results[0][0].transcript;
    sendMsg();
  };
  recognition.onerror = () => setOrbState(false);
}

function resetSystem() {
  chatsStore = {};
  localStorage.removeItem('jarv_chats_v2');
  createNewChat(true);
}

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

function formatMarkdown(text) {
  if (typeof text !== 'string') return '';
  let formatted = escapeHTML(text);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

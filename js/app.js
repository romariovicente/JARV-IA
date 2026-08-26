/**
 * JARV.IA - Core Engine v3.0 (Quantum & Global Knowledge Edition)
 * Desenvolvido para Romário - Kali Cyberpunk Architecture
 */

// -------------------------------------------------------------
// 1. MOTOR DE COMPUTAÇÃO QUÂNTICA (Qubit & Gate Simulator)
// -------------------------------------------------------------
class QuantumSimulator {
  constructor() {
    // Estado inicial de 1 Qubit em estado puro |0>
    this.alpha = { re: 1, im: 0 }; // Amplitude para |0>
    this.beta = { re: 0, im: 0 };  // Amplitude para |1>
  }

  // Aplica Porta Lógica Hadamard (Cria Superposição 50/50)
  applyHadamard() {
    const invSqrt2 = 1 / Math.sqrt(2);
    const newAlphaRe = invSqrt2 * (this.alpha.re + this.beta.re);
    const newAlphaIm = invSqrt2 * (this.alpha.im + this.beta.im);
    const newBetaRe  = invSqrt2 * (this.alpha.re - this.beta.re);
    const newBetaIm  = invSqrt2 * (this.alpha.im - this.beta.im);

    this.alpha = { re: newAlphaRe, im: newAlphaIm };
    this.beta = { re: newBetaRe, im: newBetaIm };
  }

  // Aplica Porta Pauli-X (NOT Quântico)
  applyPauliX() {
    const temp = this.alpha;
    this.alpha = this.beta;
    this.beta = temp;
  }

  // Calcula Probabilidades de Medição P(|0>) e P(|1>)
  getProbabilities() {
    const prob0 = (this.alpha.re ** 2) + (this.alpha.im ** 2);
    const prob1 = (this.beta.re ** 2) + (this.beta.im ** 2);
    return {
      p0: (prob0 * 100).toFixed(2),
      p1: (prob1 * 100).toFixed(2)
    };
  }

  // Colapso do Qubit na Medição (Observação)
  measure() {
    const probs = this.getProbabilities();
    const random = Math.random() * 100;
    const result = random < probs.p0 ? 0 : 1;
    // Colapsa o estado
    if (result === 0) {
      this.alpha = { re: 1, im: 0 };
      this.beta = { re: 0, im: 0 };
    } else {
      this.alpha = { re: 0, im: 0 };
      this.beta = { re: 1, im: 0 };
    }
    return { result, probs };
  }
}

// -------------------------------------------------------------
// 2. CONEXÃO COM A WIKIPÉDIA (Conhecimento Global em Tempo Real)
// -------------------------------------------------------------
async function fetchWikipediaSummary(query) {
  try {
    const cleanQuery = encodeURIComponent(query.trim());
    const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${cleanQuery}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.type === 'disambiguation' || !data.extract) return null;
    return {
      title: data.title,
      extract: data.extract,
      url: data.content_urls?.desktop?.page || ''
    };
  } catch (err) {
    console.warn("Erro de busca na Wikipédia:", err);
    return null;
  }
}

// -------------------------------------------------------------
// 3. CONFIGURAÇÕES E FIREBASE
// -------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyD-aKfpRaNuaCpIoNZMp1IVF2RFGxSB9Oo",
  authDomain: "jarv-ia.firebaseapp.com",
  projectId: "jarv-ia",
  storageBucket: "jarv-ia.firebasestorage.app",
  messagingSenderId: "275886641350",
  appId: "1:275886641350:web:69bd0e534fb71a3a1e47c7"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth() : null;
const db = (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore() : null;

window.downloadCache = {};

let currentLang = localStorage.getItem('jarv_lang') || 'pt-BR';
let selectedModel = localStorage.getItem('jarv_model') || 'llama-3.3-70b-versatile';
let ttsEnabled = localStorage.getItem('jarv_tts') !== 'false';
let chatsStore = JSON.parse(localStorage.getItem('jarv_chats_v2')) || {};
let activeChatId = localStorage.getItem('jarv_active_chat') || null;

const i18n = {
  'pt-BR': {
    new_chat: "Nova Conversa", history: "HISTÓRICO", nav_terminal: "Terminal / Chat",
    reset: "Reiniciar", btn_send: "ENVIAR", placeholder: "Digite um comando (ou !wiki termo)...",
    system_init: "Sistema inicializado. Núcleo J.A.R.V.I.S. operacional. Conexão quântica simulada ativa."
  },
  'en-US': {
    new_chat: "New Chat", history: "HISTORY", nav_terminal: "Terminal / Chat",
    reset: "Restart", btn_send: "SEND", placeholder: "Enter command (or !wiki term)...",
    system_init: "System initialized. J.A.R.V.I.S. core active. Simulated quantum link ready."
  },
  'es-ES': {
    new_chat: "Nueva Conversación", history: "HISTORIAL", nav_terminal: "Terminal / Chat",
    reset: "Reiniciar", btn_send: "ENVIAR", placeholder: "Escriba un comando...",
    system_init: "Sistema inicializado. Núcleo J.A.R.V.I.S. activo. Enlace cuántico simulado listo."
  }
};

let msgArea, chatInput, statusEl, loginModal, userNameEl, logoutBtn, hiddenFileInput, hiddenImageInput;
let attachedImageBase64 = null;

document.addEventListener("DOMContentLoaded", () => {
  msgArea = document.getElementById('msgArea');
  chatInput = document.getElementById('chatInput');
  statusEl = document.getElementById('jarvStatus');
  loginModal = document.getElementById('loginModal');
  userNameEl = document.getElementById('userName');
  logoutBtn = document.getElementById('logoutBtn');

  startRealTimeClock();

  if (auth) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        const name = user.displayName || user.email;
        if (userNameEl) userNameEl.textContent = name;
        if (statusEl) statusEl.textContent = `Authenticated (${name})`;
        if (loginModal) loginModal.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "inline-block";
      } else {
        if (userNameEl) userNameEl.textContent = "Romário (Local)";
        if (statusEl) statusEl.textContent = "Secure Local Terminal";
        if (loginModal) loginModal.style.display = "none";
      }
    });
  }

  initChatStore();
  setupFileUploads();
  setupToolbarButtons();
  applyLanguage(currentLang);
});

function startRealTimeClock() {
  const clockEl = document.getElementById('clockDisplay');
  setInterval(() => {
    if (clockEl) clockEl.textContent = new Date().toLocaleTimeString();
  }, 1000);
}

// -------------------------------------------------------------
// 4. ENVIO DE MENSAGEM & PROCESSAMENTO DE INTENÇÃO
// -------------------------------------------------------------
async function sendMsg() {
  if (!chatInput) return;
  const rawText = chatInput.value.trim();
  if (!rawText && !attachedImageBase64) return;

  const safeText = escapeHTML(rawText);
  let userDisplayHtml = safeText;

  if (attachedImageBase64) {
    userDisplayHtml += `<br><img src="${attachedImageBase64}" style="max-width: 200px; border-radius: 6px; margin-top: 8px; border: 1px solid #00ffcc;">`;
  }

  appendCustomMessage(userDisplayHtml, 'user', true);
  chatInput.value = '';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'jarv-msg jarv-msg-bot';
  loadingDiv.innerHTML = `<span class="jarv-code">[JARV]</span> Processando e acessando conhecimento global...`;
  msgArea.appendChild(loadingDiv);
  msgArea.scrollTop = msgArea.scrollHeight;

  try {
    let wikiContext = "";
    
    // Comando manual !wiki ou detecção de busca de conhecimento
    if (rawText.startsWith('!wiki ')) {
      const searchTerm = rawText.replace('!wiki ', '');
      const wikiData = await fetchWikipediaSummary(searchTerm);
      if (wikiData) {
        wikiContext = `\n[Fonte Wikipédia Real-Time: ${wikiData.title}]\n${wikiData.extract}\n`;
      }
    }

    let promptContent = rawText;
    if (wikiContext) {
      promptContent = `${rawText}\n\nUtilize o seguinte contexto verificado da Wikipédia para responder se relevante:${wikiContext}`;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: `Você é o J.A.R.V.I.S., assistente avançado do Romário com acesso a simulador quântico e base de dados global. Responda em ${currentLang} com formato Markdown limpo.`
          },
          { role: "user", content: promptContent }
        ]
      })
    });

    const data = await response.json();
    if (msgArea.contains(loadingDiv)) msgArea.removeChild(loadingDiv);
    
    attachedImageBase64 = null;

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const botResponse = data.choices[0].message.content;
      appendMessage(botResponse, 'bot', true);
      speakJARVIS(botResponse);
    } else {
      appendMessage("Erro na resposta do núcleo principal.", 'system', true);
    }
  } catch (err) {
    if (msgArea.contains(loadingDiv)) msgArea.removeChild(loadingDiv);
    appendMessage(`Falha de Conexão: ${err.message}`, 'system', true);
  }
}

// Demo do Simulador Quântico no Chat
function runQuantumDemo() {
  const q = new QuantumSimulator();
  const initialProbs = q.getProbabilities();
  
  q.applyHadamard(); // Coloca em Superposição
  const supProbs = q.getProbabilities();
  
  const measurement = q.measure(); // Colapsa
  
  const report = `**[SIMULAÇÃO QUÂNTICA DE QUBIT]**
* **Estado Inicial |0⟩:** P(|0⟩) = ${initialProbs.p0}%, P(|1⟩) = ${initialProbs.p1}%
* **Após Porta Hadamard (Superposição |ψ⟩):** P(|0⟩) = ${supProbs.p0}%, P(|1⟩) = ${supProbs.p1}%
* **Medição do Observador (Colapso):** Qubit colapsou para **|${measurement.result}⟩**`;

  appendMessage(report, 'bot', true);
}

// Busca rápida na Wikipédia pelo chat
async function searchWikiPrompt() {
  const term = prompt("Digite o tema para pesquisar na Wikipédia mundial:");
  if (term) {
    if (chatInput) {
      chatInput.value = `!wiki ${term}`;
      sendMsg();
    }
  }
}

// -------------------------------------------------------------
// 5. RENDERIZAÇÃO E HISTÓRICO
// -------------------------------------------------------------
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
  chatsStore[id] = { title: `Conversa ${Object.keys(chatsStore).length + 1}`, timestamp: Date.now(), messages: [] };
  activeChatId = id;
  saveStore();
  if (shouldRender) {
    renderHistoryList();
    loadChatMessages(activeChatId);
  }
}

function loadChatMessages(id) {
  activeChatId = id;
  saveStore();
  renderHistoryList();
  if (msgArea) msgArea.innerHTML = '';
  const chat = chatsStore[id];
  if (!chat || chat.messages.length === 0) {
    appendMessage(i18n[currentLang].system_init, 'system', false);
    return;
  }
  chat.messages.forEach(msg => {
    if (msg.type === 'user') appendCustomMessage(msg.content, 'user', false);
    else appendMessage(msg.content, msg.type, false);
  });
}

function clearCurrentChat() {
  if (activeChatId && chatsStore[activeChatId]) {
    delete chatsStore[activeChatId];
    createNewChat(true);
  }
}

function renderHistoryList() {
  const listEl = document.getElementById('chatHistoryList');
  if (!listEl) return;
  listEl.innerHTML = '';
  Object.keys(chatsStore).reverse().forEach(id => {
    const chat = chatsStore[id];
    const btn = document.createElement('button');
    btn.className = `history-item ${id === activeChatId ? 'active' : ''}`;
    btn.textContent = chat.title;
    btn.onclick = () => loadChatMessages(id);
    listEl.appendChild(btn);
  });
}

function saveStore() {
  localStorage.setItem('jarv_chats_v2', JSON.stringify(chatsStore));
  localStorage.setItem('jarv_active_chat', activeChatId);
}

function appendMessage(text, type, save = true) {
  if (!msgArea) return;
  const msgDiv = document.createElement('div');

  if (type === 'user') {
    msgDiv.className = 'jarv-msg jarv-msg-user';
    msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${escapeHTML(text)}`;
  } else if (type === 'bot') {
    msgDiv.className = 'jarv-msg jarv-msg-bot';
    let htmlContent = `<span class="jarv-code">[JARV]</span> ${formatMarkdown(text)}`;
    if (text.toLowerCase().includes('slide') || text.includes('```')) {
      const cacheKey = 'slide_' + Date.now();
      window.downloadCache[cacheKey] = text;
      htmlContent += `
        <div class="msg-download-bar">
          <button class="btn-download-file" onclick="downloadAsFile('jarvis_doc.md', '${cacheKey}')">
            <i class="fa-solid fa-download"></i> Baixar Documento (.md)
          </button>
        </div>`;
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

function appendCustomMessage(htmlContent, type, save = true) {
  if (!msgArea) return;
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

function downloadAsFile(filename, cacheKey) {
  const textContent = window.downloadCache[cacheKey] || "";
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function speakJARVIS(text) {
  if (!ttsEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const cleanText = text.replace(/[*_#`\[\]]/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = currentLang;
  window.speechSynthesis.speak(utterance);
}

function toggleTTS(state) {
  ttsEnabled = typeof state === 'boolean' ? state : !ttsEnabled;
  localStorage.setItem('jarv_tts', ttsEnabled);
  const btn = document.getElementById('ttsToggleBtn');
  if (btn) btn.style.color = ttsEnabled ? '#00d2ff' : '#5c78a5';
}

function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) modal.style.display = 'flex';
}

function closeSettingsModal() {
  const modelSelect = document.getElementById('modelSelect');
  if (modelSelect) {
    selectedModel = modelSelect.value;
    localStorage.setItem('jarv_model', selectedModel);
  }
  const modal = document.getElementById('settingsModal');
  if (modal) modal.style.display = 'none';
}

function changeLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('jarv_lang', lang);
  applyLanguage(lang);
}

function applyLanguage(lang) {
  const dict = i18n[lang] || i18n['pt-BR'];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  if (chatInput) chatInput.placeholder = dict.placeholder;
}

function setupFileUploads() {
  hiddenImageInput = document.createElement('input');
  hiddenImageInput.type = 'file'; hiddenImageInput.accept = 'image/*'; hiddenImageInput.style.display = 'none';
  document.body.appendChild(hiddenImageInput);
  hiddenImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        attachedImageBase64 = uploadEvent.target.result;
        appendMessage(`[BUFFER] Imagem anexada com sucesso: ${file.name}`, 'system', false);
      };
      reader.readAsDataURL(file);
    }
  });

  hiddenFileInput = document.createElement('input');
  hiddenFileInput.type = 'file'; hiddenFileInput.style.display = 'none';
  document.body.appendChild(hiddenFileInput);
}

function setupToolbarButtons() {
  const buttons = document.querySelectorAll('.action-toolbar button');
  buttons.forEach(btn => {
    const title = btn.getAttribute('title') || '';
    if (title.includes('Imagem')) btn.onclick = () => hiddenImageInput.click();
    else if (title.includes('Anexo')) btn.onclick = () => hiddenFileInput.click();
    else if (title.includes('Voz')) btn.onclick = () => startVoiceRecognition();
  });
}

function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return alert("Navegador sem suporte a STT.");
  const recognition = new SpeechRecognition();
  recognition.lang = currentLang;
  recognition.start();
  recognition.onresult = (e) => {
    if (chatInput) {
      chatInput.value = e.results[0][0].transcript;
      sendMsg();
    }
  };
}

function switchView(viewName) {
  document.querySelectorAll('.jarv-nav-item').forEach(el => el.classList.remove('active'));
  const btn = document.querySelector(`.jarv-nav-item[data-view="${viewName}"]`);
  if (btn) btn.classList.add('active');
}

function resetSystem() { clearCurrentChat(); }

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, (tag) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[tag] || tag));
}

function formatMarkdown(text) {
  if (typeof marked !== 'undefined') return marked.parse(text);
  return escapeHTML(text).replace(/\n/g, '<br>');
}

// Exposição global segura
window.sendMsg = sendMsg;
window.createNewChat = createNewChat;
window.clearCurrentChat = clearCurrentChat;
window.downloadAsFile = downloadAsFile;
window.toggleTTS = toggleTTS;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.changeLanguage = changeLanguage;
window.switchView = switchView;
window.resetSystem = resetSystem;
window.runQuantumDemo = runQuantumDemo;
window.searchWikiPrompt = searchWikiPrompt;

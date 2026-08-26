// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD-aKfpRaNuaCpIoNZMp1IVF2RFGxSB9Oo",
  authDomain: "jarv-ia.firebaseapp.com",
  projectId: "jarv-ia",
  storageBucket: "jarv-ia.firebasestorage.app",
  messagingSenderId: "275886641350",
  appId: "1:275886641350:web:69bd0e534fb71a3a1e47c7"
};

// Inicializa Firebase apenas se a biblioteca carregou com sucesso
let auth, db, provider;
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  db = firebase.firestore();
  provider = new firebase.auth.GoogleAuthProvider();
} else {
  console.error("[ERRO CRÍTICO] Firebase não foi carregado. Verifique o HTML.");
}

// Configurações de Estado da Aplicação (Modelo padrão alterado para llama3-8b-8192)
let currentLang = localStorage.getItem('jarv_lang') || 'pt-BR';
let selectedModel = localStorage.getItem('jarv_model') || 'llama3-8b-8192';
let ttsEnabled = localStorage.getItem('jarv_tts') !== 'false';
let chatsStore = JSON.parse(localStorage.getItem('jarv_chats_v2')) || {};
let activeChatId = localStorage.getItem('jarv_active_chat') || null;

// Dicionário de Idiomas (i18n)
const i18n = {
  'pt-BR': {
    new_chat: "Nova Conversa",
    history: "HISTÓRICO",
    nav_terminal: "Terminal / Chat",
    reset: "Reiniciar",
    btn_send: "ENVIAR",
    placeholder: "Digite um comando...",
    system_init: "Sistema inicializado. Núcleo J.A.R.V.I.S. operacional. Aguardando comandos do operador."
  },
  'en-US': {
    new_chat: "New Chat",
    history: "HISTORY",
    nav_terminal: "Terminal / Chat",
    reset: "Restart",
    btn_send: "SEND",
    placeholder: "Enter command...",
    system_init: "System initialized. J.A.R.V.I.S. core active. Awaiting operator input."
  },
  'es-ES': {
    new_chat: "Nueva Conversación",
    history: "HISTORIAL",
    nav_terminal: "Terminal / Chat",
    reset: "Reiniciar",
    btn_send: "ENVIAR",
    placeholder: "Escriba un comando...",
    system_init: "Sistema inicializado. Núcleo J.A.R.V.I.S. activo. Esperando comandos."
  }
};

// Elementos Globais
let msgArea, chatInput, statusEl, loginModal, userNameEl, logoutBtn, hiddenFileInput, hiddenImageInput;
let attachedImageBase64 = null;

document.addEventListener("DOMContentLoaded", () => {
  msgArea = document.getElementById('msgArea');
  chatInput = document.getElementById('chatInput');
  statusEl = document.getElementById('jarvStatus');
  loginModal = document.getElementById('loginModal');
  userNameEl = document.getElementById('userName');
  logoutBtn = document.getElementById('logoutBtn');

  // Relógio do Sistema em Tempo Real
  startRealTimeClock();

  // Autenticação Firebase (se disponível)
  if (auth) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        const name = user.displayName || user.email;
        if (userNameEl) userNameEl.textContent = name;
        if (statusEl) statusEl.textContent = `Authenticated (${name})`;
        if (loginModal) loginModal.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "inline-block";
      } else {
        if (userNameEl) userNameEl.textContent = "Visitante";
        if (statusEl) statusEl.textContent = "Awaiting Authentication";
        if (loginModal) loginModal.style.display = "flex";
        if (logoutBtn) logoutBtn.style.display = "none";
      }
    });
  }

  // Configuração de sessões e histórico
  initChatStore();
  setupFileUploads();
  setupToolbarButtons();
  applyLanguage(currentLang);
  
  // Atualiza controles do modal
  const langSelect = document.getElementById('langSelect');
  if (langSelect) langSelect.value = currentLang;
  const modelSelect = document.getElementById('modelSelect');
  if (modelSelect) modelSelect.value = selectedModel;
});

// 1. Relógio em Tempo Real
function startRealTimeClock() {
  const clockEl = document.getElementById('clockDisplay');
  if (!clockEl) return;
  function update() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('pt-BR');
  }
  update();
  setInterval(update, 1000);
}

// 2. Gerenciamento de Histórico e Conversas
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
  chatsStore[id] = {
    title: `Conversa ${Object.keys(chatsStore).length + 1}`,
    timestamp: Date.now(),
    messages: []
  };
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
  if (!msgArea) return;
  msgArea.innerHTML = '';
  
  const chat = chatsStore[id];
  if (!chat || !chat.messages || chat.messages.length === 0) {
    appendMessage(i18n[currentLang].system_init, 'system', false);
    return;
  }
  
  chat.messages.forEach(msg => {
    if (msg.type === 'user') {
      appendCustomMessage(msg.content, 'user', false);
    } else {
      appendMessage(msg.content, msg.type, false);
    }
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

// 3. Integração com a Wikipédia
async function fetchWikipedia(query) {
  try {
    const searchUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.query.search || searchData.query.search.length === 0) {
      return "Nenhum resultado encontrado na Wikipédia para o termo solicitado.";
    }

    const pageId = searchData.query.search[0].pageid;
    const contentUrl = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}&format=json&origin=*`;
    const contentRes = await fetch(contentUrl);
    const contentData = await contentRes.json();

    const extract = contentData.query.pages[pageId].extract;
    return extract ? extract : "Resumo indisponível na Wikipédia.";
  } catch (err) {
    return `Erro ao consultar a Wikipédia: ${err.message}`;
  }
}

// 4. Simulador Quântico Integrado
function runQuantumSimulation() {
  const r = Math.random();
  const state = r > 0.5 ? "|1⟩" : "|0⟩";
  const prob0 = "50.00%";
  const prob1 = "50.00%";
  
  return `[SIMULAÇÃO QUÂNTICA DE QUBIT]\n• Estado Inicial |0⟩: P(|0⟩) = 100.00%, P(|1⟩) = 0.00%\n• Após Porta Hadamard (Superposição |ψ⟩): P(|0⟩) = ${prob0}, P(\vert{}1⟩) =${prob1}\n• Medição do Observador (Colapso): Qubit colapsou para ${state}`;
}

// 5. Download de Arquivos
function downloadAsFile(filename, textContent) {
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

// 6. Voz do JARVIS (Text-to-Speech)
function speakJARVIS(text) {
  if (!ttsEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  
  const cleanText = text.replace(/[*_#`\[\]]/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = currentLang;
  utterance.rate = 1.0;
  utterance.pitch = 0.95;
  
  window.speechSynthesis.speak(utterance);
}

function toggleTTS(state) {
  if (typeof state === 'boolean') {
    ttsEnabled = state;
  } else {
    ttsEnabled = !ttsEnabled;
  }
  localStorage.setItem('jarv_tts', ttsEnabled);
  const btn = document.getElementById('ttsToggleBtn');
  if (btn) {
    btn.style.color = ttsEnabled ? '#00d2ff' : '#5c78a5';
  }
}

// 7. Envio de Mensagem para a Groq API com Detecção de Pesquisa
async function sendMsg() {
  const text = chatInput.value.trim();
  if (!text && !attachedImageBase64) return;

  const lowerText = text.toLowerCase();
  const isSearchQuery = text.startsWith('!wiki ') || 
                        lowerText.startsWith('pesquise sobre') || 
                        lowerText.startsWith('pesquise para mim sobre') ||
                        lowerText.startsWith('pesquisa sobre') ||
                        lowerText.startsWith('busque sobre');

  // Processamento de Pesquisa Automática na Wikipédia
  if (isSearchQuery) {
    let wikiQuery = text
      .replace(/^!wiki\s+/i, '')
      .replace(/^pesquise\s+para\s+mim\s+sobre\s+/i, '')
      .replace(/^pesquise\s+sobre\s+/i, '')
      .replace(/^pesquisa\s+sobre\s+/i, '')
      .replace(/^busque\s+sobre\s+/i, '')
      .replace(/por\s+favor.*$/i, '')
      .trim();

    chatInput.value = '';
    appendCustomMessage(escapeHTML(text), 'user', true);
    
    const loadingWiki = document.createElement('div');
    loadingWiki.className = 'jarv-msg jarv-msg-bot';
    loadingWiki.innerHTML = `<span class="jarv-code">[WIKI]</span> Pesquisando na Wikipédia sobre "${escapeHTML(wikiQuery)}"...`;
    msgArea.appendChild(loadingWiki);
    msgArea.scrollTop = msgArea.scrollHeight;

    const wikiResult = await fetchWikipedia(wikiQuery);
    if (msgArea.contains(loadingWiki)) msgArea.removeChild(loadingWiki);
    appendMessage(wikiResult, 'bot', true);
    speakJARVIS(wikiResult);
    return;
  }

  let userDisplayHtml = escapeHTML(text);
  if (attachedImageBase64) {
    userDisplayHtml += `<br><img src="${attachedImageBase64}" style="max-width: 200px; border-radius: 6px; margin-top: 8px; border: 1px solid #00ffcc;">`;
  }

  appendCustomMessage(userDisplayHtml, 'user', true);
  
  if (chatsStore[activeChatId] && chatsStore[activeChatId].messages.length <= 1) {
    chatsStore[activeChatId].title = text.substring(0, 22) + '...';
    renderHistoryList();
  }

  chatInput.value = '';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'jarv-msg jarv-msg-bot';
  loadingDiv.innerHTML = `<span class="jarv-code">[JARV]</span> Processando comando...`;
  msgArea.appendChild(loadingDiv);
  msgArea.scrollTop = msgArea.scrollHeight;

  try {
    let messageContent = text || "Olá!";
    if (attachedImageBase64) messageContent = `[Imagem Anexada] ${text}`;

    const groqMessages = [
      {
        role: "system",
        content: `Você é o J.A.R.V.I.S., assistente inteligente integrado no sistema Kali Linux Cyberpunk do Romário. Responda em ${currentLang}. Seja direto, técnico e cortês.`
      }
    ];

    if (chatsStore[activeChatId] && chatsStore[activeChatId].messages) {
      chatsStore[activeChatId].messages.slice(-6).forEach(m => {
        if (m.type === 'user' || m.type === 'bot') {
          const role = m.type === 'user' ? 'user' : 'assistant';
          const cleanText = typeof m.content === 'string' ? m.content.replace(/<[^>]*>?/gm, '') : '';
          if (cleanText.trim()) {
            groqMessages.push({ role, content: cleanText });
          }
        }
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: groqMessages
      })
    });

    const data = await response.json();
    if (msgArea.contains(loadingDiv)) msgArea.removeChild(loadingDiv);
    
    attachedImageBase64 = null;
    chatInput.placeholder = i18n[currentLang].placeholder;

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const botResponse = data.choices[0].message.content;
      appendMessage(botResponse, 'bot', true);
      speakJARVIS(botResponse);
    } else {
      appendMessage(`Erro na Groq API: ${data.error ? data.error.message : 'Resposta inesperada do servidor.'}`, 'system', true);
    }
  } catch (err) {
    if (msgArea.contains(loadingDiv)) msgArea.removeChild(loadingDiv);
    appendMessage(`Erro de conexão: ${err.message}`, 'system', true);
    attachedImageBase64 = null;
  }
}

// Renderização de Mensagens
function appendMessage(text, type, save = true) {
  const msgDiv = document.createElement('div');

  if (type === 'user') {
    msgDiv.className = 'jarv-msg jarv-msg-user';
    msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${escapeHTML(text)}`;
  } else if (type === 'bot') {
    msgDiv.className = 'jarv-msg jarv-msg-bot';
    let htmlContent = `<span class="jarv-code">[JARV]</span> ${formatMarkdown(text)}`;
    
    if (text.toLowerCase().includes('slide') || text.includes('```')) {
      const uniqueId = 'slide_' + Date.now();
      window[uniqueId] = text;
      htmlContent += `
        <div class="msg-download-bar">
          <button class="btn-download-file" onclick="downloadAsFile('slide_jarvis.md', window['${uniqueId}'])">
            <i class="fa-solid fa-download"></i> Baixar Arquivo (.md / .txt)
          </button>
        </div>
      `;
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

// Modais e Navegação Lateral
function openSettingsModal() {
  document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettingsModal() {
  const chosenModel = document.getElementById('modelSelect').value;
  selectedModel = chosenModel;
  localStorage.setItem('jarv_model', chosenModel);
  document.getElementById('settingsModal').style.display = 'none';
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

function switchView(viewName) {
  document.querySelectorAll('.jarv-nav-item').forEach(el => el.classList.remove('active'));
  const btn = document.querySelector(`.jarv-nav-item[data-view="${viewName}"]`);
  if (btn) btn.classList.add('active');

  if (viewName === 'quantum') {
    const result = runQuantumSimulation();
    appendMessage(result, 'bot', true);
  } else if (viewName === 'wiki') {
    const topic = prompt("Digite o termo que deseja pesquisar na Wikipédia:");
    if (topic) {
      chatInput.value = `!wiki ${topic}`;
      sendMsg();
    }
  }
}

// Uploads e Voz
function setupFileUploads() {
  hiddenImageInput = document.createElement('input');
  hiddenImageInput.type = 'file'; 
  hiddenImageInput.accept = 'image/*'; 
  hiddenImageInput.style.display = 'none';
  document.body.appendChild(hiddenImageInput);
  
  hiddenImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        attachedImageBase64 = uploadEvent.target.result;
        appendMessage(`[BUFFER] Imagem carregada: ${file.name}`, 'system', false);
      };
      reader.readAsDataURL(file);
    }
  });

  hiddenFileInput = document.createElement('input');
  hiddenFileInput.type = 'file'; 
  hiddenFileInput.style.display = 'none';
  document.body.appendChild(hiddenFileInput);
}

function setupToolbarButtons() {
  const buttons = document.querySelectorAll('.action-toolbar button');
  buttons.forEach(btn => {
    const title = btn.getAttribute('title') || '';
    if (title.includes('Câmera') || title.includes('Imagem')) {
      btn.onclick = () => hiddenImageInput.click();
    } else if (title.includes('Anexo')) {
      btn.onclick = () => hiddenFileInput.click();
    } else if (title.includes('Voz')) {
      btn.onclick = () => startVoiceRecognition();
    }
  });
}

function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return alert("Navegador sem suporte a STT.");

  const recognition = new SpeechRecognition();
  recognition.lang = currentLang;
  recognition.start();

  recognition.onresult = (e) => {
    chatInput.value = e.results[0][0].transcript;
    sendMsg();
  };
}

function signInWithGoogle() {
  if (auth && provider) {
    auth.signInWithPopup(provider).catch(() => auth.signInWithRedirect(provider));
  } else {
    alert("Erro: O sistema de autenticação Firebase não está operante.");
  }
}

function resetSystem() {
  clearCurrentChat();
}

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

function formatMarkdown(text) {
  if (typeof marked !== 'undefined') {
    return marked.parse(text);
  }
  return escapeHTML(text).replace(/\n/g, '<br>');
}

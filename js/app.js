// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD-aKfpRaNuaCpIoNZMp1IVF2RFGxSB9Oo",
  authDomain: "jarv-ia.firebaseapp.com",
  projectId: "jarv-ia",
  storageBucket: "jarv-ia.firebasestorage.app",
  messagingSenderId: "275886641350",
  appId: "1:275886641350:web:69bd0e534fb71a3a1e47c7"
};

// Inicializa Firebase se disponível
let auth, db, provider;
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  db = firebase.firestore();
  provider = new firebase.auth.GoogleAuthProvider();
}

// FIXAÇÃO PERMANENTE DO MODELO RÁPIDO: LLaMA 3 8B
const ULTRA_FAST_MODEL = 'llama3-8b-8192';
localStorage.setItem('jarv_model', ULTRA_FAST_MODEL);
let selectedModel = ULTRA_FAST_MODEL;

let currentLang = localStorage.getItem('jarv_lang') || 'pt-BR';
let ttsEnabled = true; // Voz ativa por padrão
let chatsStore = JSON.parse(localStorage.getItem('jarv_chats_v2')) || {};
let activeChatId = localStorage.getItem('jarv_active_chat') || null;

// Dicionário i18n
const i18n = {
  'pt-BR': {
    placeholder: "Digite um comando (ex: pesquise sobre, crie slides, gere imagem, crie documento)...",
    system_init: "J.A.R.V.I.S. Operacional em modo Ultra Rápido (LLaMA 3 8B). Recursos ativados: Voz, Pesquisa, Slides, Word, Imagens e Vídeos."
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
        if (statusEl) statusEl.textContent = `Autenticado (${name}) - Mod: LLaMA 3 8B`;
        if (loginModal) loginModal.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "inline-block";
      } else {
        if (userNameEl) userNameEl.textContent = "Operador";
        if (statusEl) statusEl.textContent = "Modo Convidado - Mod: LLaMA 3 8B";
        if (loginModal) loginModal.style.display = "flex";
        if (logoutBtn) logoutBtn.style.display = "none";
      }
    });
  }

  initChatStore();
  setupFileUploads();
  setupToolbarButtons();
});

// Relógio em Tempo Real
function startRealTimeClock() {
  const clockEl = document.getElementById('clockDisplay');
  if (!clockEl) return;
  const update = () => { clockEl.textContent = new Date().toLocaleTimeString('pt-BR'); };
  update();
  setInterval(update, 1000);
}

// Gerenciador de Histórico
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
    appendMessage(i18n['pt-BR'].system_init, 'system', false);
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

// 1. Pesquisa Web na Wikipédia
async function fetchWikipedia(query) {
  try {
    const searchUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    if (!searchData.query.search || searchData.query.search.length === 0) {
      return "Nenhum resultado encontrado para a pesquisa.";
    }
    const pageId = searchData.query.search[0].pageid;
    const contentUrl = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}&format=json&origin=*`;
    const contentRes = await fetch(contentUrl);
    const contentData = await contentRes.json();
    return contentData.query.pages[pageId].extract || "Resumo indisponível.";
  } catch (err) {
    return `Erro na pesquisa: ${err.message}`;
  }
}

// 2. Sistema de Download de Arquivos (.md, .txt, .doc)
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
    </html>
  `;
  downloadAsFile(filename, htmlDoc, 'application/msword');
}

// 3. Resposta em Voz (Síntese Falada)
function speakJARVIS(text) {
  if (!ttsEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const cleanText = text.replace(/[*_#`\[\]]/g, '').substring(0, 300); // Fala o resumo inicial
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.05;
  utterance.pitch = 0.95;
  window.speechSynthesis.speak(utterance);
}

// 4. Fluxo Principal de Processamento de Comandos
async function sendMsg() {
  const text = chatInput.value.trim();
  if (!text && !attachedImageBase64) return;

  const lowerText = text.toLowerCase();
  chatInput.value = '';

  // A. Geração de Imagem
  if (lowerText.startsWith("gere uma imagem de") || lowerText.startsWith("gerar imagem") || lowerText.startsWith("criar imagem")) {
    const promptImg = text.replace(/^(gere|gerar|criar)\s+(uma\s+)?imagem\s+(de\s+)?/i, '').trim();
    appendCustomMessage(escapeHTML(text), 'user', true);
    
    const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptImg)}?width=1024&height=1024&nologo=true`;
    const botHtml = `
      <strong>[J.A.R.V.I.S. GERADOR DE IMAGENS]</strong><br>
      Imagem gerada para: <em>"${escapeHTML(promptImg)}"</em><br><br>
      <img src="${imgUrl}" alt="Imagem Gerada" style="max-width: 100%; border-radius: 8px; border: 1px solid #00d2ff;"><br><br>
      <a href="${imgUrl}" target="_blank" style="color: #00d2ff; text-decoration: none;">🔍 Abrir Imagem em Alta Resolução</a>
    `;
    appendCustomHtml(botHtml, 'bot', true);
    speakJARVIS(`Imagem gerada com sucesso para ${promptImg}`);
    return;
  }

  // B. Pesquisa Web Automática
  const isSearchQuery = text.startsWith('!wiki ') || lowerText.includes('pesquise sobre') || lowerText.includes('pesquisar sobre') || lowerText.includes('busque sobre');
  if (isSearchQuery) {
    let wikiQuery = text.replace(/^!wiki\s+/i, '').replace(/.*(pesquise|pesquisar|busque)\s+sobre\s+/i, '').replace(/por\s+favor.*$/i, '').trim();
    appendCustomMessage(escapeHTML(text), 'user', true);
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'jarv-msg jarv-msg-bot';
    loadingDiv.innerHTML = `<span class="jarv-code">[PESQUISA]</span> Consultando base de conhecimento para "${escapeHTML(wikiQuery)}"...`;
    msgArea.appendChild(loadingDiv);

    const wikiResult = await fetchWikipedia(wikiQuery);
    if (msgArea.contains(loadingDiv)) msgArea.removeChild(loadingDiv);
    
    appendMessage(`**Resultados da Pesquisa para "${wikiQuery}":**\n\n${wikiResult}`, 'bot', true);
    speakJARVIS(wikiResult);
    return;
  }

  // C. Envio Padrão para Groq AI em Modo Ultra Rápido (LLaMA 3 8B)
  let userDisplayHtml = escapeHTML(text);
  if (attachedImageBase64) {
    userDisplayHtml += `<br><img src="${attachedImageBase64}" style="max-width: 200px; border-radius: 6px; margin-top: 8px; border: 1px solid #00ffcc;">`;
  }
  appendCustomMessage(userDisplayHtml, 'user', true);

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'jarv-msg jarv-msg-bot';
  loadingDiv.innerHTML = `<span class="jarv-code">[J.A.R.V.I.S.]</span> Processando em Alta Velocidade...`;
  msgArea.appendChild(loadingDiv);
  msgArea.scrollTop = msgArea.scrollHeight;

  try {
    let promptInstruction = text;
    if (lowerText.includes("slide")) {
      promptInstruction += "\n\n(Aviso de Formatação: Monte uma apresentação de slides estruturada com Título, Slide 1, Slide 2, etc.)";
    } else if (lowerText.includes("documento") || lowerText.includes("relatório") || lowerText.includes("word")) {
      promptInstruction += "\n\n(Aviso de Formatação: Monte um documento formal estruturado com introdução, tópicos e conclusão.)";
    } else if (lowerText.includes("vídeo") || lowerText.includes("video")) {
      promptInstruction += "\n\n(Aviso de Formatação: Crie um Roteiro de Vídeo com Cenas, Prompt Visual de IA e Narração do Locutor.)";
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: ULTRA_FAST_MODEL,
        messages: [
          {
            role: "system",
            content: "Você é o J.A.R.V.I.S., uma IA avançada e super rápida. Responda com altíssima qualidade, precisão e eficiência."
          },
          { role: "user", content: promptInstruction }
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
      appendMessage(`Erro no núcleo de IA: ${data.error ? data.error.message : 'Instabilidade temporária.'}`, 'system', true);
    }
  } catch (err) {
    if (msgArea.contains(loadingDiv)) msgArea.removeChild(loadingDiv);
    appendMessage(`Erro de Conexão: ${err.message}`, 'system', true);
  }
}

// Renderização de Mensagens com Botões Inteligentes de Download (Slides e Word)
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
      htmlContent += `
        <div style="margin-top: 10px; display: flex; gap: 8px;">
          <button class="btn-send" style="padding: 5px 10px; font-size: 0.8rem;" onclick="downloadAsFile('apresentacao_slides.md', window['${uniqueId}'])">
            📥 Baixar Slides (.md)
          </button>
          <button class="btn-send" style="padding: 5px 10px; font-size: 0.8rem; background: #0088cc;" onclick="downloadAsWord('apresentacao_slides.doc', window['${uniqueId}'])">
            📄 Baixar em Word (.doc)
          </button>
        </div>`;
    } else if (lower.includes('documento') || lower.includes('relatório') || lower.includes('artigo') || lower.includes('roteiro')) {
      htmlContent += `
        <div style="margin-top: 10px;">
          <button class="btn-send" style="padding: 5px 10px; font-size: 0.8rem; background: #0088cc;" onclick="downloadAsWord('documento_jarvis.doc', window['${uniqueId}'])">
            📄 Baixar Documento Word (.doc)
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

function appendCustomHtml(htmlContent, type, save = true) {
  const msgDiv = document.createElement('div');
  msgDiv.className = type === 'user' ? 'jarv-msg jarv-msg-user' : 'jarv-msg jarv-msg-bot';
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

// Uploads e Ferramentas
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
        appendMessage(`[IMAGEM CARREGADA] ${file.name}`, 'system', false);
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
    if (title.includes('Câmera') || title.includes('Imagem')) btn.onclick = () => hiddenImageInput.click();
    else if (title.includes('Anexo')) btn.onclick = () => hiddenFileInput.click();
    else if (title.includes('Voz')) btn.onclick = () => startVoiceRecognition();
  });
}

function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return alert("Navegador sem suporte a microfone.");

  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.start();

  recognition.onresult = (e) => {
    chatInput.value = e.results[0][0].transcript;
    sendMsg();
  };
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

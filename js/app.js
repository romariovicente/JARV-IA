// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD-aKfpRaNuaCpIoNZMp1IVF2RFGxSB9Oo",
  authDomain: "jarv-ia.firebaseapp.com",
  projectId: "jarv-ia",
  storageBucket: "jarv-ia.firebasestorage.app",
  messagingSenderId: "275886641350",
  appId: "1:275886641350:web:69bd0e534fb71a3a1e47c7"
};

// Inicializa Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// Elementos Globais do DOM
let msgArea;
let chatInput;
let statusEl;
let loginModal;
let userNameEl;
let logoutBtn;
let hiddenFileInput;
let hiddenImageInput;
let attachedImageBase64 = null;
let currentView = 'chat';

document.addEventListener("DOMContentLoaded", () => {
  msgArea = document.getElementById('msgArea');
  chatInput = document.getElementById('chatInput');
  statusEl = document.getElementById('jarvStatus');
  loginModal = document.getElementById('loginModal');
  userNameEl = document.getElementById('userName');
  logoutBtn = document.getElementById('logoutBtn');

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener("click", signInWithGoogle);
  if (logoutBtn) logoutBtn.addEventListener("click", signOutUser);

  auth.getRedirectResult().catch((error) => {
    console.error("Erro no redirecionamento:", error);
  });

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

  initClock();
  setupFileUploads();
  setupToolbarButtons();
});

// 1. Relógio em Tempo Real
function initClock() {
  function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const headerTimeEl = document.querySelector('header .flex.items-center span.text-sm, header .items-center div span');
    if (headerTimeEl) { headerTimeEl.textContent = timeString; }
  }
  setInterval(updateClock, 1000); 
  updateClock();
}

// 2. Configuração de Inputs de Arquivo
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
      reader.onload = function(uploadEvent) {
        attachedImageBase64 = uploadEvent.target.result;
        appendMessage(`[BUFFER VISUAL] Imagem carregada: ${file.name} (${(file.size / 1024).toFixed(1)} KB).`, 'system');
        chatInput.placeholder = `Comando sobre a imagem...`; 
        chatInput.focus();
      };
      reader.readAsDataURL(file);
    }
  });

  hiddenFileInput = document.createElement('input');
  hiddenFileInput.type = 'file'; 
  hiddenFileInput.style.display = 'none';
  document.body.appendChild(hiddenFileInput);
  
  hiddenFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      appendMessage(`[BUFFER ARQUIVO] Anexo carregado: ${file.name} (${(file.size / 1024).toFixed(1)} KB).`, 'system');
      chatInput.value = `[Arquivo: ${file.name}] `; 
      chatInput.focus();
    }
  });
}

// 3. Botões da Barra Inferior
function setupToolbarButtons() {
  const actionButtons = document.querySelectorAll('.action-toolbar button, .tool-btn');
  actionButtons.forEach((btn) => {
    const title = btn.getAttribute('title') || '';
    if (title.includes('Câmera') || title.includes('Imagem')) {
      btn.onclick = () => hiddenImageInput.click();
    } else if (title.includes('Anexo')) {
      btn.onclick = () => hiddenFileInput.click();
    } else if (title.includes('Voz')) {
      btn.onclick = () => startVoiceRecognition();
    } else if (title.includes('Buscar')) {
      btn.onclick = () => {
        appendMessage("[SISTEMA] Pesquisa Web ativada.", 'system');
        chatInput.value = "[Pesquisa Web] ";
        chatInput.focus();
      };
    } else if (title.includes('Configurações')) {
      btn.onclick = () => alert("Painel de Configurações em desenvolvimento.");
    }
  });
}

// 4. Função de Navegação do Menu Lateral
function switchView(viewName) {
  const mainContent = document.querySelector('.jarv-main-content');
  const msgArea = document.getElementById('msgArea');
  const navItems = document.querySelectorAll('.jarv-nav-item');

  navItems.forEach(item => item.classList.remove('active'));
  const activeNavItem = Array.from(navItems).find(item => item.textContent.trim().toLowerCase() === viewName.toLowerCase());
  if (activeNavItem) activeNavItem.classList.add('active');

  if (!mainContent) { console.error("Elemento '.jarv-main-content' não encontrado."); return; }

  if (viewName === 'terminal' || viewName === 'chat') {
    if (msgArea) msgArea.style.display = 'block';
    const dynamicView = document.getElementById('dynamicView');
    if (dynamicView) dynamicView.remove();
    currentView = 'chat';
  } else {
    if (msgArea) msgArea.style.display = 'none';
    let dynamicView = document.getElementById('dynamicView');
    if (!dynamicView) {
      dynamicView = document.createElement('div');
      dynamicView.id = 'dynamicView';
      dynamicView.style.cssText = 'padding: 20px; color: #00ffcc; font-family: monospace; height: 100%; overflow-y: auto;';
      mainContent.appendChild(dynamicView);
    }
    let contentHtml = '';
    switch (viewName.toLowerCase()) {
      case 'dashboard': contentHtml = `<h2>[DASHBOARD]</h2><p>Métricas do sistema, status da API Groq e Firebase Firestore.</p>`; break;
      case 'agentes': contentHtml = `<h2>[AGENTES NEURAIS]</h2><p>Gerenciamento de Agentes: Model Router, Vision Analyzer, Slide Generator.</p>`; break;
      case 'memória': contentHtml = `<h2>[MEMÓRIA DE LONGO PRAZO]</h2><p>Histórico de conversas e arquivos em buffer.</p>`; break;
      case 'pcg': contentHtml = `<h2>[PCG - PROTOCOLO DE CONTROLE]</h2><p>Ferramentas de automação e scripts de sistema.</p>`; break;
      default: contentHtml = `<p>Visualização não definida.</p>`;
    }
    dynamicView.innerHTML = contentHtml;
    currentView = viewName;
  }
}

// 5. Comandos por Voz Inteligentes (Aguarda término e envia automático)
function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { 
    alert("Seu navegador não suporta reconhecimento de voz."); 
    return; 
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = true;

  let finalTranscript = '';

  recognition.onstart = () => {
    appendMessage("[MIC] Ouvindo... Pode falar sua pergunta com calma, estou aguardando você terminar.", 'system');
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    chatInput.value = finalTranscript || interimTranscript;
  };

  recognition.onerror = (e) => {
    if (e.error !== 'no-speech') {
      appendMessage(`[MIC] Erro de áudio: ${e.error}`, 'system');
    }
  };

  recognition.onend = () => {
    if (finalTranscript.trim() !== '') {
      chatInput.value = finalTranscript;
      appendMessage(`[MIC] Pergunta concluída. Enviando para o JARV...`, 'system');
      sendMsg();
    } else {
      appendMessage(`[MIC] Nenhuma fala detectada. Clique no microfone novamente quando quiser falar.`, 'system');
    }
  };

  recognition.start();
}

// Login via Redirecionamento
function signInWithGoogle() {
  auth.signInWithRedirect(provider).catch((error) => {
    console.error("Erro no login:", error); 
    alert("Erro ao realizar login: " + error.message);
  });
}

// Logout
function signOutUser() { auth.signOut(); }

// Envio de Mensagem
async function sendMsg() {
  if (currentView !== 'chat') switchView('chat');
  if (!chatInput) chatInput = document.getElementById('chatInput');
  if (!msgArea) msgArea = document.getElementById('msgArea');

  const text = chatInput.value.trim(); 
  if (!text && !attachedImageBase64) return;

  let userDisplayHtml = escapeHTML(text);
  if (attachedImageBase64) { 
    userDisplayHtml += `<br><img src="${attachedImageBase64}" style="max-width: 200px; border-radius: 6px; margin-top: 8px; border: 1px solid #00ffcc;">`; 
  }
  appendCustomMessage(userDisplayHtml, 'user'); 
  chatInput.value = '';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'jarv-msg jarv-msg-bot';
  loadingDiv.innerHTML = `<span class="jarv-code">[JARV]</span> Processando...`;
  msgArea.appendChild(loadingDiv); 
  msgArea.scrollTop = msgArea.scrollHeight;

  try {
    let messageContent = text || "Analise esta imagem.";
    if (attachedImageBase64) {
      messageContent = `[Imagem Anexada] ${text}`;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer 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" },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile", // <-- GARANTIDO E ATIVO NA GROQ
        messages: [
          { role: "system", content: "Você é o JARV, IA assistente em terminal Cyberpunk/Kali." },
          { role: "user", content: messageContent }
        ],
        max_tokens: 1024
      })
    });
    const data = await response.json();
    if (msgArea.contains(loadingDiv)) msgArea.removeChild(loadingDiv);
    attachedImageBase64 = null; 
    chatInput.placeholder = "Digite um comando...";
    if (data.choices && data.choices[0] && data.choices[0].message) { 
      appendMessage(data.choices[0].message.content, 'bot'); 
    } else if (data.error) { 
      appendMessage(`Erro: ${data.error.message}`, 'system'); 
    } else { 
      appendMessage("Erro: Resposta inesperada.", 'system'); 
    }
  } catch (err) {
    if (msgArea.contains(loadingDiv)) msgArea.removeChild(loadingDiv);
    appendMessage(`Erro de conexão: ${err.message}`, 'system'); 
    attachedImageBase64 = null;
  }
}

function appendMessage(text, type) {
  if (!msgArea) msgArea = document.getElementById('msgArea'); 
  const msgDiv = document.createElement('div');
  if (type === 'user') { 
    msgDiv.className = 'jarv-msg jarv-msg-user'; 
    msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${escapeHTML(text)}`; 
  } else if (type === 'bot') { 
    msgDiv.className = 'jarv-msg jarv-msg-bot'; 
    if (text.includes('Slide') || text.includes('Tópico') || text.includes('Pontos-Chave')) { 
      msgDiv.innerHTML = `<span class="jarv-code">[JARV - SLIDE DECK]</span><div class="jarv-slide-card" style="background: rgba(0,20,40,0.8); border: 1px solid #00ffcc; padding: 15px; border-radius: 8px; margin-top: 10px;">${formatMarkdown(text)}</div>`; 
    } else { 
      msgDiv.innerHTML = `<span class="jarv-code">[JARV]</span> ${formatMarkdown(text)}`; 
    } 
  } else { 
    msgDiv.className = 'jarv-msg jarv-msg-system'; 
    msgDiv.innerHTML = `<span class="jarv-code">[SYSTEM]</span> ${escapeHTML(text)}`; 
  }
  msgArea.appendChild(msgDiv); 
  msgArea.scrollTop = msgArea.scrollHeight;
}

function appendCustomMessage(htmlContent, type) {
  if (!msgArea) msgArea = document.getElementById('msgArea'); 
  const msgDiv = document.createElement('div');
  msgDiv.className = 'jarv-msg jarv-msg-user'; 
  msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${htmlContent}`;
  msgArea.appendChild(msgDiv); 
  msgArea.scrollTop = msgArea.scrollHeight;
}

function escapeHTML(str) { 
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); 
}

function formatMarkdown(text) { 
  let formatted = escapeHTML(text); 
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #00ffcc;">$1</strong>'); 
  return formatted;
}

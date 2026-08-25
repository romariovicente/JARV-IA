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
let currentView = 'chat'; // Variável para rastrear a visualização atual

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
    console.error("Erro no redirecionamento de login:", error);
  });

  auth.onAuthStateChanged((user) => {
    if (user) {
      const name = user.displayName || user.email;
      if (userNameEl) userNameEl.textContent = name;
      if (statusEl) statusEl.textContent = `Authenticated (${name})`;
      if (loginModal) loginModal.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "inline-block";
      console.log("Usuário autenticado:", name);
    } else {
      if (userNameEl) userNameEl.textContent = "Visitante";
      if (statusEl) statusEl.textContent = "Awaiting Authentication";
      if (loginModal) loginModal.style.display = "flex";
      if (logoutBtn) logoutBtn.style.display = "none";
      console.log("Sessão encerrada.");
    }
  });

  // Inicializa os recursos interativos
  initClock();
  setupFileUploads();
  setupToolbarButtons();
});

// 1. Relógio em Tempo Real (segundo a segundo)
function initClock() {
  function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Seleciona o elemento do relógio na barra superior (ex: "09:53")
    const headerTimeEl = document.querySelector('header .flex.items-center span.text-sm, header .items-center div span');
    if (headerTimeEl) {
      headerTimeEl.textContent = timeString;
    }
  }
  setInterval(updateClock, 1000);
  updateClock(); // Chamada inicial
}

// 2. Configuração de Inputs de Arquivo (Imagem e Clipe)
function setupFileUploads() {
  // Input para imagens visuais (ícone esquerdo)
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
        appendMessage(`[BUFFER VISUAL] Imagem carregada: ${file.name} (${(file.size / 1024).toFixed(1)} KB). Escreva um comando sobre ela...`, 'system');
        chatInput.placeholder = `Comando sobre a imagem...`;
        chatInput.focus();
      };
      reader.readAsDataURL(file);
    }
  });

  // Input para arquivos gerais (clipe)
  hiddenFileInput = document.createElement('input');
  hiddenFileInput.type = 'file';
  hiddenFileInput.style.display = 'none';
  document.body.appendChild(hiddenFileInput);

  hiddenFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      appendMessage(`[BUFFER ARQUIVO] Anexo carregado: ${file.name} (${(file.size / 1024).toFixed(1)} KB).`, 'system');
      chatInput.value = `[Arquivo Anexado: ${file.name}] `;
      chatInput.focus();
    }
  });
}

// 3. Atribui funcionalidade a TODOS os botões da barra inferior
function setupToolbarButtons() {
  const actionButtons = document.querySelectorAll('.jarv-input-actions button, .jarv-footer-actions button');
  
  actionButtons.forEach((btn, index) => {
    const icon = btn.querySelector('i, svg');
    const iconClass = icon ? icon.className : '';

    // Botão 1: Imagem (Visão)
    if (iconClass.includes('image') || index === 0) {
      btn.title = "Enviar Imagem para Análise Visual";
      btn.onclick = () => hiddenImageInput.click();
    }
    // Botão 2: Clipe (Anexo)
    else if (iconClass.includes('paperclip') || index === 1) {
      btn.title = "Anexar Arquivo";
      btn.onclick = () => hiddenFileInput.click();
    }
    // Botão 3: Microfone (Voz)
    else if (iconClass.includes('microphone') || index === 2) {
      btn.title = "Comando por Voz";
      btn.onclick = () => startVoiceRecognition();
    }
    // Botão 4: Lupa (Pesquisa)
    else if (iconClass.includes('search') || index === 3) {
      btn.title = "Pesquisa Web";
      btn.onclick = () => {
        appendMessage("[SISTEMA] Modo de pesquisa web ativado.", 'system');
        chatInput.value = "[Pesquisa Web] ";
        chatInput.focus();
      };
    }
    // Botão 5: Engrenagem (Configurações)
    else if (iconClass.includes('cog') || iconClass.includes('settings') || index === 4) {
      btn.title = "Configurações";
      btn.onclick = () => alert("Painel de Configurações em desenvolvimento.");
    }
  });
}

// Reconhecimento de Voz
function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { alert("Seu navegador não suporta reconhecimento de voz."); return; }
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.onstart = () => appendMessage("[MIC] Ouvindo comando...", 'system');
  recognition.onresult = (event) => {
    chatInput.value = event.results[0][0].transcript;
    chatInput.focus();
    // sendMsg(); // Opcional: enviar automaticamente
  };
  recognition.onerror = (e) => appendMessage(`Erro de voz: ${e.error}`, 'system');
  recognition.start();
}

// Login Google via Redirecionamento
function signInWithGoogle() {
  auth.signInWithRedirect(provider).catch((error) => {
    console.error("Erro no login:", error);
    alert("Erro ao realizar login: " + error.message);
  });
}

// Logout
function signOutUser() {
  auth.signOut().then(() => {
    console.log("Sessão encerrada.");
  });
}

// 4. Função CORRIGIDA para alternar entre as abas do menu lateral
function switchView(viewName) {
  const mainContent = document.querySelector('.jarv-main-content'); // Container principal
  const msgArea = document.getElementById('msgArea'); // Área do chat
  const navItems = document.querySelectorAll('.jarv-nav-item'); // Itens do menu lateral

  // Remove a classe 'active' de todos os itens e adiciona ao clicado
  navItems.forEach(item => item.classList.remove('active'));
  const activeNavItem = Array.from(navItems).find(item => item.textContent.trim().toLowerCase() === viewName.toLowerCase());
  if (activeNavItem) activeNavItem.classList.add('active');

  // Verifica se o container principal existe
  if (!mainContent) {
    console.error("Elemento '.jarv-main-content' não encontrado no DOM.");
    return;
  }

  // Garante que a área do chat original esteja visível se voltarmos para 'terminal'
  if (viewName === 'terminal' || viewName === 'chat') {
    if (msgArea) msgArea.style.display = 'block';
    // Remove qualquer conteúdo de visualização dinâmica
    const dynamicView = document.getElementById('dynamicView');
    if (dynamicView) dynamicView.remove();
    console.log("Visão alterada para: Terminal / Chat");
    currentView = 'chat';
  } 
  // Para outras visualizações (Dashboard, Agentes, etc.)
  else {
    // Oculta o chat
    if (msgArea) msgArea.style.display = 'none';
    
    // Cria ou atualiza a área de visualização dinâmica
    let dynamicView = document.getElementById('dynamicView');
    if (!dynamicView) {
      dynamicView = document.createElement('div');
      dynamicView.id = 'dynamicView';
      dynamicView.style.cssText = 'padding: 20px; color: #00ffcc; font-family: monospace; height: 100%; overflow-y: auto;';
      mainContent.appendChild(dynamicView);
    }
    
    // Define o conteúdo baseado na aba clicada
    let contentHtml = '';
    switch (viewName.toLowerCase()) {
      case 'dashboard': contentHtml = `<h2>[DASHBOARD]</h2><p>Métricas do sistema, status da API Groq e Firebase Firestore.</p>`; break;
      case 'agentes': contentHtml = `<h2>[AGENTES NEURAIS]</h2><p>Gerenciamento de Agentes: Model Router, Vision Analyzer, Slide Generator.</p>`; break;
      case 'memória': contentHtml = `<h2>[MEMÓRIA DE LONGO PRAZO]</h2><p>Histórico de conversas e arquivos em buffer.</p>`; break;
      case 'pcg': contentHtml = `<h2>[PCG - PROTOCOLO DE CONTROLE]</h2><p>Ferramentas de automação e scripts de sistema.</p>`; break;
      default: contentHtml = `<p>Visualização não definida.</p>`;
    }
    dynamicView.innerHTML = contentHtml;
    console.log(`Visão alterada para: ${viewName}`);
    currentView = viewName;
  }
}

// Envio de Mensagem Multimodal (Visão + Chat)
async function sendMsg() {
  // Garante que, ao enviar uma mensagem, voltemos para a visão de chat
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
  loadingDiv.innerHTML = `<span class="jarv-code">[JARV]</span> Processando em redes neurais...`;
  msgArea.appendChild(loadingDiv);
  msgArea.scrollTop = msgArea.scrollHeight;

  try {
    let messageContent = [];
    if (attachedImageBase64) {
      messageContent.push({ type: "image_url", image_url: { url: attachedImageBase64 } });
    }
    messageContent.push({ type: "text", text: text || "Analise esta imagem e responda." });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer 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" },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          { role: "system", content: "Você é o JARV, IA assistente avançada em terminal Cyberpunk / Kali Linux. Responda com precisão, analise imagens e estruture slides em cartões limpos quando solicitado." },
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
      appendMessage(`Erro técnico: ${data.error.message}`, 'system');
    } else {
      appendMessage("Erro: Resposta inesperada do servidor.", 'system');
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
  if (type === 'user') { msgDiv.className = 'jarv-msg jarv-msg-user'; msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${escapeHTML(text)}`; }
  else if (type === 'bot') { msgDiv.className = 'jarv-msg jarv-msg-bot'; if (text.includes('Slide') || text.includes('Tópico') || text.includes('Pontos-Chave')) { msgDiv.innerHTML = `<span class="jarv-code">[JARV - SLIDE DECK]</span><div class="jarv-slide-card" style="background: rgba(0,20,40,0.8); border: 1px solid #00ffcc; padding: 15px; border-radius: 8px; margin-top: 10px;">${formatMarkdown(text)}</div>`; } else { msgDiv.innerHTML = `<span class="jarv-code">[JARV]</span> ${formatMarkdown(text)}`; } }
  else { msgDiv.className = 'jarv-msg jarv-msg-system'; msgDiv

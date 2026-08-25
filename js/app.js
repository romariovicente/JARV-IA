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

  // Trata o retorno do login por redirecionamento
  auth.getRedirectResult().catch((error) => {
    console.error("Erro no redirecionamento de login:", error);
    alert("Erro ao realizar login: " + error.message);
  });

  // Monitora o estado de Autenticação do Firebase
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

  setupFileUploads();
  setupToolbarButtons();
});

// 1. Configuração de Inputs de Arquivo e Imagem
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

// 2. Botões da Barra Inferior
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
    }
  });
}

// 3. Comandos por Voz Inteligentes
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
    appendMessage("[MIC] Ouvindo... Pode falar sua pergunta com calma.", 'system');
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
      appendMessage(`[MIC] Nenhuma fala detectada.`, 'system');
    }
  };

  recognition.start();
}

// Login Google via Redirecionamento
function signInWithGoogle() {
  auth.signInWithRedirect(provider).catch((error) => {
    console.error("Erro no login:", error);
    alert("Erro ao realizar login: " + error.message);
  });
}

// Logout do Usuário
function signOutUser() {
  auth.signOut().then(() => {
    console.log("Sessão encerrada com sucesso.");
  });
}

// Envio de Mensagem para a IA (Groq Router com modelo funcional)
async function sendMsg() {
  if (!chatInput) chatInput = document.getElementById('chatInput');
  if (!msgArea) msgArea = document.getElementById('msgArea');

  const text = chatInput.value.trim();
  if (!text && !attachedImageBase64) return;

  let userDisplayHtml = escapeHTML(text);
  if (attachedImageBase64) { 
    userDisplayHtml += `<br><img src="${attachedImageBase64}" style="max-width: 200px; border-radius: 6px; margin-top: 8px; border: 1px solid #00ffcc;">`; 
  }

  // Renderiza mensagem do usuário (com imagem se houver)
  appendCustomMessage(userDisplayHtml, 'user');
  chatInput.value = '';

  // Elemento visual de carregamento
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'jarv-msg jarv-msg-bot';
  loadingDiv.innerHTML = `<span class="jarv-code">[JARV]</span> Processando comando...`;
  msgArea.appendChild(loadingDiv);
  msgArea.scrollTop = msgArea.scrollHeight;

  try {
    let messageContent = text || "Olá!";
    if (attachedImageBase64) {
      messageContent = `[Imagem Anexada] ${text}`;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b", // Modelo testado e funcional na sua conta
        messages: [
          {
            role: "system",
            content: "Você é o JARV, uma IA assistente integrada em um terminal Cyberpunk / Kali Linux. Seja preciso, direto e solícito."
          },
          {
            role: "user",
            content: messageContent
          }
        ]
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

// Renderiza mensagens padrão
function appendMessage(text, type) {
  if (!msgArea) msgArea = document.getElementById('msgArea');
  const msgDiv = document.createElement('div');

  if (type === 'user') {
    msgDiv.className = 'jarv-msg jarv-msg-user';
    msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${escapeHTML(text)}`;
  } else if (type === 'bot') {
    msgDiv.className = 'jarv-msg jarv-msg-bot';
    msgDiv.innerHTML = `<span class="jarv-code">[JARV]</span> ${formatMarkdown(text)}`;
  } else {
    msgDiv.className = 'jarv-msg jarv-msg-system';
    msgDiv.innerHTML = `<span class="jarv-code">[SYSTEM]</span> ${escapeHTML(text)}`;
  }

  msgArea.appendChild(msgDiv);
  msgArea.scrollTop = msgArea.scrollHeight;
}

// Renderiza mensagens customizadas (com HTML, ex: visualização de imagem)
function appendCustomMessage(htmlContent, type) {
  if (!msgArea) msgArea = document.getElementById('msgArea');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'jarv-msg jarv-msg-user';
  msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${htmlContent}`;
  msgArea.appendChild(msgDiv);
  msgArea.scrollTop = msgArea.scrollHeight;
}

// Navegação do Menu Lateral
function switchView(viewName) {
  const items = document.querySelectorAll('.jarv-nav-item');
  items.forEach(item => item.classList.remove('active'));

  const activeBtn = document.querySelector(`.jarv-nav-item[data-view="${viewName}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  console.log(`Visão alterada para: ${viewName}`);
}

// Reiniciar Terminal
function resetSystem() {
  if (!msgArea) msgArea = document.getElementById('msgArea');
  msgArea.innerHTML = `
    <div class="jarv-msg jarv-msg-system">
      <span class="jarv-code">[JARV]</span> Sistema inicializado. Arquitetura: Frontend → Backend → Model Router. Aguardando comandos.
    </div>
  `;
}

// Função de escape para evitar injeção de scripts (XSS)
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Formatação básica de texto (Negrito e Quebras de linha)
function formatMarkdown(text) {
  let formatted = escapeHTML(text);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

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
  });

  // Monitora o estado de Autenticação
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

  // Inicializa recursos interativos
  initClock();
  setupFileUploads();
  setupToolbarButtons();
});

// 1. Relógio em tempo real (segundo a segundo)
function initClock() {
  function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Seleciona o elemento do relógio na barra superior. Vamos mirar no elemento que contém a hora estática.
    const headerTimeEl = document.querySelector('header .items-center .text-sm'); // Ajuste este seletor se necessário
    if (headerTimeEl) {
      headerTimeEl.textContent = timeString;
    } else {
      // Fallback: procura pelo elemento que contém o padrão "09:53" e substitui
      const allSpans = document.querySelectorAll('span');
      allSpans.forEach(span => {
        if (span.textContent.match(/^\d{2}:\d{2}$/) || span.textContent === '09:53') {
          span.textContent = timeString;
        }
      });
    }
  }
  setInterval(updateClock, 1000); // Atualiza a cada 1000ms (1 segundo)
  updateClock(); // Chama imediatamente para não esperar o primeiro intervalo
}

// 2. Configuração de Inputs de Arquivo (Imagem e Clipe)
function setupFileUploads() {
  // Input para imagens visuais (botão esquerdo da barra)
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
        appendMessage(`[BUFFER VISUAL] Imagem carregada: ${file.name} (${(file.size / 1024).toFixed(1)} KB). Escreva seu comando sobre a imagem...`, 'system');
        chatInput.value = "[Análise de Imagem Visual] ";
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
  const actionButtons = document.querySelectorAll('.jarv-input-actions button, .jarv-footer-actions button, .flex.items-center.gap-3 button');
  
  actionButtons.forEach((btn, index) => {
    // Identifica o botão pelo ícone ou pela ordem
    const icon = btn.querySelector('i, svg');
    const iconClass = icon ? icon.className : '';

    // Botão 1: Imagem (Visão)
    if (iconClass.includes('image') || index === 0) {
      btn.onclick = () => hiddenImageInput.click();
      btn.title = "Enviar Imagem para Análise Visual";
    }
    // Botão 2: Clipe (Anexo)
    else if (iconClass.includes('paperclip') || index === 1) {
      btn.onclick = () => hiddenFileInput.click();
      btn.title = "Anexar Arquivo";
    }
    // Botão 3: Microfone (Voz)
    else if (iconClass.includes('microphone') || index === 2) {
      btn.onclick = () => startVoiceRecognition();
      btn.title = "Comando por Voz";
    }
    // Botão 4: Lupa (Pesquisa)
    else if (iconClass.includes('search') || index === 3) {
      btn.onclick = () => {
        appendMessage("[SISTEMA] Modo de pesquisa web ativado.", 'system');
        chatInput.value = "[Pesquisa Web] ";
        chatInput.focus();
      };
      btn.title = "Pesquisa Web";
    }
    // Botão 5: Engrenagem (Configurações)
    else if (iconClass.includes('cog') || iconClass.includes('settings') || index === 4) {
      btn.onclick = () => alert("Painel de Configurações em desenvolvimento.");
      btn.title = "Configurações";
    }
  });
}

// Comando por Voz (Microfone)
function startVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert("Seu navegador não suporta reconhecimento de voz.");
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => appendMessage("[MIC] Ouvindo comando...", 'system');
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    chatInput.focus();
    // Opcional: enviar automaticamente após reconhecer
    // sendMsg();
  };
  recognition.onerror = (event) => appendMessage(`Erro de voz: ${event.error}`, 'system');
  recognition.start();
}

// Login via Redirecionamento (Corrige o erro 400)
function signInWithGoogle() {
  console.log("Iniciando login com redirecionamento...");
  auth.signInWithRedirect(provider).catch((error) => {
    console.error("Erro no login:", error);
    alert("Falha ao iniciar login: " + error.message);
  });
}

// Logout
function signOutUser() {
  auth.signOut().then(() => {
    console.log("Sessão encerrada.");
  }).catch((error) => {
    console.error("Erro ao sair:", error);
  });
}

// Envio de Mensagem para a IA (Suporte a Visão + Chat)
async function sendMsg() {
  if (!chatInput) chatInput = document.getElementById('chatInput');
  if (!msgArea) msgArea = document.getElementById('msgArea');

  const text = chatInput.value.trim();
  if (!text && !attachedImageBase64) return;

  // Exibe a mensagem do usuário (com miniatura se for imagem)
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
    // Monta o payload multimodal (texto + imagem se houver)
    let messageContent = [];
    if (attachedImageBase64) {
      messageContent.push({
        type: "image_url",
        image_url: { url: attachedImageBase64 }
      });
    }
    messageContent.push({
      type: "text",
      text: text || "Analise esta imagem e responda."
    });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview", // Modelo com suporte a visão
        messages: [
          {
            role: "system",
            content: "Você é o JARV, uma IA assistente avançada integrada em um terminal Cyberpunk / Kali Linux. Analise imagens com precisão (capas de livros, códigos, diagramas) e forneça resumos completos, autores, temas e curiosidades. Quando o usuário pedir slides, estruture em tópicos limpos."
          },
          {
            role: "user",
            content: messageContent
          }
        ],
        max_tokens: 1024
      })
    });

    const data = await response.json();
    if (msgArea.contains(loadingDiv)) msgArea.removeChild(loadingDiv);

    // Limpa o buffer de imagem após o envio
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

// Renderiza mensagens normais
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

// Renderiza mensagens customizadas (HTML embutido)
function appendCustomMessage(htmlContent, type) {
  if (!msgArea) msgArea = document.getElementById('msgArea');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'jarv-msg jarv-msg-user';
  msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${htmlContent}`;
  msgArea.appendChild(msgDiv);
  msgArea.scrollTop = msgArea.scrollHeight;
}

// Reiniciar Terminal
function resetSystem() {
  if (!msgArea) msgArea = document.getElementById('msgArea');
  msgArea.innerHTML = `
    <div class="jarv-msg jarv-msg-system">
      <span class="jarv-code">[JARV]</span> Sistema reiniciado. Arquitetura: Frontend → Backend → Model Router. Aguardando comandos.
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

// Formatação limpa
function formatMarkdown(text) {
  let formatted = escapeHTML(text);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #00ffcc;">$1</strong>');
  formatted = formatted.replace(/\|/g, ' &bull; ');

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
let currentView = 'terminal';

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
    } else {
      if (userNameEl) userNameEl.textContent = "Visitante";
      if (statusEl) statusEl.textContent = "Awaiting Authentication";
      if (loginModal) loginModal.style.display = "flex";
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  });

  // Inicializa recursos interativos
  initClock();
  setupFileUploads();
  setupToolbarButtons();
  setupSidebarNavigation();
});

// Relógio em tempo real sincronizado com o sistema
function initClock() {
  const updateClock = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Procura por elementos que exibem hora na barra superior
    const headerElements = document.querySelectorAll('header span, .flex.items-center span, header div');
    headerElements.forEach(el => {
      // Identifica se o elemento parece um relógio (contém formato de hora ou substitui o texto estático)
      if (el.textContent.match(/\d{2}:\d{2}/) && !el.textContent.includes('Authenticated')) {
        el.textContent = timeString;
      }
    });
  };
  setInterval(updateClock, 1000);
  updateClock();
}

// Configura inputs de arquivos (Imagem e Documento)
function setupFileUploads() {
  // Input para imagens visuais
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
        appendMessage(`[BUFFER VISUAL] Imagem carregada: ${file.name} (${(file.size / 1024).toFixed(1)} KB). Digite sua pergunta sobre ela.`, 'system');
        chatInput.placeholder = `Escreva um comando sobre a imagem...`;
        chatInput.focus();
      };
      reader.readAsDataURL(file);
    }
  });

  // Input para arquivos gerais (Clipe)
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

// Atribui ações funcionais para todos os botões da barra inferior
function setupToolbarButtons() {
  const buttons = document.querySelectorAll('.jarv-input-bar button, .flex.items-center.gap-4 button, footer button, .flex.gap-3 button');
  
  buttons.forEach((btn, index) => {
    const icon = btn.querySelector('i, svg');
    const iconClass = icon ? icon.className : btn.innerHTML;

    // Identifica o tipo de botão pelo ícone ou posição
    if (iconClass.includes('image') || index === 0) {
      btn.title = "Enviar Imagem (Visão Computacional)";
      btn.onclick = () => hiddenImageInput.click();
    } 
    else if (iconClass.includes('paperclip') || index === 1) {
      btn.title = "Anexar Arquivo";
      btn.onclick = () => hiddenFileInput.click();
    } 
    else if (iconClass.includes('microphone') || index === 2) {
      btn.title = "Comando por Voz";
      btn.onclick = () => startVoiceRecognition();
    } 
    else if (iconClass.includes('search') || index === 3) {
      btn.title = "Pesquisa Web Avançada";
      btn.onclick = () => {
        appendMessage("[SISTEMA] Modo de Pesquisa Web ativado. O JARV cruzará dados em tempo real.", 'system');
        chatInput.value = "[Pesquisa Web] ";
        chatInput.focus();
      };
    } 
    else if (iconClass.includes('cog') || iconClass.includes('settings') || index === 4) {
      btn.title = "Configurações do Sistema";
      btn.onclick = () => openSettingsModal();
    }
  });
}

// Reconhecimento de Voz (Microfone)
function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Seu navegador não suporta reconhecimento de voz.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.onstart = () => appendMessage("[MIC] Ouvindo comando de voz...", 'system');
  recognition.onresult = (event) => {
    chatInput.value = event.results[0][0].transcript;
    chatInput.focus();
  };
  recognition.onerror = (e) => appendMessage(`[MIC] Erro: ${e.error}`, 'system');
  recognition.start();
}

// Modal de Configurações
function openSettingsModal() {
  let modal = document.getElementById('settingsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'settingsModal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:9999;';
    modal.innerHTML = `
      <div style="background:#0a192f; border:1px solid #00ffcc; padding:25px; border-radius:10px; width:400px; color:#fff; font-family:monospace;">
        <h3 style="color:#00ffcc; margin-top:0;">[JARV - CONFIGURAÇÕES]</h3>
        <p><strong>Modelo Ativo:</strong> llama-3.2-11b-vision-preview</p>
        <p><strong>Banco de Dados:</strong> Firebase Firestore (Ativo)</p>
        <p><strong>Autenticação:</strong> Google OAuth</p>
        <div style="margin-top:20px; text-align:right;">
          <button id="closeSettings" style="background:#00ffcc; color:#000; border:none; padding:8px 15px; font-weight:bold; cursor:pointer; border-radius:4px;">Fechar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('closeSettings').onclick = () => modal.style.display = 'none';
  } else {
    modal.style.display = 'flex';
  }
}

// Navegação do Menu Lateral Funcional
function setupSidebarNavigation() {
  const navItems = document.querySelectorAll('.jarv-nav-item, aside nav div, aside ul li');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(ni => ni.classList.remove('active'));
      item.classList.add('active');

      const text = item.textContent.trim().toLowerCase();
      if (text.includes('dashboard')) {
        switchView('Dashboard', '<h2 style="color:#00ffcc;">[DASHBOARD]</h2><p>Métricas de sistema, consumo de API Groq, status do Firebase e requisições ativas.</p>');
      } else if (text.includes('agentes')) {
        switchView('Agentes', '<h2 style="color:#00ffcc;">[AGENTES NEURAIS]</h2><p>Agentes disponíveis: Model Router (Groq), Vision Analyzer, Slide Generator e Customer Support (Stone/TON).</p>');
      } else if (text.includes('memória')) {
        switchView('Memória', '<h2 style="color:#00ffcc;">[MEMÓRIA DE LONGO PRAZO]</h2><p>Histórico de conversas salvas no Firestore e buffers de arquivos temporários.</p>');
      } else if (text.includes('pcg')) {
        switchView('PCG', '<h2 style="color:#00ffcc;">[PCG - PROTOCOLO DE CONTROLE]</h2><p>Ferramentas de automação, scripts de suporte e logs de auditoria.</p>');
      } else {
        // Retorna ao chat padrão
        const mainContainer = document.querySelector('.jarv-main-content, main');
        if (mainContainer && document.getElementById('msgArea')) {
          document.getElementById('msgArea').style.display = 'block';
        }
      }
    });
  });
}

function switchView(title, htmlContent) {
  if (!msgArea) msgArea = document.getElementById('msgArea');
  msgArea.style.display = 'none'; // Oculta o chat momentaneamente

  let viewContainer = document.getElementById('dynamicViewContainer');
  if (!viewContainer) {
    viewContainer = document.createElement('div');
    viewContainer.id = 'dynamicViewContainer';
    viewContainer.style.cssText = 'padding: 25px; color: #fff; font-family: monospace;';
    msgArea.parentNode.insertBefore(viewContainer, msgArea);
  }
  viewContainer.style.display = 'block';
  viewContainer.innerHTML = htmlContent;
}

// Função de envio de mensagem atualizada com suporte a visão e chat
async function sendMsg() {
  if (!chatInput) chatInput = document.getElementById('chatInput');
  if (!msgArea) msgArea = document.getElementById('msgArea');

  // Garante que se estiver em outra aba, volte para o chat
  const viewContainer = document.getElementById('dynamicViewContainer');
  if (viewContainer) viewContainer.style.display = 'none';
  if (msgArea) msgArea.style.display = 'block';

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
  loadingDiv.innerHTML = `<span class="jarv-code">[JARV]</span> Processando comando em redes neurais...`;
  msgArea.appendChild(loadingDiv);
  msgArea.scrollTop = msgArea.scrollHeight;

  try {
    let messageContent = [];
    if (attachedImageBase64) {
      messageContent.push({
        type: "image_url",
        image_url: { url: attachedImageBase64 }
      });
    }
    messageContent.push({
      type: "text",
      text: text || "Analise esta imagem em detalhes."
    });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "system",
            content: "Você é o JARV, IA assistente avançada em terminal Cyberpunk / Kali Linux. Responda com precisão, analise imagens enviadas e estruture slides em cartões limpos quando solicitado."
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

function resetSystem() {
  if (!msgArea) msgArea = document.getElementById('msgArea');
  msgArea.innerHTML = `
    <div class="jarv-msg jarv-msg-system">
      <span class="jarv-code">[JARV]</span> Sistema reiniciado. Arquitetura: Frontend → Backend → Model Router. Aguardando comandos.
    </div>
  `;
}

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

function formatMarkdown(text) {
  let formatted = escapeHTML(text);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #00ffcc;">$1</strong>');
  formatted = formatted.replace(/\|/g, ' &bull; ');
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

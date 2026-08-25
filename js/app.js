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

  // Configura o input de arquivo oculto para anexos
  setupFileUpload();
});

// Configura o botão de anexo para abrir o explorador de arquivos
function setupFileUpload() {
  hiddenFileInput = document.createElement('input');
  hiddenFileInput.type = 'file';
  hiddenFileInput.style.display = 'none';
  document.body.appendChild(hiddenFileInput);

  hiddenFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      appendMessage(`Arquivo carregado para o buffer: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'system');
      chatInput.value = `[Arquivo Anexado: ${file.name}] `;
      chatInput.focus();
    }
  });

  // Seleciona o botão de anexo na barra inferior (segundo ícone - clipe)
  const actionButtons = document.querySelectorAll('.jarv-footer-actions button, .jarv-input-actions button, .fa-paperclip, svg');
  // Procura pelo botão que contém o ícone de anexo/papel de parede ou adiciona ao segundo botão da barra inferior
  const toolbarButtons = document.querySelectorAll('.flex.items-center.gap-3 button, .flex button, footer button');
  
  // Forma segura: adiciona listener em todos os botões de ação da barra inferior que não sejam envio
  const allButtons = document.querySelectorAll('button');
  allButtons.forEach(btn => {
    if (btn.querySelector('.fa-paperclip') || btn.innerHTML.includes('paperclip') || btn.title?.toLowerCase().includes('anexo') || btn.classList.contains('fa-paperclip')) {
      btn.addEventListener('click', () => hiddenFileInput.click());
    }
  });

  // Fallback direto pelo container de ícones se existirem na toolbar
  const iconsBar = document.querySelector('.jarv-input-bar, .flex.gap-4, .flex.items-center.gap-4');
  if (iconsBar) {
    const clipBtn = iconsBar.querySelectorAll('button')[1] || iconsBar.querySelectorAll('i')[1];
    if (clipBtn) {
      const target = clipBtn.tagName === 'I' ? clipBtn.parentElement : clipBtn;
      target.addEventListener('click', () => hiddenFileInput.click());
    }
  }
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

// Envio de Mensagem para a IA (Groq Router)
async function sendMsg() {
  if (!chatInput) chatInput = document.getElementById('chatInput');
  if (!msgArea) msgArea = document.getElementById('msgArea');

  const text = chatInput.value.trim();
  if (!text) return;

  appendMessage(text, 'user');
  chatInput.value = '';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'jarv-msg jarv-msg-bot';
  loadingDiv.innerHTML = `<span class="jarv-code">[JARV]</span> Processando comando e estruturando dados...`;
  msgArea.appendChild(loadingDiv);
  msgArea.scrollTop = msgArea.scrollHeight;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: "Você é o JARV, uma IA assistente avançada integrada em um terminal Cyberpunk / Kali Linux. Quando o usuário pedir slides, estruture o conteúdo em tópicos limpos, slides organizados com títulos, resumo e pontos-chave claros (sem usar tabelas markdown brutas com barras verticais)."
          },
          {
            role: "user",
            content: text
          }
        ]
      })
    });

    const data = await response.json();
    if (msgArea.contains(loadingDiv)) msgArea.removeChild(loadingDiv);

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
  }
}

// Renderiza mensagens na interface com suporte a Slides Visuais
function appendMessage(text, type) {
  if (!msgArea) msgArea = document.getElementById('msgArea');
  const msgDiv = document.createElement('div');

  if (type === 'user') {
    msgDiv.className = 'jarv-msg jarv-msg-user';
    msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${escapeHTML(text)}`;
  } else if (type === 'bot') {
    msgDiv.className = 'jarv-msg jarv-msg-bot';
    // Verifica se a resposta contém estrutura de slides
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

// Formatação limpa de texto
function formatMarkdown(text) {
  let formatted = escapeHTML(text);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #00ffcc;">$1</strong>');
  formatted = formatted.replace(/\|/g, ' &bull; '); // Substitui as barras chatas por marcadores bonitos
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

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
let attachedImageBase64 = null; // Armazena a imagem em Base64 para envio multimodal

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

  setupFileUpload();
});

// Configura o seletor de arquivos para converter imagem em Base64 real
function setupFileUpload() {
  hiddenFileInput = document.createElement('input');
  hiddenFileInput.type = 'file';
  hiddenFileInput.accept = 'image/*';
  hiddenFileInput.style.display = 'none';
  document.body.appendChild(hiddenFileInput);

  hiddenFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(uploadEvent) {
        attachedImageBase64 = uploadEvent.target.result; // Base64 da imagem
        appendMessage(`Imagem carregada no buffer visual: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'system');
        chatInput.placeholder = `Escreva um comando sobre a imagem anexada...`;
        chatInput.focus();
      };
      reader.readAsDataURL(file);
    }
  });

  const allButtons = document.querySelectorAll('button');
  allButtons.forEach(btn => {
    if (btn.querySelector('.fa-paperclip') || btn.innerHTML.includes('paperclip') || btn.title?.toLowerCase().includes('anexo') || btn.classList.contains('fa-paperclip')) {
      btn.addEventListener('click', () => hiddenFileInput.click());
    }
  });

  const iconsBar = document.querySelector('.jarv-input-bar, .flex.gap-4, .flex.items-center.gap-4');
  if (iconsBar) {
    const clipBtn = iconsBar.querySelectorAll('button')[1] || iconsBar.querySelectorAll('i')[1];
    if (clipBtn) {
      const target = clipBtn.tagName === 'I' ? clipBtn.parentElement : clipBtn;
      target.addEventListener('click', () => hiddenFileInput.click());
    }
  }
}

function signInWithGoogle() {
  auth.signInWithRedirect(provider).catch((error) => console.error(error));
}

function signOutUser() {
  auth.signOut();
}

// Envio de Mensagem Multimodal para a IA (Groq Vision)
async function sendMsg() {
  if (!chatInput) chatInput = document.getElementById('chatInput');
  if (!msgArea) msgArea = document.getElementById('msgArea');

  const text = chatInput.value.trim();
  if (!text && !attachedImageBase64) return;

  // Exibe a mensagem do usuário junto com miniatura se houver imagem
  let userDisplayHtml = escapeHTML(text);
  if (attachedImageBase64) {
    userDisplayHtml += `<br><img src="${attachedImageBase64}" style="max-width: 200px; border-radius: 6px; margin-top: 8px; border: 1px solid #00ffcc;">`;
  }
  appendCustomMessage(userDisplayHtml, 'user');

  chatInput.value = '';

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'jarv-msg jarv-msg-bot';
  loadingDiv.innerHTML = `<span class="jarv-code">[JARV]</span> Analisando dados visuais e processando redes neurais...`;
  msgArea.appendChild(loadingDiv);
  msgArea.scrollTop = msgArea.scrollHeight;

  try {
    // Monta o payload da mensagem (suporte a texto + imagem se anexada)
    let messageContent = [];
    
    if (attachedImageBase64) {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: attachedImageBase64
        }
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
        model: "llama-3.2-11b-vision-preview", // Modelo Groq com suporte a visão computacional
        messages: [
          {
            role: "system",
            content: "Você é o JARV, uma IA assistente avançada integrada em um terminal Cyberpunk / Kali Linux. Analise imagens enviadas com precisão (como capas de livros, códigos, diagramas) e forneça resumos completos, autores, temas e curiosidades. Quando o usuário pedir slides, estruture em tópicos limpos."
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

    // Limpa o buffer da imagem após o envio bem-sucedido
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

// Renderiza mensagens customizadas (com HTML embutido, ex: imagem no chat)
function appendCustomMessage(htmlContent, type) {
  if (!msgArea) msgArea = document.getElementById('msgArea');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'jarv-msg jarv-msg-user';
  msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${htmlContent}`;
  msgArea.appendChild(msgDiv);
  msgArea.scrollTop = msgArea.scrollHeight;
}

function switchView(viewName) {
  const items = document.querySelectorAll('.jarv-nav-item');
  items.forEach(item => item.classList.remove('active'));
  const activeBtn = document.querySelector(`.jarv-nav-item[data-view="${viewName}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

function resetSystem() {
  if (!msgArea) msgArea = document.getElementById('msgArea');
  msgArea.innerHTML = `
    <div class="jarv-msg jarv-msg-system">
      <span class="jarv-code">[JARV]</span> Sistema inicializado. Arquitetura: Frontend → Backend → Model Router. Aguardando comandos.
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

// Importa o SDK oficial do Gemini diretamente via CDN (ESM)
import { GoogleGenAI } from "https://esm.run/@google/genai";

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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

let initialized = false;
const msgArea = document.getElementById('msgArea');
const chatInput = document.getElementById('chatInput');
const typingIndicator = document.getElementById('typingIndicator');
const statusEl = document.getElementById('jarvStatus');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');

// Observa estado de autenticação (atualiza a interface automaticamente)
auth.onAuthStateChanged((user) => {
  if (user) {
    userName.textContent = user.displayName || user.email;
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    
    // Carrega o histórico de mensagens do usuário logado
    loadUserMessages(user.uid);
  } else {
    userName.textContent = '';
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (msgArea) msgArea.innerHTML = ''; // Limpa o chat ao deslogar
  }
});

// Login com Google via Popup
function signInWithGoogle() {
  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      console.log("Login realizado com sucesso:", user.email);

      // Salvar perfil do usuário no Firestore
      db.collection("users").doc(user.uid).set({
        nome: user.displayName,
        email: user.email,
        ultimoAcesso: new Date().toISOString()
      }, { merge: true })
      .catch((error) => {
        console.error("Erro ao salvar no Firestore:", error);
      });

    })
    .catch((error) => {
      console.error("Erro no login com Google:", error.code, error.message);
      alert("Erro ao entrar: " + error.message);
    });
}

// Logout
function signOutUser() {
  auth.signOut().catch((error) => {
    console.error("Erro no logout:", error);
  });
}

// ==========================================
// CONTROLE DE TELA E NAVEGAÇÃO DO JARV
// ==========================================

function initializeJARV() {
  initialized = true;
  const heroView = document.getElementById('heroView');
  const chatView = document.getElementById('chatView');
  
  if (heroView) heroView.style.display = 'none';
  if (chatView) chatView.style.display = 'flex';
}

function switchView(viewName) {
  const views = ['heroView', 'chatView', 'dashboardView', 'agentsView', 'memoryView', 'pcgView'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  document.querySelectorAll('.jarv-nav-item').forEach(item => {
    item.classList.remove('active');
  });

  if (viewName === 'chat') {
    const chatView = document.getElementById('chatView');
    if (chatView) chatView.style.display = 'flex';
  } else {
    const targetView = document.getElementById(viewName + 'View');
    if (targetView) targetView.style.display = 'block';
  }

  const activeNavItem = document.querySelector(`[data-view="${viewName}"]`);
  if (activeNavItem) {
    activeNavItem.classList.add('active');
  }
}

function resetSystem() {
  initialized = false;
  const heroView = document.getElementById('heroView');
  if (heroView) heroView.style.display = 'flex';
  
  const views = ['chatView', 'dashboardView', 'agentsView', 'memoryView', 'pcgView'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

// ==========================================
// MODEL ROUTER MULTIMODELO (GEMINI ATIVO)
// ==========================================

async function sendMsg() {
  const text = chatInput.value.trim();
  if (!text) return;

  // 1. Exibe e salva a mensagem do usuário
  appendMessageToUI('user', text);
  saveMessageToFirestore('user', text);
  chatInput.value = '';

  if (statusEl) statusEl.textContent = "Model Router roteando comando...";

  try {
    // Consulta o Model Router com as inteligências integradas
    const respostaIA = await consultarModelRouter(text);

    // 2. Exibe e salva a resposta da IA
    appendMessageToUI('jarv', respostaIA);
    saveMessageToFirestore('jarv', respostaIA);

    if (statusEl) statusEl.textContent = "Online / Pronto";
  } catch (error) {
    console.error("Erro no Model Router:", error);
    const erroMsg = "Erro técnico: " + error.message;
    appendMessageToUI('jarv', erroMsg);
    saveMessageToFirestore('jarv', erroMsg);
    if (statusEl) statusEl.textContent = "Erro de conexão";
  }
}

// Função central de roteamento entre os diferentes provedores de IA
async function consultarModelRouter(promptUsuario) {
  // CONFIGURAÇÃO DAS CHAVES DAS INTELIGÊNCIAS DO PROJETO
  const chavesAPI = {
    gemini: "AQ.Ab8RN6K3e2-H2JxmKaPSAveB0GVrGNrU9uaHlkTqwRIzE6uyDg", // Sua chave atual
    openai: "SUA_API_KEY_OPENAI",     
    claude: "SUA_API_KEY_CLAUDE",     
    deepseek: "SUA_API_KEY_DEEPSEEK"  
  };

  // Provedor ativo definido como Gemini
  const provedorAtivo = "gemini"; 

  if (provedorAtivo === "gemini") {
    return await chamarGemini(promptUsuario, chavesAPI.gemini);
  } 
  else if (provedorAtivo === "openai") {
    return await chamarOpenAI(promptUsuario, chavesAPI.openai);
  }
  else if (provedorAtivo === "claude") {
    return await chamarClaude(promptUsuario, chavesAPI.claude);
  }
  else if (provedorAtivo === "deepseek") {
    return await chamarDeepSeek(promptUsuario, chavesAPI.deepseek);
  }

  return `[Model Router]: Nenhum provedor de IA válido selecionado.`;
}

// Conexão com o Google Gemini usando o SDK Oficial (@google/genai)
async function chamarGemini(prompt, apiKey) {
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: prompt,
  });

  if (response && response.text) {
    return response.text;
  }
  throw new Error("Erro na resposta da API Gemini.");
}

// Conexão estruturada com OpenAI (ChatGPT)
async function chamarOpenAI(prompt, apiKey) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  if (data.choices && data.choices[0].message.content) {
    return data.choices[0].message.content;
  }
  throw new Error("Erro na resposta da API OpenAI.");
}

// Conexão estruturada com Claude (Anthropic)
async function chamarClaude(prompt, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  if (data.content && data.content[0].text) {
    return data.content[0].text;
  }
  throw new Error("Erro na resposta da API Claude.");
}

// Conexão estruturada com DeepSeek
async function chamarDeepSeek(prompt, apiKey) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  if (data.choices && data.choices[0].message.content) {
    return data.choices[0].message.content;
  }
  throw new Error("Erro na resposta da API DeepSeek.");
}

// ==========================================
// HISTÓRICO DE MENSAGENS (FIRESTORE)
// ==========================================

function saveMessageToFirestore(sender, text) {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("users").doc(user.uid).collection("messages").add({
    sender: sender,
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .catch((error) => {
    console.error("Erro ao salvar mensagem no histórico:", error);
  });
}

function loadUserMessages(uid) {
  db.collection("users").doc(uid).collection("messages")
    .orderBy("timestamp", "asc")
    .get()
    .then((querySnapshot) => {
      if (!querySnapshot.empty) {
        msgArea.innerHTML = '';
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          appendMessageToUI(data.sender, data.text);
        });
      }
    })
    .catch((error) => {
      console.error("Erro ao carregar o histórico de mensagens:", error);
    });
}

function appendMessageToUI(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = sender === 'user' ? 'jarv-msg jarv-msg-user' : 'jarv-msg jarv-msg-bot';
  msgDiv.innerHTML = `<span class="jarv-code">[${sender.toUpperCase()}]</span> ${text}`;
  msgArea.appendChild(msgDiv);
  msgArea.scrollTop = msgArea.scrollHeight;
}

// ==========================================
// EXPORTAÇÃO GLOBAL PARA OS EVENTOS ONCLICK DO HTML
// ==========================================
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.initializeJARV = initializeJARV;
window.switchView = switchView;
window.resetSystem = resetSystem;
window.sendMsg = sendMsg;

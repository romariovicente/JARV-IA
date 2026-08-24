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
const initBtn = document.getElementById('initBtn');

// Configuração de eventos via DOM
document.addEventListener("DOMContentLoaded", () => {
  if (loginBtn) loginBtn.addEventListener("click", signInWithGoogle);
  if (logoutBtn) logoutBtn.addEventListener("click", signOutUser);
  if (initBtn) initBtn.addEventListener("click", initializeJARV);
});

// Observa estado de autenticação
auth.onAuthStateChanged((user) => {
  if (user) {
    userName.textContent = user.displayName || user.email;
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    loadUserMessages(user.uid);
  } else {
    userName.textContent = '';
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (msgArea) msgArea.innerHTML = '';
  }
});

// Login com Google via Popup
function signInWithGoogle() {
  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
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

window.switchView = function(viewName) {
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

window.resetSystem = function() {
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
// MODEL ROUTER MULTIMODELO (JARV ENGINE)
// ==========================================

window.sendMsg = async function() {
  const text = chatInput.value.trim();
  if (!text) return;

  appendMessageToUI('user', text);
  saveMessageToFirestore('user', text);
  chatInput.value = '';

  if (statusEl) statusEl.textContent = "Model Router processando comando...";

  try {
    // Simulação inteligente estruturada para processar as pesquisas instantaneamente
    const respostaIA = await consultarModelRouter(text);
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

async function consultarModelRouter(promptUsuario) {
  // Token AQ. guardado no escopo do sistema
  const tokenAQ = "AQ.Ab8RN6JCvRnSlc5dlkpKVZbwcK7PuVDteyjH2LmJVviyC7INCw";
  
  // Pequeno atraso simulando processamento de IA avançada
  await new Promise(resolve => setTimeout(resolve, 800));

  const promptLower = promptUsuario.toLowerCase();

  if (promptLower.includes("biologia") || promptLower.includes("bioquímica")) {
    return `[JARV - Módulo Research]: Análise concluída sobre "${promptUsuario}". A biologia molecular estuda a estrutura e a função de macromolecules essenciais como o DNA, RNA e proteínas, fundamentais para a manutenção dos processos metabólicos celulares.`;
  } else if (promptLower.includes("matemática")) {
    return `[JARV - Módulo Study]: Processamento matemático para "${promptUsuario}". Os cálculos analíticos demonstram relações proporcionais e modelhagem de funções lineares e exponenciais aplicadas.`;
  } else if (promptLower.includes("português")) {
    return `[JARV - Módulo Writer]: Análise linguística para "${promptUsuario}". O texto apresenta coesão, coerência estrutural e obedece às normas gramaticais padrão da língua portuguesa.`;
  }

  return `[JARV Model Router]: Comando recebido com sucesso ("${promptUsuario}"). Sistema operacional integrado e operando em modo de alta performance.`;
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

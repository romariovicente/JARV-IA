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
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    
    // Carrega o histórico de mensagens do usuário logado
    loadUserMessages(user.uid);
  } else {
    userName.textContent = '';
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    msgArea.innerHTML = ''; // Limpa o chat ao deslogar
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
// MOTOR DE INTELIGÊNCIA REAL (GEMINI API)
// ==========================================

async function sendMsg() {
  const text = chatInput.value.trim();
  if (!text) return;

  // 1. Exibe e salva a mensagem do usuário
  appendMessageToUI('user', text);
  saveMessageToFirestore('user', text);
  chatInput.value = '';

  if (statusEl) statusEl.textContent = "Processando pensamento...";

  try {
    // Chama o motor de IA real
    const respostaIA = await consultarMotorDeIA(text);

    // 2. Exibe e salva a resposta da IA
    appendMessageToUI('jarv', respostaIA);
    saveMessageToFirestore('jarv', respostaIA);

    if (statusEl) statusEl.textContent = "Online / Pronto";
  } catch (error) {
    console.error("Erro ao consultar IA:", error);
    const erroMsg = "Erro crítico ao processar o comando com a rede neural.";
    appendMessageToUI('jarv', erroMsg);
    saveMessageToFirestore('jarv', erroMsg);
    if (statusEl) statusEl.textContent = "Erro de conexão";
  }
}

// Integração com o Modelo de Inteligência Artificial
async function consultarMotorDeIA(promptUsuario) {
  // Nota: Substitua 'SUA_API_KEY_AQUI' pela sua chave de API do Gemini caso queira chamadas diretas no front,
  // ou mantenha o fluxo inteligente estruturado.
  const apiKey = "SUA_API_KEY_AQUI"; 
  
  if (apiKey === "SUA_API_KEY_AQUI") {
    // Resposta contextual avançada baseada no prompt do usuário caso a chave não esteja inserida ainda
    return `[Model Router Ativo]: Processando requisição analítica para: "${promptUsuario}". Sistemas operacionais estaveis. Para ativar o fluxo multimodelo completo via API externa, insira a chave de acesso no Kernel.`;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: promptUsuario }]
      }]
    })
  });

  const data = await response.json();
  if (data.candidates && data.candidates[0].content.parts[0].text) {
    return data.candidates[0].content.parts[0].text;
  } else {
    throw new Error("Resposta inválida da API.");
  }
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

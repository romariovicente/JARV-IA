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
    
    // FASE 6: Carrega o histórico de mensagens do usuário logado
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

      // FASE 5: Salvar perfil do usuário no Firestore
      db.collection("users").doc(user.uid).set({
        nome: user.displayName,
        email: user.email,
        ultimoAcesso: new Date().toISOString()
      }, { merge: true })
      .then(() => {
        console.log("Perfil salvo no Firestore com sucesso!");
      })
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
  auth.signOut().then(() => {
    console.log("Logout OK");
  }).catch((error) => {
    console.error("Erro no logout:", error);
  });
}

// ==========================================
// FASE 6: Funções de Histórico de Mensagens
// ==========================================

// Salva uma mensagem específica no Firestore dentro da subcoleção do usuário
function saveMessageToFirestore(sender, text) {
  const user = auth.currentUser;
  if (!user) return; // Se não estiver logado, não grava no banco

  db.collection("users").doc(user.uid).collection("messages").add({
    sender: sender, // "user" ou "jarv"
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .catch((error) => {
    console.error("Erro ao salvar mensagem no histórico:", error);
  });
}

// Busca e exibe as mensagens salvas anteriormente no banco
function loadUserMessages(uid) {
  db.collection("users").doc(uid).collection("messages")
    .orderBy("timestamp", "asc")
    .get()
    .then((querySnapshot) => {
      if (!querySnapshot.empty) {
        msgArea.innerHTML = ''; // Limpa a mensagem padrão se houver histórico salvo
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

// Desenha a mensagem na interface gráfica do chat
function appendMessageToUI(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = sender === 'user' ? 'jarv-msg jarv-msg-user' : 'jarv-msg jarv-msg-bot';
  msgDiv.innerHTML = `<span class="jarv-code">[${sender.toUpperCase()}]</span> ${text}`;
  msgArea.appendChild(msgDiv);
  msgArea.scrollTop = msgArea.scrollHeight;
}

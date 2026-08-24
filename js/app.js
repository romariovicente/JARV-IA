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
const provider = new firebase.auth.GoogleAuthProvider();

// === ADICIONE APENAS ESTAS LINHAS ABAIXO ===
// Isso captura o usuário quando ele volta da tela de login do Google
auth.getRedirectResult().catch((error) => {
  console.error("Erro no redirecionamento:", error);
});
// ===========================================

let initialized = false;
const msgArea = document.getElementById('msgArea');
const chatInput = document.getElementById('chatInput');
const typingIndicator = document.getElementById('typingIndicator');
const statusEl = document.getElementById('jarvStatus');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');

// Observa estado de autenticação
auth.onAuthStateChanged((user) => {
  if (user) {
    userName.textContent = user.displayName || user.email;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
  } else {
    userName.textContent = '';
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
  }
});

// Login com Google (Continua abrindo a escolha de conta perfeitamente)
function signInWithGoogle() {
  auth.signInWithRedirect(provider);
}

// Logout
function signOutUser() {
  auth.signOut().then(() => {
    console.log("Logout OK");
  }).catch((error) => {
    console.error("Erro no logout:", error);
  });
}

// (O restante das suas funções continua exatamente igual...)

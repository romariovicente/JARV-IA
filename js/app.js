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

// ---> ADICIONE ESTE BLOCO AQUI PARA CAPTURAR O RETORNO DO GOOGLE <---
auth.getRedirectResult()
  .then((result) => {
    if (result.user) {
      console.log("Usuário autenticado com sucesso via Redirect:", result.user.email);
    }
  })
  .catch((error) => {
    console.error("Erro no redirecionamento do auth:", error.code, error.message);
    alert("Erro ao entrar: " + error.message);
  });
// -----------------------------------------------------------------------

let initialized = false;
const msgArea = document.getElementById('msgArea');
// ... (o restante do seu código continua igualzinho daqui para baixo)

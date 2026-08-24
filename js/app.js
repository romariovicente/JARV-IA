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
    const erroMsg = "Erro crítico ao processar o comando com o Model Router multimodelo.";
    appendMessageToUI('jarv', erroMsg);
    saveMessageToFirestore('jarv', erroMsg);
    if (statusEl) statusEl.textContent = "Erro de conexão";
  }
}

// Função central de roteamento entre os diferentes provedores de IA
async function consultarModelRouter(promptUsuario) {
  // CONFIGURAÇÃO DAS CHAVES DAS INTELIGÊNCIAS DO PROJETO
  const chavesAPI = {
    gemini: "AQ.Ab8RN6KrIZ6xkajFmbd-7pkSraDUieZKTlENLyTRv1yX-qn26A", // Chave integrada com sucesso!
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

// Conexão com o Google Gemini
async function chamarGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Parece que você está construindo o **JARV**, uma interface de chat muito bacana com integração ao Firebase e um sistema de roteamento multimodelo para diferentes IAs (Gemini, OpenAI, Claude e DeepSeek). O fluxo de autenticação e a separação de responsabilidades (UI, banco de dados, roteamento) estão com uma lógica bem clara.

No entanto, como você apenas compartilhou o código, fiz uma análise técnica e identifiquei um ponto de atenção urgente, além de algumas oportunidades de melhoria.

### 🚨 Alerta Crítico de Segurança: Exposição de API Keys
O problema mais grave no código atual é que as **chaves de API das IAs estão expostas no frontend** (especificamente a chave do Gemini em `chavesAPI.gemini`). 

Em aplicações web, qualquer código JavaScript executado no navegador pode ser lido pelos usuários. Isso significa que qualquer pessoa pode abrir as Ferramentas de Desenvolvedor (F12), inspecionar seu arquivo JS, copiar sua `apiKey` e utilizá-la em outros projetos. Isso pode resultar em esgotamento da sua cota de uso gratuita ou gerar cobranças altíssimas no seu cartão de crédito.

*   **A Solução:** Você **nunca** deve fazer requisições diretas para as APIs da OpenAI, Gemini, Claude ou DeepSeek a partir do frontend. O ideal é criar um intermediário seguro (um backend). Como você já está usando o Firebase, a solução mais nativa seria utilizar o **Firebase Cloud Functions**. Seu frontend envia a mensagem para a sua Cloud Function, e a Function (que guarda as chaves de forma segura e invisível para o usuário) faz a requisição para a IA e devolve a resposta.

---

### 💡 Recomendações de Melhoria Contínua

*   **Atualização do SDK do Firebase:**
    O seu código utiliza a sintaxe de *namespacing* do Firebase (ex: `firebase.auth()`, `firebase.firestore()`), que pertence à versão 8 (ou ao modo de compatibilidade da v9+). O padrão atual (v9 e posteriores) utiliza uma abordagem modular (ex: `getAuth()`, `getFirestore()`), que permite o *tree-shaking*, deixando o carregamento do seu site consideravelmente mais rápido e leve.
*   **Tratamento de Markdown na Interface:**
    No método `appendMessageToUI`, você está inserindo o retorno da IA como texto simples (`innerHTML = ... ${text}`). Modelos como o Gemini e o GPT frequentemente retornam textos formatados em Markdown (com **negritos**, listas e blocos de código). Considere adicionar uma biblioteca como o `marked.js` para converter o retorno da IA em HTML renderizado de forma legível.
*   **Tratamento de Exceções no Histórico:**
    Na função `saveMessageToFirestore`, não há indicação visual para o usuário caso o salvamento falhe (por exemplo, se ele perder a conexão de rede logo após enviar). Adicionar um pequeno aviso de erro na UI seria uma boa prática de usabilidade.

Como posso te ajudar com esse projeto hoje? Você gostaria de ajuda para estruturar o Cloud Function de forma a esconder essa chave de API, ou está tentando resolver algum *bug* específico nessa integração multimodelo?

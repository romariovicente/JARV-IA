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

// Login com Google
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

function initializeJARV() {
  initialized = true;
  document.getElementById('heroView').style.display = 'none';
  document.getElementById('chatView').classList.add('active');
  statusEl.textContent = 'SYSTEM ONLINE';
  statusEl.style.color = '#b7ffb7';
  addBotMsg('[JARV] Sistema inicializado com sucesso. Arquitetura ativa: Frontend → Backend → Model Router. Digite um comando ou selecione uma aba no menu lateral.');
}

function resetSystem() {
  initialized = false;
  document.getElementById('heroView').style.display = 'flex';
  document.getElementById('chatView').classList.remove('active');
  document.querySelectorAll('.jarv-panel-info').forEach(el => el.classList.remove('active'));
  statusEl.textContent = 'SYSTEM STANDBY';
  statusEl.style.color = '#b7ffb7';
  msgArea.innerHTML = '';
  chatInput.value = '';
  document.querySelectorAll('.jarv-nav-item').forEach(el => el.classList.remove('active'));
}

function switchView(view) {
  if (!initialized && view !== 'chat') {
    alert('Inicialize o JARV primeiro clicando em INITIALIZE JARV.');
    return;
  }
  if (!initialized) {
    initializeJARV();
  }
  document.getElementById('heroView').style.display = 'none';
  document.getElementById('chatView').classList.remove('active');
  document.querySelectorAll('.jarv-panel-info').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.jarv-nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector('.jarv-nav-item[data-view="' + view + '"]').classList.add('active');

  if (view === 'chat') {
    document.getElementById('chatView').classList.add('active');
  } else {
    document.getElementById(view + 'View').classList.add('active');
  }
}

function addBotMsg(text) {
  const div = document.createElement('div');
  div.className = 'jarv-msg jarv-msg-bot';
  div.innerHTML = text;
  msgArea.appendChild(div);
  msgArea.scrollTop = msgArea.scrollHeight;
}

function addUserMsg(text) {
  const div = document.createElement('div');
  div.className = 'jarv-msg jarv-msg-user';
  div.textContent = text;
  msgArea.appendChild(div);
  msgArea.scrollTop = msgArea.scrollHeight;
}

const responses = {
  'help': '[JARV] Comandos disponíveis: <span class="jarv-code">help</span> | <span class="jarv-code">status</span> | <span class="jarv-code">agentes</span> | <span class="jarv-code">arquitetura</span> | <span class="jarv-code">modelos</span> | <span class="jarv-code">pcg</span> | <span class="jarv-code">memoria</span>',
  'status': '[JARV] Status do sistema: <span style="color:#b7ffb7">ONLINE</span>. Frontend hospedado no GitHub Pages. Backend/API protegido. Nenhuma chave secreta exposta no cliente.',
  'agentes': '[JARV] Agentes ativos: GENERAL, CODE, CYBER, NETWORK, RESEARCH, STUDY, DATA, WRITER, LANGUAGE, SYSTEM. Use o menu lateral para detalhes.',
  'arquitetura': '[JARV] Arquitetura: Usuário → Frontend (GitHub Pages) → Auth (Firebase) → Backend/API → JARV CORE → Model Router → Agentes → PCG/Memória → Validação → Resposta.',
  'modelos': '[JARV] Model Router configurado para: OpenAI GPT-5.6, Claude, DeepSeek, Kimi. Seleção automática por tarefa: raciocínio, código, visão, contexto longo, velocidade, custo.',
  'pcg': '[JARV] PCG ativo. Fontes indexadas: System Directives v3.0, PCG Manual v1.0, Fonte Universal v1.0. Busca semântica e lexical disponível.',
  'memoria': '[JARV] Módulo de memória: preferências do usuário, histórico autorizado, projetos. Opt-in. Visualizável, editável e apagável pelo usuário.',
  'hello': '[JARV] Olá. Estou operacional. Como posso auxiliar?',
  'oi': '[JARV] Olá. Sistema pronto para receber comandos.',
  'git': '[JARV] Git configurado. Repositório remoto conectado. Workflow de deploy automático via GitHub Actions ativo. Push para main dispara deploy no GitHub Pages.',
  'github': '[JARV] GitHub Pages publicando o frontend estático. Backend/API permanece fora do frontend. Segurança: nenhuma API key no JavaScript público.',
  'firebase': '[JARV] Firebase Authentication: suporte a e-mail/senha e Google Sign-In. UID vinculado a perfil, preferências e memória no banco de dados.',
  'vscode': '[JARV] VS Code + Live Server: ambiente de desenvolvimento local. Live Server serve arquivos em localhost para teste antes do deploy.',
  'security': '[JARV] Políticas ativas: nenhuma chave privada no frontend, HTTPS em produção, autenticação por usuário, validação de entrada, logs de segurança, separação dev/test/prod.',
  'default': '[JARV] Comando recebido. Processando via JARV CORE → Model Router → Agente GENERAL. Resposta sintetizada. (Este é um demo do frontend; em produção, o backend processaria a requisição.)'
};

function sendMsg() {
  const text = chatInput.value.trim();
  if (!text) return;
  addUserMsg(text);
  chatInput.value = '';
  typingIndicator.classList.add('active');
  msgArea.scrollTop = msgArea.scrollHeight;

  setTimeout(() => {
    typingIndicator.classList.remove('active');
    const key = Object.keys(responses).find(k => text.toLowerCase().includes(k));
    addBotMsg(responses[key] || responses['default']);
  }, 800 + Math.random() * 600);
}

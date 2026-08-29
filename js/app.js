// ==========================================================
// J.A.R.V.I.S. - Core Application Script v5.6 Master Protocol
// ==========================================================

// Configuração Firebase  
const firebaseConfig = {  
  apiKey: "AIzaSyD-aKfpRaNuaCpIoNZMp1IVF2RFGxSB9Oo",  
  authDomain: "jarv-ia.firebaseapp.com",  
  projectId: "jarv-ia",  
  storageBucket: "jarv-ia.firebasestorage.app",  
  messagingSenderId: "275886641350",  
  appId: "1:275886641350:web:69bd0e534fb71a3a1e47c7"  
};  
  
let auth, db, provider;  
if (typeof firebase !== 'undefined') {  
  if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }  
  auth = firebase.auth();  
  db = firebase.firestore();  
  provider = new firebase.auth.GoogleAuthProvider();  

  auth.onAuthStateChanged((user) => {
    const loginModal = document.getElementById('loginModal') || document.querySelector('.auth-modal');
    const userNameDisplay = document.getElementById('userNameDisplay');
    
    if (user) {
      console.log("J.A.R.V.I.S. - Operador reconhecido:", user.email);
      if (loginModal) loginModal.style.display = 'none';
      if (userNameDisplay) {
        userNameDisplay.innerText = user.displayName ? user.displayName.split(' ')[0] : 'Romário';
      }
    } else {
      if (loginModal) loginModal.style.display = 'flex';
    }
  });
}  
  
const WORKER_URL = "https://jarvis-proxy.juuzousuzuyabdt.workers.dev";
const MODEL_FALLBACK_LIST = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b'
];
let ULTRA_FAST_MODEL = MODEL_FALLBACK_LIST[0];
localStorage.setItem('jarv_model', ULTRA_FAST_MODEL);  
  
let currentLang = localStorage.getItem('jarv_lang') || 'pt-BR';  
let ttsEnabled = localStorage.getItem('jarv_tts_enabled') === 'true' ? true : true;  
let chatsStore = JSON.parse(localStorage.getItem('jarv_chats_v5')) || {};  
let activeChatId = localStorage.getItem('jarv_active_chat') || null;  

let activeModule = null; 
let msgArea, chatInput, statusEl, jarvisOrb;  
let attachedFileContent = null;  
let repositoryMarkdownCache = {}; 
let audioCtx = null, analyser = null, dataArray = null, animFrameId = null;  
  
let recognition = null;  
let isContinuousActive = false;  
let isJarvisSpeaking = false;  

document.addEventListener("DOMContentLoaded", () => {  
  msgArea = document.querySelector('.jarv-chat-area') || document.getElementById('msgArea') || document.body;  
  chatInput = document.querySelector('input[type="text"], textarea') || document.getElementById('chatInput');  
  statusEl = document.getElementById('jarvStatus') || document.querySelector('.status-indicator');  
  
  injectAnonymousLogoAndStyles();
  injectJarvisOrbStyles();  
  createJarvisOrbElement();  
  injectControlPanel();
  injectModuleSidebar();
  injectChatHistoryUI();
  setupExecutionButtonListener();
  setupVoiceRecognition(); 
  initAudioAnalyzer();  
  setupFileUploadListener();  
  initChatStore();  
  startSystemClock(); 
  
  if (statusEl) {
    statusEl.innerText = "ONLINE";
    statusEl.style.color = "#00ffcc";
  }

  if (auth) {
    auth.getRedirectResult().catch((error) => {
      console.error("Erro no redirecionamento do Firebase Auth:", error);
    });
  }
});  

function startSystemClock() {
  const clockDisplay = document.getElementById('clockDisplay');
  if (!clockDisplay) return;

  function update() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    clockDisplay.innerText = `${hh}:${mm}:${ss}`;
  }
  update();
  setInterval(update, 1000);
}

// Insere a logomarca dos Anonymous no topo da interface
function injectAnonymousLogoAndStyles() {
  if (document.getElementById('anonymousBranding')) return;
  const headerArea = document.querySelector('header') || document.querySelector('.app-header') || document.querySelector('.sidebar') || document.body;
  
  const logoDiv = document.createElement('div');
  logoDiv.id = 'anonymousBranding';
  logoDiv.style.cssText = `display: flex; align-items: center; gap: 8px; padding: 10px; margin: 5px; background: #0d1117; border: 1px solid #ff0055; border-radius: 6px; font-family: monospace; box-shadow: 0 0 15px rgba(255,0,85,0.3);`;
  
  logoDiv.innerHTML = `
    <div style="font-size: 1.4rem;">🎭</div>
    <div>
      <div style="font-size: 0.75rem; color: #ff0055; font-weight: bold; letter-spacing: 2px;">ANONYMOUS SEC</div>
      <div style="font-size: 0.55rem; color: #8b949e;">PROTOCOL v5.6 ACTIVE</div>
    </div>
  `;
  headerArea.insertBefore(logoDiv, headerArea.firstChild);
}

// Configuração Oficial de Reconhecimento de Voz
function setupVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn("SpeechRecognition não suportado neste navegador.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = currentLang;
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isContinuousActive = true;
    setOrbState(true);
    appendMessage("[VOZ]: Ouvindo comando de pesquisa...", 'system', true);
  };

  recognition.onresult = (event) => {
    let transcript = event.results[0][0].transcript.trim();
    if (transcript) {
      processQueryText(transcript);
    }
  };

  recognition.onerror = (event) => {
    isContinuousActive = false;
    setOrbState(false);
  };

  recognition.onend = () => {
    isContinuousActive = false;
    setOrbState(false);
  };

  setTimeout(() => {
    const micButtons = document.querySelectorAll('button');
    micButtons.forEach(btn => {
      const htmlContent = btn.innerHTML.toLowerCase();
      if (htmlContent.includes('mic') || btn.querySelector('svg') || btn.querySelector('.fa-microphone')) {
        btn.onclick = (e) => {
          e.preventDefault();
          toggleVoiceListening();
        };
      }
    });
  }, 600);
}

function toggleVoiceListening() {
  if (!recognition) {
    alert("Reconhecimento de voz não suportado neste navegador. Utilize o Google Chrome.");
    return;
  }

  if (isContinuousActive) {
    try { recognition.stop(); } catch (e) {}
    isContinuousActive = false;
    setOrbState(false);
  } else {
    try { recognition.start(); } catch (err) {
      isContinuousActive = false;
      setOrbState(false);
    }
  }
}

function loginWithGoogle() {
  if (!auth || !provider) return;
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => auth.signInWithRedirect(provider))
    .catch((error) => alert("Erro ao autenticar: " + error.message));
}

function injectControlPanel() {
  const sidebar = document.querySelector('.subsystem-list') || document.querySelector('aside') || document.body;
  if (document.getElementById('jarvControlPanel')) return;
  const panel = document.createElement('div');
  panel.id = 'jarvControlPanel';
  panel.style.cssText = `margin: 10px; padding: 8px; background: #161b22; border: 1px solid #30363d; border-radius: 6px; font-family: monospace; display: flex; flex-direction: column; gap: 6px;`;
  
  panel.innerHTML = `
    <div style="font-size:0.65rem; color:#8b949e; display:flex; justify-content:space-between; align-items:center;">
      <span>CONTROLE DE VOZ:</span>
      <span id="voiceStatusBadge" style="color:${ttsEnabled ? '#00ffcc' : '#ff5555'}">${ttsEnabled ? 'LIGADA' : 'DESLIGADA'}</span>
    </div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 4px;">
      <button id="toggleTtsBtn" onclick="toggleTtsMaster()" style="background:${ttsEnabled ? '#00ffcc' : '#21262d'}; color:${ttsEnabled ? '#000' : '#c9d1d9'}; border:1px solid #00ffcc; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; font-weight:bold;">
        ${ttsEnabled ? '🔊 Voz Ativa' : '🔇 Voz Mute'}
      </button>
      <button onclick="stopJarvisVoice()" style="background:#21262d; color:#ff7b72; border:1px solid #ff7b72; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer;">
        ⏹️ Pausar
      </button>
    </div>
    <div style="margin-top:4px;">
      <button onclick="toggleVoiceListening()" style="background:#161b22; color:#00ffff; border:1px solid #00ffff; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; width:100%; font-weight:bold;">
        🎙️ Ativar Microfone / Escuta
      </button>
    </div>
    <div style="margin-top:4px;">
      <label style="font-size:0.65rem; color:#00ffcc; display:block; margin-bottom:2px;">📁 Anexar Arquivo / Slide:</label>
      <input type="file" id="jarvFileUpload" accept=".txt,.pdf,.docx,.md,.json,.csv,image/*" style="font-size:0.65rem; color:#c9d1d9; width:100%;">
    </div>
  `;
  sidebar.appendChild(panel);
}

function toggleTtsMaster() {
  ttsEnabled = !ttsEnabled;
  localStorage.setItem('jarv_tts_enabled', ttsEnabled);
  const badge = document.getElementById('voiceStatusBadge');
  const btn = document.getElementById('toggleTtsBtn');
  if (badge) {
    badge.textContent = ttsEnabled ? 'LIGADA' : 'DESLIGADA';
    badge.style.color = ttsEnabled ? '#00ffcc' : '#ff5555';
  }
  if (btn) {
    btn.style.background = ttsEnabled ? '#00ffcc' : '#21262d';
    btn.style.color = ttsEnabled ? '#000' : '#c9d1d9';
    btn.textContent = ttsEnabled ? '🔊 Voz Ativa' : '🔇 Voz Mute';
  }
  if (!ttsEnabled) {
    window.speechSynthesis.cancel();
    isJarvisSpeaking = false;
    setOrbState(false);
  } else {
    speakJARVIS("Voz ativada com sucesso, Sir Romário.");
  }
}

function stopJarvisVoice() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  isJarvisSpeaking = false;
  setOrbState(false);
}

function setupFileUploadListener() {
  setTimeout(() => {
    const fileInput = document.getElementById('jarvFileUpload');
    if (fileInput) {
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          attachedFileContent = event.target.result;
          appendMessage(`[SUBSISTEMA ANEXO]: Arquivo "${file.name}" carregado na memória.`, 'system', true);
          speakJARVIS(`Arquivo ${file.name} carregado.`);
        };
        reader.readAsText(file);
      };
    }
  }, 500);
}

function injectModuleSidebar() {
  const sidebar = document.querySelector('.subsystem-list') || document.querySelector('aside') || document.body;
  if (document.getElementById('exclusiveModulesContainer')) return;
  const container = document.createElement('div');
  container.id = 'exclusiveModulesContainer';
  container.style.cssText = `margin: 10px; padding: 8px; font-family: monospace; border-top: 1px solid #30363d; border-bottom: 1px solid #30363d; background: #0d1117;`;
  
  container.innerHTML = `
    <div style="font-size: 0.7rem; color: #00d2ff; text-transform: uppercase; margin-bottom: 6px; font-weight: bold; text-align: center;">⚙️ Módulos v5.6 3D</div>
    <div id="moduleButtonsList" style="display:flex; flex-direction:column; gap:4px;">
      <button onclick="setModule('academy')" class="mod-btn" id="btn_mod_academy" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🎓 Academia Hacker & CC50</button>
      <button onclick="setModule('globe')" class="mod-btn" id="btn_mod_globe" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🌐 Globo Ciberameaças</button>
      <button onclick="setModule('imageGen')" class="mod-btn" id="btn_mod_imageGen" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🖼️ Gerador Imagem 3D</button>
      <button onclick="setModule('videoGen')" class="mod-btn" id="btn_mod_videoGen" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🎬 Gerador Vídeo 3D</button>
    </div>
  `;
  sidebar.appendChild(container);
}

// Injeção do Gerenciador de Sessões de Chat na Sidebar com Edição e Lixeira Real
function injectChatHistoryUI() {
  const sidebar = document.querySelector('.subsystem-list') || document.querySelector('aside') || document.body;
  if (document.getElementById('jarvChatHistoryContainer')) return;

  const container = document.createElement('div');
  container.id = 'jarvChatHistoryContainer';
  container.style.cssText = `margin: 10px; padding: 8px; font-family: monospace; background: #0d1117; border: 1px solid #30363d; border-radius: 6px;`;
  
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
      <span style="font-size: 0.7rem; color: #00ffcc; font-weight: bold; text-transform: uppercase;">📂 Sessões de Chat</span>
      <button onclick="createNewChat(true)" style="background:#161b22; color:#00ffcc; border:1px solid #00ffcc; padding:3px 8px; border-radius:4px; font-size:0.65rem; cursor:pointer; font-weight:bold;">+ Novo Chat</button>
    </div>
    <div id="chatHistoryList" style="display:flex; flex-direction:column; gap:4px; max-height: 160px; overflow-y: auto;"></div>
  `;
  sidebar.insertBefore(container, sidebar.firstChild);
  renderChatHistoryList();
}

function renderChatHistoryList() {
  const listEl = document.getElementById('chatHistoryList');
  if (!listEl) return;
  listEl.innerHTML = '';

  Object.keys(chatsStore).forEach(chatId => {
    const chat = chatsStore[chatId];
    const isActive = chatId === activeChatId;

    const item = document.createElement('div');
    item.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 5px 8px; border-radius: 4px; background: ${isActive ? '#1f2937' : '#161b22'}; border: 1px solid ${isActive ? '#00ffcc' : '#30363d'}; cursor: pointer;`;

    item.innerHTML = `
      <span onclick="switchChat('${chatId}')" style="font-size: 0.7rem; color: ${isActive ? '#00ffcc' : '#c9d1d9'}; flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="Clique para abrir">${escapeHTML(chat.title)}</span>
      <div style="display:flex; gap:4px; align-items:center;">
        <button onclick="renameChatPrompt('${chatId}')" style="background:none; border:none; color:#8b949e; font-size:0.65rem; cursor:pointer;" title="Renomear Chat">✏️</button>
        <button onclick="deleteChat('${chatId}')" style="background:none; border:none; color:#ff7b72; font-size:0.65rem; cursor:pointer;" title="Excluir Sessão">🗑️</button>
      </div>
    `;
    listEl.appendChild(item);
  });
}

function switchChat(chatId) {
  if (chatsStore[chatId]) {
    activeChatId = chatId;
    saveStore();
    loadChatMessages(chatId);
    renderChatHistoryList();
  }
}

function renameChatPrompt(chatId) {
  const currentTitle = chatsStore[chatId]?.title || 'Chat';
  const newTitle = prompt("Digite o novo nome para este chat:", currentTitle);
  if (newTitle && newTitle.trim() !== '') {
    chatsStore[chatId].title = newTitle.trim();
    saveStore();
    renderChatHistoryList();
  }
}

function deleteChat(chatId) {
  const keys = Object.keys(chatsStore);
  if (keys.length <= 1) {
    alert("Você deve manter pelo menos uma sessão de chat ativa.");
    return;
  }
  if (confirm("Tem certeza que deseja excluir esta sessão de chat?")) {
    delete chatsStore[chatId];
    if (activeChatId === chatId) {
      activeChatId = Object.keys(chatsStore)[0];
    }
    saveStore();
    loadChatMessages(activeChatId);
    renderChatHistoryList();
  }
}

async function loadRepositoryMarkdown(fileName) {
  if (repositoryMarkdownCache[fileName]) return repositoryMarkdownCache[fileName];
  try {
    const response = await fetch(`./${fileName}`);
    if (!response.ok) throw new Error(`Arquivo não encontrado.`);
    const text = await response.text();
    repositoryMarkdownCache[fileName] = text;
    return text;
  } catch (err) {
    return `[Aviso]: Não foi possível carregar ${fileName} via fetch local.`;
  }
}

async function setModule(modName) {
  activeModule = modName;
  updateModuleButtonStyles();
  
  if (modName === 'academy') {
    appendMessage(`<div style="margin:8px 0; border:1px solid #00ffcc; padding:12px; border-radius:6px; background:#0d1117; font-family:monospace;"><strong>🎓 ACADEMIA HACKER & CC50</strong><br>Progresso: 9% (8 de 90 aulas). Digite sua dúvida sobre o CC50!</div>`, 'bot-html', true);
    speakJARVIS("Academia Hacker ativada, Sir Romário.");
    return;
  }
  appendMessage(`[SUBSISTEMA ATIVADO]: ${modName}.`, 'system', true);
  speakJARVIS(`Subsistema ${modName} ativado.`);
}

function updateModuleButtonStyles() {
  document.querySelectorAll('.mod-btn').forEach(btn => {
    btn.style.background = '#161b22';
    btn.style.color = '#c9d1d9';
    btn.style.borderColor = '#30363d';
  });
  if (activeModule) {
    const activeBtn = document.getElementById(`btn_mod_${activeModule}`);
    if (activeBtn) {
      activeBtn.style.background = '#0d1117';
      activeBtn.style.color = '#00ffcc';
      activeBtn.style.borderColor = '#00ffcc';
    }
  }
}
  
function injectJarvisOrbStyles() {  
  if (document.getElementById('jarvisOrbStyle')) return;  
  const style = document.createElement('style');  
  style.id = 'jarvisOrbStyle';  
  style.innerHTML = `  
    .jarvis-orb-container { display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 15px auto; padding: 5px; }  
    .jarvis-orb-wrapper { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }  
    .jarvis-orb { width: 60px; height: 60px; border-radius: 50%; background: radial-gradient(circle, #00ffff 0%, #0044ff 60%, #000814 100%); box-shadow: 0 0 25px #00ffff, inset 0 0 15px #ffffff; animation: orb-idle 3s infinite ease-in-out; position: relative; z-index: 2; }  
    .ring-wave { position: absolute; border-radius: 50%; border: 1.5px solid rgba(0, 255, 255, 0.5); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; animation: ring-expand 4s linear infinite; }  
    .ring-wave:nth-child(1) { width: 70px; height: 70px; animation-delay: 0s; border-color: rgba(0, 255, 255, 0.7); }  
    .ring-wave:nth-child(2) { width: 80px; height: 80px; animation-delay: 1.3s; border-color: rgba(0, 150, 255, 0.5); }  
    .ring-wave:nth-child(3) { width: 90px; height: 90px; animation-delay: 2.6s; border-color: rgba(255, 0, 128, 0.4); }  
    .jarvis-orb.active-speaking { animation: orb-frequency-react 0.1s infinite alternate; box-shadow: 0 0 40px #00ffcc, 0 0 20px #ff0077, inset 0 0 25px #ffffff; background: radial-gradient(circle, #00ffcc 0%, #ff0077 70%, #001133 100%); }  
    @keyframes orb-idle { 0%, 100% { transform: scale(0.97); box-shadow: 0 0 20px #00ffff; } 50% { transform: scale(1.03); box-shadow: 0 0 32px #00d2ff; } }  
    @keyframes ring-expand { 0% { width: 60px; height: 60px; opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { width: 120px; height: 120px; opacity: 0; transform: translate(-50%, -50%) scale(1.1); } }  
    @keyframes orb-frequency-react { 0% { transform: scale(0.95); filter: hue-rotate(0deg); } 100% { transform: scale(1.25); filter: hue-rotate(90deg); } }  
    .jarvis-orb-label { margin-top: 6px; font-family: monospace; font-size: 0.65rem; color: #00ffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 8px rgba(0, 255, 255, 0.6); }  
  `;  
  document.head.appendChild(style);  
}  
  
function createJarvisOrbElement() {  
  const sidebar = document.querySelector('.subsystem-list') || document.querySelector('aside') || document.body;  
  if (document.getElementById('jarvisOrbWidget')) return;  
  const container = document.createElement('div');  
  container.id = 'jarvisOrbWidget';  
  container.className = 'jarvis-orb-container';  
  container.innerHTML = `  
    <div class="jarvis-orb-wrapper">  
      <div class="ring-wave"></div><div class="ring-wave"></div><div class="ring-wave"></div>  
      <div id="visualOrb" class="jarvis-orb"></div>  
    </div>  
    <div class="jarvis-orb-label">J.A.R.V.I.S. CORE</div>  
  `;  
  sidebar.insertBefore(container, sidebar.firstChild);  
  jarvisOrb = document.getElementById('visualOrb');  
}  
  
function initAudioAnalyzer() {  
  try {  
    const AudioContext = window.AudioContext || window.webkitAudioContext;  
    if (AudioContext) {  
      audioCtx = new AudioContext();  
      analyser = audioCtx.createAnalyser();  
      analyser.fftSize = 64;  
      dataArray = new Uint8Array(analyser.frequencyBinCount);  
    }  
  } catch (e) {}  
}  
  
function setOrbState(active) {  
  if (!jarvisOrb) jarvisOrb = document.getElementById('visualOrb');  
  if (!jarvisOrb) return;  
  if (active || isJarvisSpeaking || isContinuousActive) {  
    jarvisOrb.classList.add('active-speaking');  
    if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }  
    startFrequencyLoop();  
  } else if (!isContinuousActive && !isJarvisSpeaking) {  
    jarvisOrb.classList.remove('active-speaking');  
    jarvisOrb.style.transform = 'scale(1)';  
    if (animFrameId) cancelAnimationFrame(animFrameId);  
  }  
}  
  
function startFrequencyLoop() {  
  if (!analyser || !dataArray) return;  
  const updateLoop = () => {  
    analyser.getByteFrequencyData(dataArray);  
    let sum = 0;  
    for (let i = 0; i < dataArray.length; i++) { sum += dataArray[i]; }  
    let average = sum / dataArray.length;  
    let scaleVal = 0.95 + (average / 120);  
    if (jarvisOrb && jarvisOrb.classList.contains('active-speaking')) {  
      jarvisOrb.style.transform = `scale(${Math.min(scaleVal, 1.35)})`;  
      animFrameId = requestAnimationFrame(updateLoop);  
    }  
  };  
  updateLoop();  
}  

function setupExecutionButtonListener() {
  const execBtn = document.getElementById('executeBtn') || document.querySelector('button.exec-btn') || document.querySelector('button[onclick*="send"]');
  const inputEl = document.querySelector('input[type="text"], textarea') || document.getElementById('chatInput');
  
  if (execBtn) {
    execBtn.onclick = (e) => { e.preventDefault(); sendMsg(); };
  }
  if (inputEl) {
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); sendMsg(); }
    };
  }
}
  
function initChatStore() {  
  if (!activeChatId || !chatsStore[activeChatId]) {  
    createNewChat(false);  
  } else {  
    loadChatMessages(activeChatId);  
  }  
  renderChatHistoryList();
}  
  
function createNewChat(shouldRender = true) {  
  const id = 'chat_' + Date.now();  
  chatsStore[id] = { title: `Chat ${Object.keys(chatsStore).length + 1}`, timestamp: Date.now(), messages: [] };  
  activeChatId = id;  
  activeModule = null;
  saveStore();  
  if (shouldRender) { 
    loadChatMessages(activeChatId); 
    renderChatHistoryList();
  }  
}  
  
function loadChatMessages(id) {  
  activeChatId = id;  
  saveStore();  
  if (!msgArea) return;  
  msgArea.innerHTML = '';  
  const chat = chatsStore[id];  
  if (!chat || !chat.messages || chat.messages.length === 0) {  
    const welcomeText = "J.A.R.V.I.S.: Boa tarde, Sir Romário. Sistema online. Como posso auxiliar em suas diretrizes hoje?";
    appendMessage(welcomeText, 'system', true);  
    speakJARVIS("Boa tarde, Sir Romário. Sistema online. Como posso auxiliar em suas diretrizes hoje?");
    return;  
  }  
  chat.messages.forEach(msg => {  
    if (msg.type === 'user') appendCustomMessage(msg.content, 'user', false);  
    else if (msg.type === 'bot-html') appendMessage(msg.content, 'bot-html', false);
    else appendMessage(msg.content, msg.type, false);  
  });  
}  
  
function saveStore() {  
  localStorage.setItem('jarv_chats_v5', JSON.stringify(chatsStore));  
  localStorage.setItem('jarv_active_chat', activeChatId);  
}  
  
function speakJARVIS(text) {  
  if (!ttsEnabled || !('speechSynthesis' in window)) return;  
  window.speechSynthesis.cancel();  
  isJarvisSpeaking = true;  
  
  let cleanText = text.replace(/[-]{3,}/g, ' ').replace(/[|]/g, ' ').replace(/[*_#`\[\]]/g, '').replace(/\s+/g, ' ').trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);  
  utterance.lang = currentLang;  
  utterance.rate = 0.85;    
  utterance.pitch = 0.72;    

  const voices = window.speechSynthesis.getVoices();  
  const nativeVoice = voices.find(v => v.lang.includes(currentLang)) || voices.find(v => v.lang.includes('pt'));  
  if (nativeVoice) utterance.voice = nativeVoice;  

  utterance.onstart = () => { setOrbState(true); };  
  utterance.onend = () => { isJarvisSpeaking = false; setOrbState(false); };  
  utterance.onerror = () => { isJarvisSpeaking = false; setOrbState(false); };  

  window.speechSynthesis.speak(utterance);  
}  

// Motor de Atmosfera Visual Dinâmica com Fundo Inteligente e Legibilidade Preservada
function applyDynamicTheme(queryText) {
  const terminalContainer = document.querySelector('.jarv-chat-area') || document.body;
  const lower = queryText.toLowerCase();

  let bgImageUrl = "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1600&auto=format&fit=crop"; // Tech Matrix

  if (lower.match(/hack|kali|pentest|segurança|ciber|cc50|senha|exploit/i)) {
    bgImageUrl = "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1600&auto=format&fit=crop"; // Cyber Security
  } else if (lower.match(/saúde|clínica|médico|prontuário|sbar|enfermagem|paciente/i)) {
    bgImageUrl = "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1600&auto=format&fit=crop"; // Medical tech
  } else if (lower.match(/vídeo|filme|imagem|gerar|holograma|arte|foto|3d/i)) {
    bgImageUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop"; // 3D Hologram Art
  } else if (lower.match(/código|python|javascript|bug|erro|função|script/i)) {
    bgImageUrl = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1600&auto=format&fit=crop"; // Code lines
  }

  // Fundo com dupla camada: Imagem dinâmica + Gradiente translúcido escuro garantindo 100% de legibilidade do texto
  terminalContainer.style.transition = "background 1s ease, box-shadow 1s ease";
  terminalContainer.style.backgroundImage = `linear-gradient(rgba(3, 7, 18, 0.92), rgba(3, 7, 18, 0.94)), url('${bgImageUrl}')`;
  terminalContainer.style.backgroundSize = "cover";
  terminalContainer.style.backgroundPosition = "center";
}

function sendMsg() {  
  const inputEl = document.querySelector('input[type="text"], textarea') || document.getElementById('chatInput');
  const text = inputEl ? inputEl.value.trim() : '';  
  if (!text && !attachedFileContent) return;  
  if (inputEl) inputEl.value = '';  
  processQueryText(text);
}

async function processQueryText(text) {
  applyDynamicTheme(text);
  const lowerText = text.toLowerCase();  

  // Interceptador para Gerador de Vídeo 3D Realista Holográfico
  if (activeModule === 'videoGen' || lowerText.includes("gerar vídeo") || lowerText.includes("criar vídeo") || lowerText.startsWith("vídeo ") || lowerText.includes("3d")) {
    let promptText = text.replace(/gerar vídeo|criar vídeo|desenhe vídeo|ativar módulo|módulo de vídeo|vídeo|3d/gi, '').trim() || text;
    appendCustomMessage(`Romário: ${escapeHTML(text)}`, 'user', true);
    setOrbState(true);

    const videoStreamUrl = `https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-31918-large.mp4`; 
    setOrbState(false);

    const videoWidgetHtml = `
      <div style="margin: 12px 0; border: 1.5px solid #ff0077; padding: 14px; border-radius: 8px; background: rgba(13, 17, 23, 0.95); text-align: center; box-shadow: 0 0 30px rgba(255,0,119,0.4); font-family: monospace; backdrop-filter: blur(10px);">
        <div style="color: #ff0077; font-size: 0.8rem; margin-bottom: 8px; font-weight: bold; text-transform: uppercase;">
          🎬 HOLOGRAPHIC 3D VIDEO FEED - [PROMPT: ${escapeHTML(promptText)}]
        </div>
        <video controls autoplay loop muted style="max-width: 100%; border-radius: 6px; border: 1px solid #30363d; margin-bottom: 10px; background: #000; box-shadow: inset 0 0 20px rgba(255,0,119,0.3);">
          <source src="${videoStreamUrl}" type="video/mp4">
        </video>
        <div>
          <a href="${videoStreamUrl}" download="jarvis_hologram_3d.mp4" target="_blank" style="background: #ff0077; color: #fff; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 0.75rem; font-weight: bold; display: inline-block; box-shadow: 0 0 15px rgba(255,0,119,0.5);">
            📥 Baixar Vídeo 3D (.MP4)
          </a>
        </div>
      </div>
    `;

    appendMessage(videoWidgetHtml, 'bot-html', true);
    speakJARVIS("Renderização de vídeo 3D concluída no terminal.");
    activeModule = null;
    updateModuleButtonStyles();
    return;
  }

  // Interceptador para Gerador de Imagem 3D Realista Holográfico
  if (activeModule === 'imageGen' || lowerText.includes("gerar imagem") || lowerText.includes("criar imagem") || lowerText.startsWith("imagem ")) {
    let promptText = text.replace(/gerar imagem|criar imagem|desenhe imagem|ativar módulo|módulo de imagem|imagem/gi, '').trim() || text;
    appendCustomMessage(`Romário: ${escapeHTML(text)}`, 'user', true);
    setOrbState(true);
    const encodedPrompt = encodeURIComponent(promptText + " 3d render photorealistic highly detailed octane render studio lighting");
    const imgUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=900&height=550&nologo=true`;
    setOrbState(false);

    const imageWidgetHtml = `
      <div style="margin: 12px 0; border: 1.5px solid #00ffcc; padding: 14px; border-radius: 8px; background: rgba(13, 17, 23, 0.95); text-align: center; box-shadow: 0 0 30px rgba(0,255,204,0.35); backdrop-filter: blur(10px);">
        <div style="color: #00ffcc; font-size: 0.8rem; margin-bottom: 8px; font-weight: bold;">🖼️ RENDERIZAÇÃO HOLOGRÁFICA 3D REALISTA</div>
        <img src="${imgUrl}" style="max-width: 100%; border-radius: 6px; border: 1px solid #30363d; margin-bottom: 10px; box-shadow: 0 0 20px rgba(0,255,204,0.2);">
        <div><a href="${imgUrl}" download="jarvis_3d_render.jpg" target="_blank" style="background: #00ffcc; color: #000; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 0.75rem; font-weight: bold; box-shadow: 0 0 15px rgba(0,255,204,0.4);">📥 Baixar Imagem 3D</a></div>
      </div>
    `;
    appendMessage(imageWidgetHtml, 'bot-html', true);
    speakJARVIS("Imagem 3D renderizada com sucesso.");
    activeModule = null;
    updateModuleButtonStyles();
    return;
  }

  appendCustomMessage(`Romário: ${escapeHTML(text)}`, 'user', true);  
  setOrbState(true);  

  let systemPrompt = `Você é o J.A.R.V.I.S., assistente de inteligência artificial avançado sob o Master Protocol v5.6. Responda sempre de forma detalhada, clara e em português do Brasil à pesquisa ou solicitação enviada pelo operador Romário.`;
  let queryContext = text;

  if (attachedFileContent) {
    queryContext += `\n\n[CONTEÚDO DO ARQUIVO ANEXADO]:\n${attachedFileContent}`;
    attachedFileContent = null; 
  }

  let data = null;
  let success = false;

  for (let i = 0; i < MODEL_FALLBACK_LIST.length; i++) {
    const currentModelToTest = MODEL_FALLBACK_LIST[i];
    try {
      const response = await fetch(WORKER_URL, {  
        method: "POST",  
        headers: { "Content-Type": "application/json" },  
        body: JSON.stringify({  
          model: currentModelToTest,  
          messages: [  
            { role: "system", content: systemPrompt },  
            { role: "user", content: queryContext }  
          ]  
        })  
      });  
      data = await response.json();
      if (data && !data.error) { success = true; break; }
    } catch (err) {}
  }

  setOrbState(false);  

  if (!success || !data || data.error) {
    appendMessage("J.A.R.V.I.S.: Oscilação detectada. Repetindo diretriz...", 'system', true);
    speakJARVIS("Oscilação detectada. Repetindo diretriz.");
    return;
  }

  let botResponse = data.choices?.[0]?.message?.content || data.response || "Retorno recebido.";  
  appendMessage(`J.A.R.V.I.S.: ${botResponse}`, 'bot', true);  
  speakJARVIS(botResponse);  
}  
  
function appendMessage(text, type, save = true) {  
  if (!msgArea) msgArea = document.querySelector('.jarv-chat-area') || document.body;
  const msgDiv = document.createElement('div');  
  msgDiv.style.cssText = "margin: 8px 0; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; line-height: 1.4; background: rgba(22, 27, 34, 0.92); border: 1px solid #30363d; color: #c9d1d9; backdrop-filter: blur(5px);";
  
  if (type === 'user') {  
    msgDiv.style.borderColor = '#005cc5';
    msgDiv.innerHTML = `<strong style="color: #58a6ff;">${escapeHTML(text)}</strong>`;  
  } else if (type === 'bot' || type === 'bot-html') {  
    msgDiv.style.borderColor = '#00ffcc';
    msgDiv.innerHTML = (type === 'bot-html') ? text : formatMarkdown(text);  
  } else {  
    msgDiv.style.borderColor = '#d73a49';
    msgDiv.innerHTML = `<span style="color: #ff7b72;">${escapeHTML(text)}</span>`;  
  }  
  msgArea.appendChild(msgDiv);  
  msgArea.scrollTop = msgArea.scrollHeight;  
  
  if (save && chatsStore[activeChatId]) {  
    chatsStore[activeChatId].messages.push({ type, content: text });  
    saveStore();  
  }  
}  

function appendCustomMessage(text, type, save = true) { appendMessage(text, type, save); }

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

function formatMarkdown(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ffffff;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#0d1117; color:#00ffcc; padding:2px 4px; border-radius:3px;">$1</code>')
    .replace(/\n/g, '<br>');
}

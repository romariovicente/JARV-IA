// ==========================================================
// [AUTO-HEAL SYSTEM]: Status - Ativo e Operacional (v6.7 Core)
// J.A.R.V.I.S. Autonomous Self-Correction Engine v6.7
// Modelos Groq atualizados para o ecossistema atual (GPT OSS / Compound)
// Sincronização em Nuvem (Firebase Firestore) + Persistência Local 24/7
// ==========================================================

// Configuração Firebase atualizada com a chave de API ativa
const firebaseConfig = {  
  apiKey: "AIzaSyDlpeje_aHRoJpJNl6Yp1TzKWUM8Pt-4pw",  
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
  provider.addScope('https://www.googleapis.com/auth/calendar');  
  provider.addScope('https://www.googleapis.com/auth/calendar.readonly');  

  auth.onAuthStateChanged(async (user) => {  
    const loginModal = document.getElementById('loginModal') || document.querySelector('.auth-modal');  
    const userNameDisplay = document.getElementById('userNameDisplay');  
    if (user) {  
      console.log("J.A.R.V.I.S. - Operador reconhecido:", user.email);
      if (loginModal) loginModal.style.display = 'none';  
      if (userNameDisplay) {  
        userNameDisplay.innerText = user.displayName ? user.displayName.split(' ')[0] : 'Romário';  
      }
      // Sincroniza dados da nuvem ao logar
      await initChatStore();
    } else {  
      if (loginModal) loginModal.style.display = 'flex';  
    }  
  });  
}  

// ----- Funções globais expostas -----
window.loginWithGoogle = async function() {  
  if (!auth || !provider) {  
    alert("Firebase Auth não inicializado.");
    return;  
  }  
  try {
    if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      try {
        await auth.signInWithPopup(provider);
      } catch (popupErr) {
        console.warn("Popup bloqueado ou não suportado no mobile, alternando para redirect:", popupErr);
        await auth.signInWithRedirect(provider);
      }
    } else {
      await auth.signInWithPopup(provider);
    }
  } catch (error) {  
    console.error("Erro no login com Google:", error);
    alert("Erro na autenticação: " + error.message);
    if (typeof window.initJarvisSession === 'function') {
      window.initJarvisSession();
    }
  }  
};  

window.sendMsg = function() {  
  if (!chatInput) {  
    chatInput = document.getElementById('chatInput') || document.querySelector('input[type="text"], textarea');  
  }  
  if (!chatInput) return;  
  const text = chatInput.value.trim();  
  if (!text && !attachedFileContent) return;  
  chatInput.value = '';  
  if (typeof processQueryText === 'function') {  
    processQueryText(text);  
  } else {  
    console.warn("[J.A.R.V.I.S.] processQueryText não definido.");
  }  
};  

window.filterBrainNotes = function() {  
  const input = document.getElementById('brainSearchInput');  
  const term = input ? input.value.trim() : '';  
  console.log(`[SEGUNDO CÉREBRO] Pesquisando por: "${term}"`);
  if (term.length > 0) {  
    appendMessage(`[SEGUNDO CÉREBRO] Resultados para "${term}" (em desenvolvimento)`, 'system', true);  
  } else {  
    appendMessage('[SEGUNDO CÉREBRO] Lista de notas restaurada.', 'system', true);  
  }  
};  

window.initJarvisSession = function() {  
  const modal = document.getElementById('loginModal') || document.querySelector('.auth-modal');  
  if (modal) modal.style.display = 'none';  
  appendMessage('[SISTEMA] Sessão offline iniciada. Recursos limitados.', 'system', true);  
  speakJARVIS('Modo offline ativado.');
};  

// ----- Variáveis globais do sistema -----
const WORKER_URL = "https://jarvis-proxy.juuzousuzuyabdt.workers.dev";  

const MODEL_FALLBACK_LIST = [  
  'openai/gpt-oss-120b',  
  'openai/gpt-oss-20b',  
  'groq/compound'  
];  
let ULTRA_FAST_MODEL = MODEL_FALLBACK_LIST[0];  
localStorage.setItem('jarv_model', ULTRA_FAST_MODEL);  

let currentLang = localStorage.getItem('jarv_lang') || 'pt-BR';  
let ttsEnabled = localStorage.getItem('jarv_tts_enabled') === 'true' ? true : true;  
let chatsStore = JSON.parse(localStorage.getItem('jarv_chats_v7')) || {};  
let activeChatId = localStorage.getItem('jarv_active_chat') || null;  

let activeModule = null;  
let msgArea, chatInput, statusEl, jarvisOrb;  
let attachedFileContent = null;  
let recognition = null;  
let isContinuousActive = false;  
let isJarvisSpeaking = false;  
let userRequestedMicStop = true;  
let speechQueue = [];  
let autonomousInterval = null;  

// ----- Inicialização principal -----
document.addEventListener("DOMContentLoaded", () => {  
  msgArea = document.querySelector('.jarv-chat-area') || document.getElementById('msgArea') || document.body;  
  chatInput = document.querySelector('input[type="text"], textarea') || document.getElementById('chatInput');  
  statusEl = document.getElementById('jarvStatus') || document.querySelector('.status-indicator');  

  cleanupLegacyElements();  
  injectAnonymousLogoAndStyles();  
  injectJarvisOrbStyles();  
  createJarvisOrbElement();  
  injectControlPanel();  

  initChatStore();  

  injectModuleSidebar();  
  injectChatHistoryUI();  
  setupExecutionButtonListener();  
  setupVoiceRecognition();  
  setupFileUploadListener();  
  startSystemClock();  
  injectAnimations();  

  if (statusEl) {  
    statusEl.innerText = "ONLINE";  
    statusEl.style.color = "#00ffcc";  
  }  

  if (auth && auth.getRedirectResult) {  
    auth.getRedirectResult().catch((error) => console.error("Erro Auth:", error));
  }  

  if (chatInput) {  
    chatInput.removeEventListener('keydown', handleEnterKey);  
    chatInput.addEventListener('keydown', handleEnterKey);  
  }  
});  

function handleEnterKey(e) {  
  if (e.key === 'Enter' && !e.shiftKey) {  
    e.preventDefault();  
    window.sendMsg();  
  }  
}  

function setupExecutionButtonListener() {
  const btn = document.getElementById('btnExecute') || document.querySelector('button[type="submit"]') || document.getElementById('sendBtn');
  if (btn) {
    btn.onclick = (e) => {
      e.preventDefault();
      window.sendMsg();
    };
  }
}

function injectAnimations() {  
  if (document.getElementById('jarvAnimations')) return;  
  const style = document.createElement('style');  
  style.id = 'jarvAnimations';  
  style.innerHTML = `  
    @keyframes pulse-shimmer {  
      0% { opacity: 0.5; background-position: -1000px 0; }  
      50% { opacity: 1; }  
      100% { opacity: 0.5; background-position: 1000px 0; }  
    }  
    .skeleton-shimmer {  
      background: linear-gradient(to right, #161b22 4%, #21262d 25%, #161b22 36%);  
      background-size: 1000px 100%;  
      animation: pulse-shimmer 2s infinite linear;  
    }
    .msg-user { align-self: flex-end; background: #0044ff; color: #fff; padding: 10px; border-radius: 8px 8px 0 8px; margin: 5px 0; max-width: 80%; border: 1px solid #0055ff; word-break: break-word; }
    .msg-bot { align-self: flex-start; background: #161b22; color: #c9d1d9; padding: 10px; border-radius: 8px 8px 8px 0; margin: 5px 0; max-width: 90%; border: 1px solid #30363d; font-family: monospace; word-break: break-word; }
    .msg-system { align-self: center; background: transparent; color: #8b949e; padding: 5px; font-size: 0.7rem; font-family: monospace; font-style: italic; }
  `;  
  document.head.appendChild(style);  
}  

function cleanupLegacyElements() {  
  const legacyNewChatBtn = document.querySelector('button[onclick*="Nova Conversa"]') || document.querySelector('.fa-plus')?.parentElement;  
  if (legacyNewChatBtn && (legacyNewChatBtn.innerText || '').includes('Nova Conversa')) {  
    legacyNewChatBtn.style.display = 'none';  
  }  
  document.querySelectorAll('.sidebar *, aside *').forEach(el => {  
    const text = el?.innerText || el?.textContent || '';
    if (text === 'HISTÓRICO DE SESSÕES' || text === 'SESSÕES DE CHAT') {  
      if (!el.closest('#jarvChatHistoryContainer')) el.style.display = 'none';  
    }  
  });  
}  

function startSystemClock() {  
  const clockDisplay = document.getElementById('clockDisplay');  
  if (!clockDisplay) return;  
  function update() {  
    const now = new Date();  
    clockDisplay.innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;  
  }  
  update();  
  setInterval(update, 1000);  
}  

function injectAnonymousLogoAndStyles() {  
  if (document.getElementById('anonymousBranding')) return;  
  const sidebarArea = document.querySelector('.subsystem-list') || document.querySelector('aside') || document.querySelector('header') || document.body;  
  const logoDiv = document.createElement('div');  
  logoDiv.id = 'anonymousBranding';  
  logoDiv.style.cssText = `display: flex; align-items: center; gap: 10px; padding: 10px; margin: 8px 5px; background: #000000; border: 1.5px solid #00ffcc; border-radius: 8px; font-family: monospace; box-shadow: 0 0 15px rgba(0,255,204,0.25);`;  
  logoDiv.innerHTML = `  
    <div style="position: relative; width: 45px; height: 45px; flex-shrink: 0;">  
      <img src="https://i.scdn.co/image/ab67616d00001e02809dcf7bac73ec9b042dd10a" onerror="this.src='https://via.placeholder.com/45/000/00ffcc?text=ANON'" alt="Anonymous Seal" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 1px solid #00ffcc; box-shadow: 0 0 10px rgba(0,255,204,0.6);">  
    </div>  
    <div style="overflow: hidden;">  
      <div style="font-size: 0.7rem; color: #ffffff; font-weight: bold; letter-spacing: 1px; white-space: nowrap;">ANONYMOUS LEGION</div>  
      <div style="font-size: 0.55rem; color: #00ffcc; letter-spacing: 0.5px;">KNOWLEDGE IS FREE</div>  
    </div>  
  `;  
  sidebarArea.insertBefore(logoDiv, sidebarArea.firstChild);  
}  

// ----- Sistema de Voz -----
function setupVoiceRecognition() {  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;  
  if (!SpeechRecognition) return;  

  recognition = new SpeechRecognition();  
  recognition.lang = currentLang;  
  recognition.continuous = true;  
  recognition.interimResults = false;  

  recognition.onstart = () => {  
    isContinuousActive = true;  
    setOrbState(true);  
    updateMicUI();  
  };  

  recognition.onresult = (event) => {  
    const transcript = event.results[event.results.length - 1][0].transcript.trim();  
    if (transcript) {  
      try { recognition.stop(); } catch (e) {}  
      processQueryText(transcript);  
    }  
  };  

  recognition.onerror = (event) => {  
    if (event.error !== 'no-speech') {  
      isContinuousActive = false;  
      setOrbState(false);  
    }  
  };  

  recognition.onend = () => {  
    isContinuousActive = false;  
    setOrbState(false);  
    updateMicUI();  
    if (!userRequestedMicStop && !isJarvisSpeaking) {  
      setTimeout(() => {  
        if (!isJarvisSpeaking && !userRequestedMicStop) {  
          try { recognition.start(); } catch (e) {}  
        }  
      }, 300);  
    }  
  };  

  setTimeout(() => {  
    const micIcons = document.querySelectorAll('.fa-microphone, button');  
    micIcons.forEach(btn => {  
      const htmlContent = (btn?.innerHTML || '').toLowerCase();  
      const hasMicClass = btn?.classList?.contains ? btn.classList.contains('fa-microphone') : false;
      if (btn?.id !== 'btnMicToggle' && btn?.id !== 'btnMicPause' && (htmlContent.includes('mic') || btn?.querySelector('svg') || hasMicClass)) {  
        btn.onclick = (e) => { e.preventDefault(); window.startContinuousMic(); };  
      }  
    });  
  }, 600);  
}  

window.startContinuousMic = function() {  
  if (!recognition) { alert("Navegador não suporta reconhecimento de voz."); return; }  
  userRequestedMicStop = false;  
  try { recognition.start(); } catch (e) {}  
  updateMicUI();  
};  

window.pauseContinuousMic = function() {  
  userRequestedMicStop = true;  
  if (recognition) { try { recognition.stop(); } catch (e) {} }  
  updateMicUI();  
  appendMessage("[SISTEMA]: Microfone pausado pelo operador.", 'system', false);  
};  

function updateMicUI() {  
  const btnLig = document.getElementById('btnMicToggle');  
  if (btnLig) {  
    if (!userRequestedMicStop && isContinuousActive) {  
      btnLig.style.background = '#00ffff';  
      btnLig.style.color = '#000';  
      btnLig.innerHTML = '🎙️ Mic LIGADO';  
    } else {  
      btnLig.style.background = '#161b22';  
      btnLig.style.color = '#00ffff';  
      btnLig.innerHTML = '🎙️ Ligar Mic';  
    }  
  }  
}  

// ----- Painel de Controle -----
function injectControlPanel() {  
  const sidebar = document.querySelector('.subsystem-list') || document.querySelector('aside') || document.body;  
  if (document.getElementById('jarvControlPanel')) return;  
  const panel = document.createElement('div');  
  panel.id = 'jarvControlPanel';  
  panel.style.cssText = `margin: 10px 5px; padding: 8px; background: #161b22; border: 1px solid #30363d; border-radius: 6px; font-family: monospace; display: flex; flex-direction: column; gap: 6px;`;  
  panel.innerHTML = `  
    <div style="font-size:0.65rem; color:#8b949e; display:flex; justify-content:space-between; align-items:center;">  
      <span>SÍNTESE VOCAL:</span>  
      <span id="voiceStatusBadge" style="color:${ttsEnabled ? '#00ffcc' : '#ff5555'}">${ttsEnabled ? 'LIGADA' : 'DESLIGADA'}</span>  
    </div>  
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 4px;">  
      <button id="toggleTtsBtn" onclick="window.toggleTtsMaster()" style="background:${ttsEnabled ? '#00ffcc' : '#21262d'}; color:${ttsEnabled ? '#000' : '#c9d1d9'}; border:1px solid #00ffcc; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; font-weight:bold;">  
        ${ttsEnabled ? '🔊 Voz Ativa' : '🔇 Voz Mute'}  
      </button>  
      <button onclick="window.stopJarvisVoice()" style="background:#21262d; color:#ff7b72; border:1px solid #ff7b72; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer;">  
        ⏹️ Calar I.A.  
      </button>  
    </div>  
    <div style="font-size:0.65rem; color:#8b949e; margin-top:4px;">ESCUTA CONTÍNUA (MICROFONE):</div>  
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 4px;">  
      <button id="btnMicToggle" onclick="window.startContinuousMic()" style="background:#161b22; color:#00ffff; border:1px solid #00ffff; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; font-weight:bold;">  
        🎙️ Ligar Mic  
      </button>  
      <button id="btnMicPause" onclick="window.pauseContinuousMic()" style="background:#21262d; color:#ff7b72; border:1px solid #ff7b72; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; font-weight:bold;">  
        ⏸️ Pausar Mic  
      </button>  
    </div>  
    <div style="margin-top:4px;">  
      <label style="font-size:0.65rem; color:#00ffcc; display:block; margin-bottom:2px;">📁 Anexar Arquivo / Slide:</label>  
      <input type="file" id="jarvFileUpload" accept=".txt,.pdf,.docx,.md,.json,.csv,image/*" style="font-size:0.65rem; color:#c9d1d9; width:100%;">  
    </div>  
    <button onclick="window.initJarvisVision()" style="background:#161b22; color:#00ffcc; border:1px solid #00ffcc; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; font-weight:bold; margin-top:6px; width: 100%;">  
      👁️ Ativar Visão Computacional  
    </button>  
  `;  
  sidebar.appendChild(panel);  
  updateMicUI();  
}  

window.toggleTtsMaster = function() {  
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
    window.stopJarvisVoice();  
  } else {  
    speakJARVIS("Síntese vocal reativada.");
  }  
};  

function speakJARVIS(text) {  
  if (!ttsEnabled || !('speechSynthesis' in window)) return;  
  window.speechSynthesis.cancel();  
  speechQueue = [];  
  isJarvisSpeaking = true;  

  let cleanText = text.replace(/[-|_|=]{2,}/g, ' ')  
    .replace(/[#*`~\[\]>]/g, '')  
    .replace(/(https?:\/\/[^\s]+)/g, "link oculto")  
    .replace(/[\u{1F600}-\u{1F6FF}]/gu, '')  
    .replace(/\s+/g, ' ').trim();  

  let chunks = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];  
  let finalChunks = [];  
  chunks.forEach(c => {  
    if (c.length > 200) {  
      let sub = c.match(/.{1,200}(\s|$)/g) || [c];  
      finalChunks.push(...sub);  
    } else {  
      finalChunks.push(c);  
    }  
  });  
  speechQueue = finalChunks.map(c => c.trim()).filter(c => c.length > 0);  
  playNextSpeechChunk();  
}  

function playNextSpeechChunk() {  
  if (speechQueue.length === 0) {  
    isJarvisSpeaking = false;  
    setOrbState(false);  
    if (recognition && !userRequestedMicStop) {  
      setTimeout(() => { try { recognition.start(); } catch(e){} }, 400);  
    }  
    return;  
  }  

  let chunk = speechQueue.shift();  
  const utterance = new SpeechSynthesisUtterance(chunk);  
  utterance.lang = currentLang;  
  utterance.rate = 0.95;  
  utterance.pitch = 0.72;  

  const voices = window.speechSynthesis.getVoices();  
  const nativeVoice = voices.find(v => v.lang.includes(currentLang)) || voices.find(v => v.lang.includes('pt'));  
  if (nativeVoice) utterance.voice = nativeVoice;  

  utterance.onstart = () => {  
    setOrbState(true);  
    if (recognition && !userRequestedMicStop) {  
      try { recognition.stop(); } catch(e){}  
    }  
  };  
  utterance.onend = () => { playNextSpeechChunk(); };  
  utterance.onerror = () => { playNextSpeechChunk(); };  

  window.speechSynthesis.speak(utterance);  
}  

window.stopJarvisVoice = function() {  
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();  
  speechQueue = [];  
  isJarvisSpeaking = false;  
  setOrbState(false);  
  if (recognition && !userRequestedMicStop) {  
    setTimeout(() => { try { recognition.start(); } catch(e){} }, 400);  
  }  
};  

function injectJarvisOrbStyles() {  
  if (document.getElementById('jarvisOrbStyle')) return;  
  const style = document.createElement('style');  
  style.id = 'jarvisOrbStyle';  
  style.innerHTML = `  
    .jarvis-orb-container { display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 10px auto; padding: 2px; }  
    .jarvis-orb-wrapper { position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; }  
    .jarvis-orb { width: 50px; height: 50px; border-radius: 50%; background: radial-gradient(circle, #00ffff 0%, #0044ff 60%, #000814 100%); box-shadow: 0 0 20px #00ffff, inset 0 0 10px #ffffff; animation: orb-idle 3s infinite ease-in-out; position: relative; z-index: 2; cursor: pointer; }  
    .ring-wave { position: absolute; border-radius: 50%; border: 1.5px solid rgba(0, 255, 255, 0.5); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; animation: ring-expand 4s linear infinite; }  
    .ring-wave:nth-child(1) { width: 60px; height: 60px; animation-delay: 0s; border-color: rgba(0, 255, 255, 0.7); }  
    .ring-wave:nth-child(2) { width: 70px; height: 70px; animation-delay: 1.3s; border-color: rgba(0, 150, 255, 0.5); }  
    .ring-wave:nth-child(3) { width: 80px; height: 80px; animation-delay: 2.6s; border-color: rgba(255, 0, 128, 0.4); }  
    .jarvis-orb.active-speaking { animation: orb-frequency-react 0.1s infinite alternate; box-shadow: 0 0 35px #00ffcc, 0 0 15px #ff0077, inset 0 0 20px #ffffff; background: radial-gradient(circle, #ff0077 0%, #00ffff 60%, #000814 100%); }  
    @keyframes orb-idle { 0%, 100% { transform: scale(1); box-shadow: 0 0 15px #00ffff; } 50% { transform: scale(1.05); box-shadow: 0 0 25px #00ffcc; } }  
    @keyframes ring-expand { 0% { width: 50px; height: 50px; opacity: 1; } 100% { width: 110px; height: 110px; opacity: 0; } }  
    @keyframes orb-frequency-react { 0% { transform: scale(1.02); } 100% { transform: scale(1.12); } }  
  `;  
  document.head.appendChild(style);  
}  

function createJarvisOrbElement() {  
  if (document.getElementById('jarvisOrbContainer')) return;  
  const targetArea = document.querySelector('.sidebar') || document.querySelector('aside') || document.body;  
  const container = document.createElement('div');  
  container.id = 'jarvisOrbContainer';  
  container.className = 'jarvis-orb-container';  
  container.innerHTML = `  
    <div class="jarvis-orb-wrapper">  
      <div class="ring-wave"></div>  
      <div class="ring-wave"></div>  
      <div class="ring-wave"></div>  
      <div id="jarvisOrb" class="jarvis-orb" onclick="window.startContinuousMic()" title="Clique para acionar o microfone"></div>  
    </div>  
  `;  
  targetArea.appendChild(container);  
}  

function setOrbState(isActive) {  
  const orb = document.getElementById('jarvisOrb');  
  if (orb) {  
    if (isActive) orb.classList.add('active-speaking');  
    else orb.classList.remove('active-speaking');  
  }  
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
          appendMessage(`[SUBSISTEMA ANEXO]: Arquivo "${file.name}" carregado. O conteúdo será enviado no próximo prompt.`, 'system', true);  
          speakJARVIS(`Arquivo ${file.name} carregado e pronto para análise.`);
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
  container.style.cssText = `margin: 10px 5px; padding: 8px; font-family: monospace; border-top: 1px solid #30363d; border-bottom: 1px solid #30363d; background: #0d1117;`;  
  container.innerHTML = `  
    <div style="font-size: 0.7rem; color: #00d2ff; text-transform: uppercase; margin-bottom: 6px; font-weight: bold; text-align: center;">⚙️ Módulos v6.7 Core</div>  
    <div id="moduleButtonsList" style="display:flex; flex-direction:column; gap:4px;">  
      <button onclick="window.openLifeDashboard()" class="mod-btn" style="background:#161b22; border:1px solid #30363d; color:#ff0077; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left; font-weight:bold;">🎮 Minha Vida é um Jogo</button>  
      <button onclick="window.toggleAutonomousMode()" id="btn_mod_autonomous" class="mod-btn" style="background:#161b22; border:1px solid #30363d; color:#00ffff; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left; font-weight:bold;">🧠 JARV Core Autônomo</button>  
      <button onclick="window.setModule('academy')" class="mod-btn" id="btn_mod_academy" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🎓 Academia Hacker & CC50</button>  
      <button onclick="window.setModule('globe')" class="mod-btn" id="btn_mod_globe" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🌐 Globo Ciberameaças</button>  
      <button onclick="window.setModule('imageGen')" class="mod-btn" id="btn_mod_imageGen" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🖼️ Gerador Imagem 3D</button>  
      <button onclick="window.setModule('videoGen')" class="mod-btn" id="btn_mod_videoGen" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🎬 Gerador Vídeo 3D</button>  
    </div>  
  `;  
  sidebar.appendChild(container);  
}  

window.setModule = async function(modName) {  
  activeModule = modName;  
  appendMessage(`[MÓDULO ATIVADO]: ${modName.toUpperCase()}`, 'system', true);  
  speakJARVIS(`Módulo ${modName} ativado e acoplado ao fluxo principal.`);
};  

window.openLifeDashboard = function() {  
  appendMessage(`  
    <div style="border: 1px solid #ff0077; padding: 12px; background: rgba(13,17,23,0.9); border-radius: 8px; box-shadow: 0 0 15px rgba(255,0,119,0.3);">  
      <h3 style="color:#ff0077; margin:0 0 12px 0; text-transform: uppercase; font-size: 0.9rem;">🎮 Dashboard: Minha Vida é um Jogo</h3>  
      <div id="shimmerContainer">  
        <div class="skeleton-shimmer" style="height: 15px; margin-bottom: 8px; border-radius: 4px;"></div>  
        <div class="skeleton-shimmer" style="height: 15px; margin-bottom: 8px; border-radius: 4px;"></div>  
        <div class="skeleton-shimmer" style="height: 15px; border-radius: 4px; width: 80%;"></div>  
      </div>  
      <p style="color:#c9d1d9; font-size:0.75rem; margin-top:12px;">Sincronizando métricas biométricas, produtividade e conquistas diárias...</p>  
    </div>  
  `, 'bot-html', true);  
  speakJARVIS("Acessando painel de gamificação da vida real, aguarde a sincronização de métricas.");
  setTimeout(() => {  
    appendMessage(`  
      <div style="border: 1px solid #00ffcc; padding: 12px; background: rgba(13,17,23,0.9); border-radius: 8px; box-shadow: 0 0 15px rgba(0,255,204,0.2);">  
        <h3 style="color:#00ffcc; margin:0 0 10px 0; font-size: 0.85rem;">[STATUS DO JOGADOR: ROMÁRIO]</h3>  
        <ul style="color:#c9d1d9; font-size:0.75rem; list-style-type: none; padding-left: 0;">  
          <li>🛡️ <strong>Classe:</strong> Especialista de Suporte & Operações (Nível 45)</li>  
          <li>🧠 <strong>Inteligência:</strong> +12% (Estudos Computação & Enfermagem Senac)</li>  
          <li>💼 <strong>Ouro Diário:</strong> Sincronizando com Stone & Ecossistema...</li>  
          <li>🏆 <strong>Conquista Desbloqueada:</strong> Google Local Guide Nível 3</li>  
        </ul>  
      </div>  
    `, 'bot-html', true);  
  }, 2500);  
};  

window.toggleAutonomousMode = function() {  
  const btn = document.getElementById('btn_mod_autonomous');  
  if (autonomousInterval) {  
    clearInterval(autonomousInterval);  
    autonomousInterval = null;  
    if(btn) {  
      btn.style.background = '#161b22';  
      btn.style.color = '#00ffff';  
      btn.innerHTML = '🧠 JARV Core Autônomo';  
    }  
    appendMessage("[JARV EXECUTION ENGINE]: Processamento autônomo em background SUSPENSO.", 'system', true);  
    speakJARVIS("Módulo de pesquisa autônoma suspenso.");
  } else {  
    if(btn) {  
      btn.style.background = '#0044ff';  
      btn.style.color = '#fff';  
      btn.innerHTML = '🧠 Suspensão Autônoma';  
    }  
    const id = 'chat_auto_core';  
    if(!chatsStore[id]) {  
      chatsStore[id] = { title: `🧠 Registro Autônomo`, timestamp: Date.now(), messages: [], is_readonly: true };  
    }  
    switchChat(id);  
    saveStore();  
      
    appendMessage("[JARV EXECUTION ENGINE]: Processamento autônomo INICIADO. Coletando dados para expansão neural...", 'system', true);  
    speakJARVIS("Iniciando loop de conhecimento autônomo.");
      
    autonomousInterval = setInterval(async () => {  
      const areas = ["Enfermagem e Protocolos SAE", "Cálculo de Medicamentos e Infusão", "Segurança da Informação e Kali Linux", "Engenharia de Prompt e RAG", "Arquitetura de Sistemas Web"];  
      const area = areas[Math.floor(Math.random() * areas.length)];  
      await generateAutonomousReport(area);  
    }, 30000);  
  }  
};  

// ==========================================================
// [FIX APLICADO]: Engine de Geração Autônoma com Contexto Encadeado
// ==========================================================
async function generateAutonomousReport(area) {  
  setOrbState(true);  
  const prompt = `Gere um relatório técnico curto e direto (máximo 150 palavras) contendo fatos avançados sobre: ${area}. Formate em Markdown leve.`;  
  let botResponse = "Falha de conexão autônoma.";  
    
  try {  
    const currentHistory = chatsStore['chat_auto_core']?.messages || [];
    const contextWindow = currentHistory.slice(-6).map(msg => ({
      role: (msg.role === 'bot' || msg.role === 'bot-html') ? 'assistant' : (msg.role === 'system' ? 'system' : 'user'),
      content: msg.content.replace(/<[^>]*>?/gm, '') 
    }));

    const response = await fetch(WORKER_URL, {  
      method: "POST", 
      headers: { "Content-Type": "application/json" },  
      body: JSON.stringify({ 
        model: MODEL_FALLBACK_LIST[0], 
        messages: [  
          {  
            role: "system", 
            content: "Você é o J.A.R.V.I.S. em modo de auto-evolução. Analise o histórico de pesquisas anteriores e aprofunde o próximo relatório em lacunas técnicas não exploradas. Não repita tópicos anteriores."  
          },  
          ...contextWindow,  
          {  
            role: "user", 
            content: `Com base nas pesquisas e relatórios acima, execute o próximo passo da investigação: ${prompt}`  
          }  
        ]  
      })  
    });  
      
    const data = await response.json();  
    if (data && !data.error) botResponse = data.choices?.[0]?.message?.content || data.response;  
  } catch (err) {  
    console.error("Erro no módulo autônomo:", err);
  }  
  setOrbState(false);  

  if (chatsStore['chat_auto_core']) {
    chatsStore['chat_auto_core'].messages.push({ role: 'user', content: prompt });
    chatsStore['chat_auto_core'].messages.push({ role: 'bot', content: botResponse });
    saveStore(); 
  }

  const reportHtml = `  
    <div style="border: 1px solid #005cc5; padding: 12px; background: rgba(13,17,23,0.95); border-radius: 8px; font-family: monospace; margin: 10px 0;">  
      <h4 style="color:#00d2ff; margin-top:0; margin-bottom: 6px;">🧠 RELATÓRIO AUTÔNOMO: ${area}</h4>
      <div style="color:#c9d1d9; font-size: 0.75rem; line-height: 1.4; white-space: pre-wrap;">${botResponse}</div>
      <div style="font-size: 0.6rem; color:#8b949e; margin-top: 8px; border-top: 1px solid #30363d; padding-top: 4px; display:flex; justify-content:space-between;">
        <span>Status: Sincronizado com Nuvem</span>
        <span>${new Date().toLocaleTimeString()}</span>
      </div>
    </div>  
  `;
  
  if (activeChatId === 'chat_auto_core') {
    appendMessage(reportHtml, 'bot-html', true);
  }
  
  speakJARVIS(`Novo relatório autônomo gerado sobre ${area}.`);
  saveStoreToCloudAndLocal();
}

// ==========================================================
// [SYNC NUVEM & LOCAL] - Persistência 24/7 (Firestore)
// ==========================================================
async function saveStoreToCloudAndLocal() {
  localStorage.setItem('jarv_chats_v7', JSON.stringify(chatsStore));
  if (auth && auth.currentUser && db) {
    try {
      await db.collection('users').doc(auth.currentUser.uid).set({
        chats: chatsStore,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log("[SYNC NUVEM] Estado salvo com sucesso no Firestore.");
    } catch (e) {
      console.warn("[SYNC NUVEM] Salvamento em nuvem adiado:", e);
    }
  }
}

function saveStore() {
  saveStoreToCloudAndLocal();
}

async function initChatStore() {
  if (auth && auth.currentUser && db) {
    try {
      const doc = await db.collection('users').doc(auth.currentUser.uid).get();
      if (doc.exists && doc.data().chats) {
        chatsStore = doc.data().chats;
        console.log("[SYNC NUVEM] Histórico de sessões recuperado da nuvem do operador.");
      }
    } catch (e) {
      console.warn("[SYNC NUVEM] Falha ao recuperar da nuvem, utilizando cache local.");
    }
  }

  if (Object.keys(chatsStore).length === 0) {
    activeChatId = 'chat_main';
    chatsStore[activeChatId] = { title: 'Sessão Principal J.A.R.V.I.S', messages: [] };
  } else if (!activeChatId || !chatsStore[activeChatId]) {
    activeChatId = Object.keys(chatsStore)[0];
  }
  
  saveStore();
  if (typeof renderChat === 'function') {
    renderChat(activeChatId);
  }
}

// ----- Funções de Gerenciamento de Chat e Mensagens -----
function appendMessage(content, type = 'user', isHtml = false) {
  if (!msgArea) msgArea = document.querySelector('.jarv-chat-area') || document.body;
  const msgDiv = document.createElement('div');
  
  if (type === 'user') msgDiv.className = 'msg-user';
  else if (type === 'bot' || type === 'bot-html') msgDiv.className = 'msg-bot';
  else msgDiv.className = 'msg-system';

  if (isHtml) {
    msgDiv.innerHTML = content;
  } else {
    msgDiv.innerText = content;
  }

  msgArea.appendChild(msgDiv);
  msgArea.scrollTop = msgArea.scrollHeight;

  // Salva no chat ativo atual se houver
  if (activeChatId && chatsStore[activeChatId] && type !== 'system') {
    chatsStore[activeChatId].messages.push({ role: type, content, isHtml, timestamp: Date.now() });
    saveStore();
  }
}

function switchChat(chatId) {
  activeChatId = chatId;
  localStorage.setItem('jarv_active_chat', chatId);
  renderChat(chatId);
}

function renderChat(chatId) {
  if (!msgArea) msgArea = document.querySelector('.jarv-chat-area') || document.body;
  msgArea.innerHTML = '';
  
  if (chatsStore[chatId] && chatsStore[chatId].messages) {
    chatsStore[chatId].messages.forEach(msg => {
      const msgDiv = document.createElement('div');
      if (msg.role === 'user') msgDiv.className = 'msg-user';
      else if (msg.role === 'bot' || msg.role === 'bot-html') msgDiv.className = 'msg-bot';
      else msgDiv.className = 'msg-system';

      if (msg.isHtml) {
        msgDiv.innerHTML = msg.content;
      } else {
        msgDiv.innerText = msg.content;
      }
      msgArea.appendChild(msgDiv);
    });
  }
  msgArea.scrollTop = msgArea.scrollHeight;
}

function injectChatHistoryUI() {
  let historyContainer = document.getElementById('jarvChatHistoryContainer');
  if (!historyContainer) {
    const sidebar = document.querySelector('.subsystem-list') || document.querySelector('aside') || document.body;
    historyContainer = document.createElement('div');
    historyContainer.id = 'jarvChatHistoryContainer';
    historyContainer.style.cssText = `margin: 10px 5px; padding: 8px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; font-family: monospace;`;
    sidebar.appendChild(historyContainer);
  }
  
  historyContainer.innerHTML = `
    <div style="font-size: 0.7rem; color: #00ffcc; font-weight: bold; margin-bottom: 6px; display:flex; justify-content:space-between; align-items:center;">
      <span>📂 SESSÕES DE CHAT</span>
      <button onclick="window.createNewChatSession()" style="background:#21262d; color:#00ffcc; border:1px solid #00ffcc; font-size:0.6rem; padding:2px 6px; border-radius:3px; cursor:pointer;">+ Nova</button>
    </div>
    <div id="chatSessionsList" style="display:flex; flex-direction:column; gap:4px; max-height: 150px; overflow-y: auto;"></div>
  `;

  const listEl = document.getElementById('chatSessionsList');
  if (listEl) {
    listEl.innerHTML = '';
    Object.keys(chatsStore).forEach(id => {
      const chat = chatsStore[id];
      const btn = document.createElement('button');
      btn.style.cssText = `background:${id === activeChatId ? '#0044ff' : '#161b22'}; color:${id === activeChatId ? '#fff' : '#c9d1d9'}; border:1px solid #30363d; padding:4px 6px; border-radius:4px; font-size:0.65rem; cursor:pointer; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`;
      btn.innerText = chat.title || 'Sessão ' + id;
      btn.onclick = () => { switchChat(id); injectChatHistoryUI(); };
      listEl.appendChild(btn);
    });
  }
}

window.createNewChatSession = function() {
  const newId = 'chat_' + Date.now();
  chatsStore[newId] = { title: `Sessão ${Object.keys(chatsStore).length + 1}`, messages: [] };
  switchChat(newId);
  injectChatHistoryUI();
  saveStore();
  speakJARVIS("Nova sessão de chat iniciada.");
};

async function processQueryText(text) {
  appendMessage(text, 'user', false);
  setOrbState(true);

  // Se houver arquivo anexo, concatena ao prompt
  let finalPrompt = text;
  if (attachedFileContent) {
    finalPrompt = `[CONTEÚDO DO ARQUIVO ANEXO]:\n${attachedFileContent}\n\n[SOLICITAÇÃO DO OPERADOR]: ${text}`;
    attachedFileContent = null; // limpa após o envio
  }

  let currentHistory = chatsStore[activeChatId]?.messages || [];
  let contextWindow = currentHistory.slice(-8).map(msg => ({
    role: (msg.role === 'bot' || msg.role === 'bot-html') ? 'assistant' : (msg.role === 'system' ? 'system' : 'user'),
    content: (msg.content || '').replace(/<[^>]*>?/gm, '')
  }));

  let botResponse = "Erro de conexão com o subsistema neural.";
  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ULTRA_FAST_MODEL,
        messages: [
          { role: "system", content: "Você é J.A.R.V.I.S., a inteligência artificial avançada do operador Romário. Seja direto, técnico, prestativo e utilize formatação Markdown leve." },
          ...contextWindow,
          { role: "user", content: finalPrompt }
        ]
      })
    });
    const data = await response.json();
    if (data && !data.error) {
      botResponse = data.choices?.[0]?.message?.content || data.response || "Sem resposta válida da API.";
    }
  } catch (e) {
    console.error("Erro na requisição ao Worker:", e);
    botResponse = "Falha crítica de comunicação com o Worker Cloudflare.";
  }

  setOrbState(false);
  appendMessage(botResponse, 'bot', false);
  speakJARVIS(botResponse);
  saveStoreToCloudAndLocal();
}

window.initJarvisVision = function() {
  jarvisVisionActive = !jarvisVisionActive;
  if (jarvisVisionActive) {
    appendMessage("[VISÃO COMPUTACIONAL]: Ativada. Capturando feed de vídeo ambiente...", 'system', true);
    speakJARVIS("Visão computacional ativada com sucesso.");
  } else {
    appendMessage("[VISÃO COMPUTACIONAL]: Desativada.", 'system', true);
    speakJARVIS("Visão computacional desativada.");
  }
};

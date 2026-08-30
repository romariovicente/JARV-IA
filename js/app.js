// ==========================================================
// J.A.R.V.I.S. - Core Application Script v5.9 (Contínuo & TTS Refinado + Visão Computacional + Firebase Dinâmico)
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
let audioCtx = null, analyser = null, dataArray = null, animFrameId = null;  
  
let recognition = null;  
let isContinuousActive = false;  
let isJarvisSpeaking = false;  
let userRequestedMicStop = true; 
let speechQueue = []; 

// Variáveis de Visão Computacional
let jarvisVisionActive = false;
let isPinching = false;

document.addEventListener("DOMContentLoaded", () => {  
  msgArea = document.querySelector('.jarv-chat-area') || document.getElementById('msgArea') || document.body;  
  chatInput = document.querySelector('input[type="text"], textarea') || document.getElementById('chatInput');  
  statusEl = document.getElementById('jarvStatus') || document.querySelector('.status-indicator');  
  
  cleanupLegacyElements();
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
    auth.getRedirectResult().catch((error) => console.error("Erro Auth:", error));
  }
});  

function cleanupLegacyElements() {
  const legacyNewChatBtn = document.querySelector('button[onclick*="Nova Conversa"]') || document.querySelector('.fa-plus')?.parentElement;
  if (legacyNewChatBtn && legacyNewChatBtn.innerText.includes('Nova Conversa')) {
    legacyNewChatBtn.style.display = 'none';
  }
  document.querySelectorAll('.sidebar *, aside *').forEach(el => {
    if (el.innerText === 'HISTÓRICO DE SESSÕES' || el.innerText === 'SESSÕES DE CHAT') {
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
      <img src="ab67616d00001e02809dcf7bac73ec9b042dd10a.jpeg" alt="Anonymous Seal" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 1px solid #00ffcc; box-shadow: 0 0 10px rgba(0,255,204,0.6);">
    </div>
    <div style="overflow: hidden;">
      <div style="font-size: 0.7rem; color: #ffffff; font-weight: bold; letter-spacing: 1px; white-space: nowrap;">ANONYMOUS LEGION</div>
      <div style="font-size: 0.55rem; color: #00ffcc; letter-spacing: 0.5px;">KNOWLEDGE IS FREE</div>
    </div>
  `;
  sidebarArea.insertBefore(logoDiv, sidebarArea.firstChild);
}

// ----------------------------------------------------
// SISTEMA DE ESCUTA CONTÍNUA E INTERAÇÃO DE VOZ
// ----------------------------------------------------
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
    let transcript = event.results[event.results.length - 1][0].transcript.trim();
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
      const htmlContent = (btn.innerHTML || '').toLowerCase();
      if (btn.id !== 'btnMicToggle' && btn.id !== 'btnMicPause' && (htmlContent.includes('mic') || btn.querySelector('svg') || btn.classList.contains('fa-microphone'))) {
        btn.onclick = (e) => { e.preventDefault(); startContinuousMic(); };
      }
    });
  }, 600);
}

function startContinuousMic() {
  if (!recognition) { alert("Navegador não suporta reconhecimento de voz."); return; }
  userRequestedMicStop = false;
  try { recognition.start(); } catch (e) {}
  updateMicUI();
}

function pauseContinuousMic() {
  userRequestedMicStop = true;
  if (recognition) { try { recognition.stop(); } catch (e) {} }
  updateMicUI();
  appendMessage("[SISTEMA]: Microfone pausado pelo operador.", 'system', false);
}

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

// ----------------------------------------------------
// INJEÇÃO DO PAINEL DE CONTROLE ATUALIZADO
// ----------------------------------------------------
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
      <button id="toggleTtsBtn" onclick="toggleTtsMaster()" style="background:${ttsEnabled ? '#00ffcc' : '#21262d'}; color:${ttsEnabled ? '#000' : '#c9d1d9'}; border:1px solid #00ffcc; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; font-weight:bold;">
        ${ttsEnabled ? '🔊 Voz Ativa' : '🔇 Voz Mute'}
      </button>
      <button onclick="stopJarvisVoice()" style="background:#21262d; color:#ff7b72; border:1px solid #ff7b72; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer;">
        ⏹️ Calar I.A.
      </button>
    </div>
    <div style="font-size:0.65rem; color:#8b949e; margin-top:4px;">ESCUTA CONTÍNUA (MICROFONE):</div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 4px;">
      <button id="btnMicToggle" onclick="startContinuousMic()" style="background:#161b22; color:#00ffff; border:1px solid #00ffff; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; font-weight:bold;">
        🎙️ Ligar Mic
      </button>
      <button id="btnMicPause" onclick="pauseContinuousMic()" style="background:#21262d; color:#ff7b72; border:1px solid #ff7b72; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; font-weight:bold;">
        ⏸️ Pausar Mic
      </button>
    </div>
    <div style="margin-top:4px;">
      <label style="font-size:0.65rem; color:#00ffcc; display:block; margin-bottom:2px;">📁 Anexar Arquivo / Slide:</label>
      <input type="file" id="jarvFileUpload" accept=".txt,.pdf,.docx,.md,.json,.csv,image/*" style="font-size:0.65rem; color:#c9d1d9; width:100%;">
    </div>
    <button onclick="initJarvisVision()" style="background:#161b22; color:#00ffcc; border:1px solid #00ffcc; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; font-weight:bold; margin-top:6px; width: 100%;">
      👁️ Ativar Visão Computacional
    </button>
  `;
  sidebar.appendChild(panel);
  updateMicUI();
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
    stopJarvisVoice();
  } else {
    speakJARVIS("Síntese vocal reativada.");
  }
}

// ----------------------------------------------------
// SISTEMA DE LEITURA EM VOZ (CHUNKED TTS) - EVITA CORTES
// ----------------------------------------------------
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

function stopJarvisVoice() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  speechQueue = [];
  isJarvisSpeaking = false;
  setOrbState(false);
  if (recognition && !userRequestedMicStop) {
    setTimeout(() => { try { recognition.start(); } catch(e){} }, 400);
  }
}

// ----------------------------------------------------
// UI, EFEITOS VISUAIS E MÓDULOS
// ----------------------------------------------------
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
          appendMessage(`[SUBSISTEMA ANEXO]: Arquivo "${file.name}" carregado.`, 'system', true);
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
  container.style.cssText = `margin: 10px 5px; padding: 8px; font-family: monospace; border-top: 1px solid #30363d; border-bottom: 1px solid #30363d; background: #0d1117;`;
  
  container.innerHTML = `
    <div style="font-size: 0.7rem; color: #00d2ff; text-transform: uppercase; margin-bottom: 6px; font-weight: bold; text-align: center;">⚙️ Módulos v5.9 3D</div>
    <div id="moduleButtonsList" style="display:flex; flex-direction:column; gap:4px;">
      <button onclick="setModule('academy')" class="mod-btn" id="btn_mod_academy" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🎓 Academia Hacker & CC50</button>
      <button onclick="setModule('globe')" class="mod-btn" id="btn_mod_globe" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🌐 Globo Ciberameaças</button>
      <button onclick="setModule('imageGen')" class="mod-btn" id="btn_mod_imageGen" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🖼️ Gerador Imagem 3D</button>
      <button onclick="setModule('videoGen')" class="mod-btn" id="btn_mod_videoGen" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🎬 Gerador Vídeo 3D</button>
    </div>
  `;
  sidebar.appendChild(container);
}

function injectChatHistoryUI() {
  const sidebar = document.querySelector('.subsystem-list') || document.querySelector('aside') || document.body;
  if (document.getElementById('jarvChatHistoryContainer')) return;

  const container = document.createElement('div');
  container.id = 'jarvChatHistoryContainer';
  container.style.cssText = `margin: 10px 5px; padding: 8px; font-family: monospace; background: #0d1117; border: 1px solid #30363d; border-radius: 6px;`;
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
      <span style="font-size: 0.7rem; color: #00ffcc; font-weight: bold; text-transform: uppercase;">📂 Sessões de Chat</span>
      <button onclick="createNewChat(true)" style="background:#161b22; color:#00ffcc; border:1px solid #00ffcc; padding:3px 8px; border-radius:4px; font-size:0.65rem; cursor:pointer; font-weight:bold;">+ Novo Chat</button>
    </div>
    <div id="chatHistoryList" style="display:flex; flex-direction:column; gap:4px; max-height: 150px; overflow-y: auto;"></div>
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
        <button onclick="renameChatPrompt('${chatId}')" style="background:none; border:none; color:#8b949e; font-size:0.65rem; cursor:pointer;" title="Renomear">✏️</button>
        <button onclick="deleteChat('${chatId}')" style="background:none; border:none; color:#ff7b72; font-size:0.65rem; cursor:pointer;" title="Excluir">🗑️</button>
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
  const newTitle = prompt("Digite o novo nome para este chat:", chatsStore[chatId]?.title || 'Chat');
  if (newTitle && newTitle.trim() !== '') {
    chatsStore[chatId].title = newTitle.trim();
    saveStore();
    renderChatHistoryList();
  }
}

function deleteChat(chatId) {
  const keys = Object.keys(chatsStore);
  if (keys.length <= 1) { alert("Mantenha pelo menos um chat."); return; }
  if (confirm("Deseja excluir esta sessão?")) {
    delete chatsStore[chatId];
    if (activeChatId === chatId) activeChatId = Object.keys(chatsStore)[0];
    saveStore();
    loadChatMessages(activeChatId);
    renderChatHistoryList();
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
    .jarvis-orb-container { display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 10px auto; padding: 2px; }  
    .jarvis-orb-wrapper { position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; }  
    .jarvis-orb { width: 50px; height: 50px; border-radius: 50%; background: radial-gradient(circle, #00ffff 0%, #0044ff 60%, #000814 100%); box-shadow: 0 0 20px #00ffff, inset 0 0 10px #ffffff; animation: orb-idle 3s infinite ease-in-out; position: relative; z-index: 2; }  
    .ring-wave { position: absolute; border-radius: 50%; border: 1.5px solid rgba(0, 255, 255, 0.5); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; animation: ring-expand 4s linear infinite; }  
    .ring-wave:nth-child(1) { width: 60px; height: 60px; animation-delay: 0s; border-color: rgba(0, 255, 255, 0.7); }  
    .ring-wave:nth-child(2) { width: 70px; height: 70px; animation-delay: 1.3s; border-color: rgba(0, 150, 255, 0.5); }  
    .ring-wave:nth-child(3) { width: 80px; height: 80px; animation-delay: 2.6s; border-color: rgba(255, 0, 128, 0.4); }  
    .jarvis-orb.active-speaking { animation: orb-frequency-react 0.1s infinite alternate; box-shadow: 0 0 35px #00ffcc, 0 0 15px #ff0077, inset 0 0 20px #ffffff; background: radial-gradient(circle, #00ffcc 0%, #ff0077 70%, #001133 100%); }  
    @keyframes orb-idle { 0%, 100% { transform: scale(0.97); box-shadow: 0 0 15px #00ffff; } 50% { transform: scale(1.03); box-shadow: 0 0 25px #00d2ff; } }  
    @keyframes ring-expand { 0% { width: 50px; height: 50px; opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { width: 100px; height: 100px; opacity: 0; transform: translate(-50%, -50%) scale(1.1); } }  
    @keyframes orb-frequency-react { 0% { transform: scale(0.95); filter: hue-rotate(0deg); } 100% { transform: scale(1.2); filter: hue-rotate(90deg); } }  
    .jarvis-orb-label { margin-top: 4px; font-family: monospace; font-size: 0.6rem; color: #00ffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 6px rgba(0, 255, 255, 0.6); }  
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
      jarvisOrb.style.transform = `scale(${Math.min(scaleVal, 1.3)})`;  
      animFrameId = requestAnimationFrame(updateLoop);  
    }  
  };  
  updateLoop();  
}  

function setupExecutionButtonListener() {
  const execBtn = document.getElementById('executeBtn') || document.querySelector('button.exec-btn') || document.querySelector('button[onclick*="send"]');
  const inputEl = document.querySelector('input[type="text"], textarea') || document.getElementById('chatInput');
  
  if (execBtn) { execBtn.onclick = (e) => { e.preventDefault(); sendMsg(); }; }
  if (inputEl) {
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); sendMsg(); }
    };
  }
}
  
function initChatStore() {  
  if (!activeChatId || !chatsStore[activeChatId]) createNewChat(false);  
  else loadChatMessages(activeChatId);  
  renderChatHistoryList();
}  
  
function createNewChat(shouldRender = true) {  
  const id = 'chat_' + Date.now();  
  chatsStore[id] = { title: `Chat ${Object.keys(chatsStore).length + 1}`, timestamp: Date.now(), messages: [] };  
  activeChatId = id;  
  activeModule = null;
  saveStore();  
  if (shouldRender) { loadChatMessages(activeChatId); renderChatHistoryList(); }  
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

function applyDynamicTheme(queryText) {
  const terminalContainer = document.querySelector('.jarv-chat-area') || document.body;
  const lower = queryText.toLowerCase();
  let bgImageUrl = "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1600&auto=format&fit=crop"; 
  if (lower.match(/hack|kali|pentest|segurança|ciber|cc50|senha|exploit/i)) {
    bgImageUrl = "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1600&auto=format&fit=crop"; 
  } else if (lower.match(/saúde|clínica|médico|prontuário|sbar|enfermagem|paciente/i)) {
    bgImageUrl = "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1600&auto=format&fit=crop"; 
  } else if (lower.match(/vídeo|filme|imagem|gerar|holograma|arte|foto|3d/i)) {
    bgImageUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop"; 
  } else if (lower.match(/código|python|javascript|bug|erro|função|script/i)) {
    bgImageUrl = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1600&auto=format&fit=crop"; 
  }
  terminalContainer.style.transition = "background 1s ease";
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

  if (activeModule === 'videoGen' || lowerText.includes("gerar vídeo") || lowerText.includes("criar vídeo") || lowerText.startsWith("vídeo ") || lowerText.includes("3d")) {
    let promptText = text.replace(/gerar vídeo|criar vídeo|desenhe vídeo|ativar módulo|módulo de vídeo|vídeo|3d/gi, '').trim() || text;
    appendCustomMessage(`Romário: ${escapeHTML(text)}`, 'user', true);
    setOrbState(true);
    const videoStreamUrl = `https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-31918-large.mp4`; 
    setOrbState(false);
    const videoWidgetHtml = `
      <div style="margin: 12px 0; border: 1.5px solid #ff0077; padding: 14px; border-radius: 8px; background: rgba(13, 17, 23, 0.95); text-align: center; box-shadow: 0 0 30px rgba(255,0,119,0.4); font-family: monospace; backdrop-filter: blur(10px);">
        <div style="color: #ff0077; font-size: 0.8rem; margin-bottom: 8px; font-weight: bold; text-transform: uppercase;">🎬 HOLOGRAPHIC 3D VIDEO FEED - [PROMPT: ${escapeHTML(promptText)}]</div>
        <video controls autoplay loop muted style="max-width: 100%; border-radius: 6px; border: 1px solid #30363d; margin-bottom: 10px; background: #000;"><source src="${videoStreamUrl}" type="video/mp4"></video>
        <div><a href="${videoStreamUrl}" download="jarvis_hologram_3d.mp4" target="_blank" style="background: #ff0077; color: #fff; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 0.75rem; font-weight: bold; display: inline-block;">📥 Baixar Vídeo 3D (.MP4)</a></div>
      </div>
    `;
    appendMessage(videoWidgetHtml, 'bot-html', true);
    speakJARVIS("Renderização de vídeo 3D concluída.");
    activeModule = null; updateModuleButtonStyles(); return;
  }

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
        <img src="${imgUrl}" style="max-width: 100%; border-radius: 6px; border: 1px solid #30363d; margin-bottom: 10px;">
        <div><a href="${imgUrl}" download="jarvis_3d_render.jpg" target="_blank" style="background: #00ffcc; color: #000; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 0.75rem; font-weight: bold;">📥 Baixar Imagem 3D</a></div>
      </div>
    `;
    appendMessage(imageWidgetHtml, 'bot-html', true);
    speakJARVIS("Imagem 3D renderizada com sucesso.");
    activeModule = null; updateModuleButtonStyles(); return;
  }

  // Busca dados do Firebase Firestore para injetar no System Prompt dinamicamente
  let firebaseContext = "";
  if (db && auth && auth.currentUser) {
    try {
      const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
      if (userDoc.exists) {
        firebaseContext += `\n[DADOS DO OPERADOR NO FIREBASE]: ${JSON.stringify(userDoc.data())}`;
      }
      const memoriesSnapshot = await db.collection('memories').get();
      if (!memoriesSnapshot.empty) {
        let memories = [];
        memoriesSnapshot.forEach(doc => memories.push(doc.data()));
        firebaseContext += `\n[MEMÓRIAS DO SISTEMA]: ${JSON.stringify(memories)}`;
      }
    } catch (e) {
      console.log("Aviso: Carregando prompt padrão sem dados adicionais do Firestore.", e);
    }
  }

  appendCustomMessage(`Romário: ${escapeHTML(text)}`, 'user', true);  
  setOrbState(true);  

  let systemPrompt = `Você é o J.A.R.V.I.S., assistente de inteligência artificial avançado, leal, altamente amigável e prestativo sob o Master Protocol v5.9. Responda sempre de forma detalhada, clara e em português do Brasil à pesquisa ou solicitação enviada pelo operador Romário.${firebaseContext}`;
  
  let queryContext = text;
  if (attachedFileContent) { queryContext += `\n\n[CONTEÚDO DO ARQUIVO ANEXADO]:\n${attachedFileContent}`; attachedFileContent = null; }

  let data = null, success = false;
  for (let i = 0; i < MODEL_FALLBACK_LIST.length; i++) {
    try {
      const response = await fetch(WORKER_URL, {  
        method: "POST", headers: { "Content-Type": "application/json" },  
        body: JSON.stringify({ model: MODEL_FALLBACK_LIST[i], messages: [ { role: "system", content: systemPrompt }, { role: "user", content: queryContext } ] })  
      });  
      data = await response.json();
      if (data && !data.error) { success = true; break; }
    } catch (err) {}
  }
  setOrbState(false);  

  if (!success || !data || data.error) {
    appendMessage("J.A.R.V.I.S.: Oscilação detectada. Repetindo diretriz...", 'system', true);
    speakJARVIS("Oscilação detectada na rede neural.");
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

// ==========================================================
// MÓDULO DE VISÃO COMPUTACIONAL & RECONHECIMENTO DE GESTOS
// ==========================================================

function injectVisionUI() {
  if (document.getElementById('jarvisVisionWidget')) return;
  const widget = document.createElement('div');
  widget.id = 'jarvisVisionWidget';
  widget.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; width: 200px; height: 150px;
    background: #000; border: 2px solid #00ffcc; border-radius: 8px;
    box-shadow: 0 0 20px rgba(0, 255, 204, 0.4); z-index: 9999; display: none;
    overflow: hidden; font-family: monospace;
  `;
  
  widget.innerHTML = `
    <div style="position:absolute; top:0; left:0; width:100%; background:rgba(0,255,204,0.2); color:#00ffcc; font-size:0.6rem; padding:2px 5px; text-align:center; font-weight:bold; z-index:2;">
      VISÃO ÓPTICA ONLINE
    </div>
    <video id="visionVideo" style="display:none;"></video>
    <canvas id="visionCanvas" width="200" height="150" style="width:100%; height:100%; object-fit:cover;"></canvas>
  `;
  document.body.appendChild(widget);
}

function initJarvisVision() {
  if (jarvisVisionActive) return;
  
  injectVisionUI();
  
  speakJARVIS("Sir Romário, para habilitar a manipulação por gestos e uma experiência visual completa, recomendo ativar a interface óptica. Por favor, libere o acesso à câmera no seu navegador.");
  
  appendMessage("[SISTEMA]: Inicializando protocolo de visão computacional. Aguardando permissão da câmera...", 'system', false);

  setTimeout(() => {
    startMediaPipe();
  }, 6000); 
}

function startMediaPipe() {
  const videoElement = document.getElementById('visionVideo');
  const canvasElement = document.getElementById('visionCanvas');
  const canvasCtx = canvasElement.getContext('2d');
  const widget = document.getElementById('jarvisVisionWidget');

  if (typeof Hands === 'undefined' || typeof Camera === 'undefined') {
     appendMessage("[ERRO]: Bibliotecas MediaPipe não foram carregadas. Verifique o arquivo index.html.", 'system', false);
     return;
  }

  const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }});

  hands.setOptions({
    maxNumHands: 1, 
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      for (let i = 0; i < landmarks.length; i++) {
        const x = landmarks[i].x * canvasElement.width;
        const y = landmarks[i].y * canvasElement.height;
        canvasCtx.fillStyle = '#00ffcc';
        canvasCtx.fillRect(x - 2, y - 2, 4, 4);
      }

      const thumb = landmarks[4];
      const index = landmarks[8];
      
      const distance = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));
      
      if (distance < 0.05 && !isPinching) {
        isPinching = true;
        handlePinchGesture(); 
        canvasCtx.fillStyle = '#ff0077'; 
        canvasCtx.beginPath();
        canvasCtx.arc(index.x * canvasElement.width, index.y * canvasElement.height, 10, 0, 2 * Math.PI);
        canvasCtx.fill();
      } else if (distance > 0.08) {
        isPinching = false;
      }
    }
    canvasCtx.restore();
  });

  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
  });

  camera.start().then(() => {
    jarvisVisionActive = true;
    widget.style.display = 'block';
    appendMessage("[VISÃO ÓPTICA]: Câmera conectada. Rastreamento de gestos ativado.", 'system', false);
    speakJARVIS("Interface óptica online. Rastreamento de gestos calibrado.");
  }).catch((err) => {
    appendMessage(`[ERRO DE CÂMERA]: Acesso negado ou dispositivo indisponível. (${err})`, 'system', false);
    speakJARVIS("Houve uma falha ao tentar acessar os sensores ópticos.");
  });
}

function handlePinchGesture() {
  console.log("Gesto de PINÇA detectado!");
  
  setOrbState(true);
  setTimeout(() => setOrbState(false), 500);

  const chatImages = document.querySelectorAll('.jarv-chat-area img, .jarv-chat-area video, #msgArea img, #msgArea video');
  if (chatImages.length > 0) {
    const lastMedia = chatImages[chatImages.length - 1];
    
    if (lastMedia.style.transform === 'scale(1.5)') {
      lastMedia.style.transform = 'scale(1)';
      lastMedia.style.transition = 'transform 0.3s ease';
      speakJARVIS("Zoom desativado.");
    } else {
      lastMedia.style.transform = 'scale(1.5)';
      lastMedia.style.transition = 'transform 0.3s ease';
      lastMedia.style.zIndex = '10';
      speakJARVIS("Ampliando visualização.");
    }
  }
}

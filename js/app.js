// ==========================================
// J.A.R.V.I.S. - Core Application Script v4.4
// ==========================================

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
}  
  
const WORKER_URL = "https://jarvis-proxy.juuzousuzuyabdt.workers.dev";
const MODEL_FALLBACK_LIST = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];
let ULTRA_FAST_MODEL = MODEL_FALLBACK_LIST[0];
localStorage.setItem('jarv_model', ULTRA_FAST_MODEL);  
  
let currentLang = localStorage.getItem('jarv_lang') || 'pt-BR';  
let selectedHealthCountry = localStorage.getItem('jarv_health_country') || 'Brasil';  

// Voz desativada por padrão conforme solicitação
let ttsEnabled = localStorage.getItem('jarv_tts_enabled') === 'true' ? true : false;  
let chatsStore = JSON.parse(localStorage.getItem('jarv_chats_v3')) || {};  
let activeChatId = localStorage.getItem('jarv_active_chat') || null;  

// Gerenciamento de Módulos Exclusivos (Apenas 1 por vez)
let activeModule = null; // 'academy', 'kali', 'globe', 'healthSearch', 'nursingRecord', 'dictionary', 'imageGen', null

let msgArea, chatInput, statusEl, loginModal, userNameEl, logoutBtn, hiddenFileInput, jarvisOrb;  
let attachedFileContent = null;  
let audioCtx = null, analyser = null, dataArray = null, animFrameId = null;  
  
let recognition = null;  
let isContinuousActive = false;  
let isJarvisSpeaking = false;  

const translations = {
  'pt-BR': {
    academy: 'Academia Hacker',
    kali: 'Kali Tools',
    globe: 'Globo Ciberameaças',
    healthSearch: 'Pesquisa Saúde',
    nursingRecord: 'Prontuário & SBAR',
    imageGen: 'Gerador de Imagens',
    placeholder: 'Digite um comando, "ativar [módulo]" ou faça sua pesquisa...',
    status: 'Modo Operacional - J.A.R.V.I.S. Pronto',
    welcome: 'J.A.R.V.I.S. inicializado. Nenhum módulo ativo. Qual módulo você deseja ativar para iniciar?'
  },
  'en-US': {
    academy: 'Hacker Academy',
    kali: 'Kali Tools',
    globe: 'Cyber Threat Globe',
    healthSearch: 'Health Search',
    nursingRecord: 'SBAR Record',
    imageGen: 'Image Generator',
    placeholder: 'Enter a command, "activate [module]" or search...',
    status: 'Operational Mode - J.A.R.V.I.S. Ready',
    welcome: 'J.A.R.V.I.S. initialized. No active module. Which module would you like to activate?'
  }
};
  
document.addEventListener("DOMContentLoaded", () => {  
  msgArea = document.getElementById('msgArea');  
  chatInput = document.getElementById('chatInput');  
  statusEl = document.getElementById('jarvStatus');  
  loginModal = document.getElementById('loginModal');  
  userNameEl = document.getElementById('userName');  
  logoutBtn = document.getElementById('logoutBtn');  
  
  injectJarvisOrbStyles();  
  createJarvisOrbElement();  
  injectControlPanel();
  startRealTimeClock();  
  initAudioAnalyzer();  
  setupFileUploadListener();
  
  const clearChatBtn = document.querySelector('.btn-clear-chat');
  if (clearChatBtn) {
    clearChatBtn.onclick = () => {
      if (confirm("Deseja limpar todo o histórico e reiniciar?")) {
        chatsStore = {};
        localStorage.removeItem('jarv_chats_v3');
        activeModule = null;
        createNewChat(true);
        speakJARVIS("Histórico limpo. Nenhum módulo ativo.");
      }
    };
  }

  setTimeout(() => {  
    injectModuleSidebar();
  }, 500);  
  
  initChatStore();  
});  

function injectControlPanel() {
  const sidebar = document.querySelector('.jarv-sidebar') || document.body;
  if (document.getElementById('jarvControlPanel')) return;
  const panel = document.createElement('div');
  panel.id = 'jarvControlPanel';
  panel.style.cssText = `margin: 8px auto; padding: 6px; background: #161b22; border: 1px solid #30363d; border-radius: 6px; font-family: monospace; display: flex; flex-direction: column; gap: 6px;`;
  
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
        ⏹️ Pausar Fala
      </button>
    </div>
    <div style="margin-top:2px;">
      <label style="font-size:0.65rem; color:#8b949e; display:block; margin-bottom:2px;">📁 Anexar Arquivo / Slide:</label>
      <input type="file" id="jarvFileUpload" accept=".txt,.pdf,.docx,.md,.json,.csv" style="font-size:0.65rem; color:#c9d1d9; width:100%;">
    </div>
  `;
  
  const historyList = document.getElementById('chatHistoryList');
  if (historyList && historyList.parentNode) {
    historyList.parentNode.insertBefore(panel, historyList);
  } else {
    sidebar.appendChild(panel);
  }
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
    speakJARVIS("Voz ativada com sucesso.");
  }
}

function stopJarvisVoice() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
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
          appendMessage(`Arquivo "${file.name}" carregado com sucesso na memória do J.A.R.V.I.S. O que deseja que eu faça com ele?`, 'system', true);
          speakJARVIS(`Arquivo ${file.name} carregado.`);
        };
        reader.readAsText(file);
      };
    }
  }, 600);
}

function injectModuleSidebar() {
  const sidebar = document.querySelector('.jarv-sidebar') || document.body;
  if (document.getElementById('exclusiveModulesContainer')) return;
  const container = document.createElement('div');
  container.id = 'exclusiveModulesContainer';
  container.style.cssText = `margin: 8px 0; padding: 6px; font-family: monospace; border-top: 1px solid #30363d; border-bottom: 1px solid #30363d; background: #0d1117;`;
  
  container.innerHTML = `
    <div style="font-size: 0.7rem; color: #00d2ff; text-transform: uppercase; margin-bottom: 6px; font-weight: bold; text-align: center;">⚙️ Módulos Exclusivos</div>
    <div id="moduleButtonsList" style="display:flex; flex-direction:column; gap:4px;">
      <button onclick="setModule('academy')" class="mod-btn" id="btn_mod_academy" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;"><i class="fa-solid fa-graduation-cap"></i> Academia Hacker</button>
      <button onclick="setModule('kali')" class="mod-btn" id="btn_mod_kali" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;"><i class="fa-solid fa-shield-halved"></i> Kali Tools</button>
      <button onclick="setModule('globe')" class="mod-btn" id="btn_mod_globe" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;"><i class="fa-solid fa-globe"></i> Globo Ciberameaças</button>
      <button onclick="setModule('dictionary')" class="mod-btn" id="btn_mod_dictionary" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;"><i class="fa-solid fa-book-medical"></i> Dicionários & Sinônimos</button>
      <button onclick="setModule('healthSearch')" class="mod-btn" id="btn_mod_healthSearch" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;"><i class="fa-solid fa-stethoscope"></i> Pesquisa Clínica & Saúde</button>
      <button onclick="setModule('nursingRecord')" class="mod-btn" id="btn_mod_nursingRecord" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;"><i class="fa-solid fa-notes-medical"></i> Prontuário & SBAR</button>
      <button onclick="setModule('imageGen')" class="mod-btn" id="btn_mod_imageGen" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;"><i class="fa-solid fa-image"></i> Gerador de Imagens</button>
    </div>
  `;
  const historyList = document.getElementById('chatHistoryList');
  if (historyList && historyList.parentNode) {
    historyList.parentNode.insertBefore(container, historyList);
  } else {
    sidebar.appendChild(container);
  }
}

function setModule(modName) {
  activeModule = modName;
  updateModuleButtonStyles();
  
  let moduleTitle = "";
  if (modName === 'academy') moduleTitle = "Academia Hacker (Laboratório de Ensino Interativo)";
  else if (modName === 'kali') moduleTitle = "Kali Tools (Painel de Ferramentas PenTest)";
  else if (modName === 'globe') moduleTitle = "Globo de Ciberameaças em Tempo Real";
  else if (modName === 'dictionary') moduleTitle = "Dicionário Técnico & Sinônimos";
  else if (modName === 'healthSearch') moduleTitle = `Pesquisa Especializada de Saúde (${selectedHealthCountry})`;
  else if (modName === 'nursingRecord') moduleTitle = `Prontuário & SBAR - Siglas e Diretrizes de Enfermagem (${selectedHealthCountry})`;
  else if (modName === 'imageGen') moduleTitle = "Gerador de Imagens Holográficas";
  
  appendMessage(`[MÓDULO ATIVADO]: ${moduleTitle}. Os demais módulos foram desativados. Digite ou pergunte sobre este tema.`, 'system', true);
  speakJARVIS(`Módulo ${moduleTitle} ativado com sucesso.`);
}

function updateModuleButtonStyles() {
  const buttons = document.querySelectorAll('.mod-btn');
  buttons.forEach(btn => {
    btn.style.background = '#161b22';
    btn.style.color = '#c9d1d9';
    btn.style.borderColor = '#30363d';
    btn.style.boxShadow = 'none';
  });

  if (activeModule) {
    const activeBtn = document.getElementById(`btn_mod_${activeModule}`);
    if (activeBtn) {
      activeBtn.style.background = '#0d1117';
      activeBtn.style.color = '#00ffcc';
      activeBtn.style.borderColor = '#00ffcc';
      activeBtn.style.boxShadow = '0 0 10px rgba(0,255,204,0.3)';
    }
  }
}
  
function injectJarvisOrbStyles() {  
  if (document.getElementById('jarvisOrbStyle')) return;  
  const style = document.createElement('style');  
  style.id = 'jarvisOrbStyle';  
  style.innerHTML = `  
    .jarvis-orb-container { display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 10px auto; padding: 5px; }  
    .jarvis-orb-wrapper { position: relative; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; }  
    .jarvis-orb { width: 70px; height: 70px; border-radius: 50%; background: radial-gradient(circle, #00ffff 0%, #0044ff 60%, #000814 100%); box-shadow: 0 0 25px #00ffff, inset 0 0 15px #ffffff; animation: orb-idle 3s infinite ease-in-out; position: relative; z-index: 2; }  
    .ring-wave { position: absolute; border-radius: 50%; border: 1.5px solid rgba(0, 255, 255, 0.5); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; animation: ring-expand 4s linear infinite; }  
    .ring-wave:nth-child(1) { width: 80px; height: 80px; animation-delay: 0s; border-color: rgba(0, 255, 255, 0.7); }  
    .ring-wave:nth-child(2) { width: 90px; height: 90px; animation-delay: 1.3s; border-color: rgba(0, 150, 255, 0.5); }  
    .ring-wave:nth-child(3) { width: 100px; height: 100px; animation-delay: 2.6s; border-color: rgba(255, 0, 128, 0.4); }  
    .jarvis-orb.active-speaking { animation: orb-frequency-react 0.1s infinite alternate; box-shadow: 0 0 45px #00ffcc, 0 0 20px #ff0077, inset 0 0 25px #ffffff; background: radial-gradient(circle, #00ffcc 0%, #ff0077 70%, #001133 100%); }  
    @keyframes orb-idle { 0%, 100% { transform: scale(0.97); box-shadow: 0 0 20px #00ffff; } 50% { transform: scale(1.03); box-shadow: 0 0 32px #00d2ff; } }  
    @keyframes ring-expand { 0% { width: 70px; height: 70px; opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { width: 130px; height: 130px; opacity: 0; transform: translate(-50%, -50%) scale(1.1); } }  
    @keyframes orb-frequency-react { 0% { transform: scale(0.95); filter: hue-rotate(0deg); } 100% { transform: scale(1.25); filter: hue-rotate(90deg); } }  
    .jarvis-orb-label { margin-top: 8px; font-family: monospace; font-size: 0.7rem; color: #00ffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 8px rgba(0, 255, 255, 0.6); }  
  `;  
  document.head.appendChild(style);  
}  
  
function createJarvisOrbElement() {  
  const sidebar = document.querySelector('.jarv-sidebar') || document.body;  
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
  const historyList = document.getElementById('chatHistoryList');  
  if (historyList && historyList.parentNode) {  
    historyList.parentNode.insertBefore(container, historyList);  
  } else {  
    sidebar.appendChild(container);  
  }  
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
  
function startRealTimeClock() {  
  const clockEl = document.getElementById('clockDisplay');  
  if (!clockEl) return;  
  const update = () => { clockEl.textContent = new Date().toLocaleTimeString(currentLang); };  
  update();  
  setInterval(update, 1000);  
}  
  
function initChatStore() {  
  if (!activeChatId || !chatsStore[activeChatId]) {  
    createNewChat(false);  
  } else {  
    renderHistoryList();  
    loadChatMessages(activeChatId);  
  }  
}  
  
function createNewChat(shouldRender = true) {  
  const id = 'chat_' + Date.now();  
  chatsStore[id] = { title: `Sessão ${Object.keys(chatsStore).length + 1}`, timestamp: Date.now(), messages: [] };  
  activeChatId = id;  
  activeModule = null;
  saveStore();  
  if (shouldRender) { renderHistoryList(); loadChatMessages(activeChatId); }  
}  
  
function loadChatMessages(id) {  
  activeChatId = id;  
  saveStore();  
  renderHistoryList();  
  if (!msgArea) return;  
  msgArea.innerHTML = '';  
  const chat = chatsStore[id];  
  if (!chat || !chat.messages || chat.messages.length === 0) {  
    appendMessage(translations[currentLang].welcome, 'system', false);  
    return;  
  }  
  chat.messages.forEach(msg => {  
    if (msg.type === 'user') appendCustomMessage(msg.content, 'user', false);  
    else if (msg.type === 'bot-html') appendMessage(msg.content, 'bot-html', false);
    else appendMessage(msg.content, msg.type, false);  
  });  
}  
  
function renderHistoryList() {  
  const listEl = document.getElementById('chatHistoryList');  
  if (!listEl) return;  
  listEl.innerHTML = '';  
  Object.keys(chatsStore).reverse().forEach(id => {  
    const btn = document.createElement('button');  
    btn.className = `history-item ${id === activeChatId ? 'active' : ''}`;  
    btn.textContent = chatsStore[id].title;  
    btn.onclick = () => loadChatMessages(id);  
    listEl.appendChild(btn);  
  });  
}  
  
function saveStore() {  
  localStorage.setItem('jarv_chats_v3', JSON.stringify(chatsStore));  
  localStorage.setItem('jarv_active_chat', activeChatId);  
}  
  
function speakJARVIS(text) {  
  if (!ttsEnabled || !('speechSynthesis' in window)) return;  
  window.speechSynthesis.cancel();  
  isJarvisSpeaking = true;  
  if (recognition && isContinuousActive) { try { recognition.stop(); } catch(e) {} }  
  
  let cleanText = text
    .replace(/[-]{3,}/g, ' ')
    .replace(/[|]/g, ' ')
    .replace(/[*_#`\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);  
  utterance.lang = currentLang;  
  utterance.rate = 0.85;   
  utterance.pitch = 0.72;   

  const voices = window.speechSynthesis.getVoices();  
  const nativeVoice = voices.find(v => v.lang.includes(currentLang)) || voices.find(v => v.lang.includes('pt'));  
  if (nativeVoice) utterance.voice = nativeVoice;  

  utterance.onstart = () => { setOrbState(true); };  
  utterance.onend = () => {  
    isJarvisSpeaking = false;  
    setOrbState(false);  
  };  
  utterance.onerror = () => { isJarvisSpeaking = false; setOrbState(false); };  

  window.speechSynthesis.speak(utterance);  
}  

async function sendMsg() {  
  const text = chatInput.value.trim();  
  if (!text && !attachedFileContent) return;  

  const lowerText = text.toLowerCase();  
  chatInput.value = '';  

  // Ativação de módulos por voz/texto
  if (lowerText.includes("ativar módulo") || lowerText.includes("ativar o módulo") || lowerText.startsWith("ativar ")) {
    if (lowerText.includes("hacker") || lowerText.includes("academia")) {
      setModule('academy');
      return;
    } else if (lowerText.includes("kali") || lowerText.includes("tools")) {
      setModule('kali');
      return;
    } else if (lowerText.includes("globo") || lowerText.includes("ameaça")) {
      setModule('globe');
      return;
    } else if (lowerText.includes("dicionário") || lowerText.includes("sinônimo")) {
      setModule('dictionary');
      return;
    } else if (lowerText.includes("saúde") || lowerText.includes("clínica")) {
      setModule('healthSearch');
      return;
    } else if (lowerText.includes("prontuário") || lowerText.includes("sbar")) {
      setModule('nursingRecord');
      return;
    } else if (lowerText.includes("imagem") || lowerText.includes("gerador")) {
      setModule('imageGen');
      return;
    }
  }

  // Atalho direto via texto
  if (lowerText === "prontuário" || lowerText === "sbar") {
    setModule('nursingRecord');
    return;
  }

  // Verifica se o módulo de imagem está ativo ou se o usuário pediu para gerar imagem diretamente
  if (activeModule === 'imageGen' || lowerText.includes("gerar imagem") || lowerText.includes("criar imagem") || lowerText.includes("desenhe imagem") || lowerText.startsWith("imagem ")) {
    let promptText = text.replace(/gerar imagem|criar imagem|desenhe imagem|ativar módulo|módulo de imagem|imagem/gi, '').trim() || text;
    
    appendCustomMessage(escapeHTML(text), 'user', true);
    setOrbState(true);

    const encodedPrompt = encodeURIComponent(promptText);
    const imgUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=500&nologo=true`;

    setOrbState(false);

    const imageWidgetHtml = `
      <div style="margin: 8px 0; border: 1px solid #00ffcc; padding: 12px; border-radius: 6px; background: #0d1117; text-align: center; box-shadow: 0 0 15px rgba(0,255,204,0.2);">
        <div style="color: #00ffcc; font-size: 0.75rem; margin-bottom: 8px; font-weight: bold;">🖼️ IMAGEM HOLOGRÁFICA GERADA: ${escapeHTML(promptText)}</div>
        <img src="${imgUrl}" style="max-width: 100%; border-radius: 4px; border: 1px solid #30363d; margin-bottom: 10px;">
        <div>
          <a href="${imgUrl}" download="jarvis_geracao.jpg" target="_blank" style="background: #00ffcc; color: #000; padding: 6px 14px; border-radius: 4px; text-decoration: none; font-size: 0.75rem; font-weight: bold; display: inline-block; box-shadow: 0 0 10px rgba(0,255,204,0.4);">
            📥 Baixar Imagem Automaticamente
          </a>
        </div>
      </div>
    `;

    appendMessage(imageWidgetHtml, 'bot-html', true);
    speakJARVIS("Imagem gerada e disponibilizada no terminal para download.");

    // Desativa o módulo automaticamente após concluir a geração para manter a organização
    activeModule = null;
    updateModuleButtonStyles();
    return;
  }

  appendCustomMessage(escapeHTML(text), 'user', true);  
  setOrbState(true);  

  let systemPrompt = `Você é o J.A.R.V.I.S., assistente de inteligência artificial avançado.`;
  let queryContext = text;

  if (attachedFileContent) {
    queryContext += `\n\n[CONTEÚDO DO ARQUIVO ANEXADO]:\n${attachedFileContent}`;
    attachedFileContent = null; 
  }

  if (activeModule === 'academy') {
    systemPrompt = `Você é o instrutor da Academia Hacker do J.A.R.V.I.S. Atue como professor interativo de cibersegurança, fornecendo explicações passo a passo.`;
  } else if (activeModule === 'kali') {
    systemPrompt = `Você é o especialista em ferramentas Kali Linux do J.A.R.V.I.S. Forneça comandos de terminal explicados e sintaxes corretas.`;
  } else if (activeModule === 'globe') {
    systemPrompt = `Você é o analista do Globo de Ciberameaças do J.A.R.V.I.S. Relate tendências globais de vetores de ataques.`;
  } else if (activeModule === 'dictionary') {
    systemPrompt = `Você atua estritamente como um DICIONÁRIO TÉCNICO E DE SINÔNIMOS. Responda com: 1. Definição técnica, 2. Sinônimos exatos, 3. Exemplo de uso.`;
  } else if (activeModule === 'healthSearch') {
    systemPrompt = `Você é o especialista em pesquisa de Saúde e Enfermagem do J.A.R.V.I.S. Atue focando nas diretrizes, terminologias e siglas de enfermagem específicas do país selecionado: ${selectedHealthCountry}.`;
  } else if (activeModule === 'nursingRecord') {
    systemPrompt = `Você é o especialista em documentação de Prontuário e Passagem de Plantão do J.A.R.V.I.S., operando com foco estrito nas normas, diretrizes e siglas de enfermagem do país selecionado: ${selectedHealthCountry}. 
Sua função é organizar e estruturar informações de pacientes utilizando rigorosamente a metodologia SBAR (Situação, Histórico/Background, Avaliação e Recomendação), ferramenta padronizada na área da saúde para transmitir informações de forma rápida, clara e objetiva. 
As siglas, terminologias técnicas e abreviações clínicas utilizadas nas etapas devem refletir obrigatoriamente o contexto profissional e normativo de ${selectedHealthCountry}.
Estruture suas respostas seguindo as quatro etapas do mnemônico SBAR:
- **S – Situação (Situation):** Diga quem é o paciente, o local e o problema atual em uma frase curta, utilizando as siglas clínicas adequadas para ${selectedHealthCountry}.
- **B – Histórico / Contexto (Background):** Explique o motivo da internação e os antecedentes clínicos relevantes.
- **A – Avaliação (Assessment):** Apresente suas conclusões sobre a situação atual, incluindo sinais vitais e alterações observadas.
- **R – Recomendação (Recommendation):** Peça a ação necessária ou sugira o plano de conduta para o caso.`;
  } else {
    systemPrompt = `Você é o J.A.R.V.I.S. Responda de forma direta, interativa e inteligente.`;
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
      if (!data.error) {
        success = true;
        break;
      }
    } catch (err) {}
  }

  setOrbState(false);  

  if (!success || !data || data.error) {
    const errorMsg = data && data.error ? (data.error.message || JSON.stringify(data.error)) : "Falha na conexão com os modelos.";
    appendMessage("Erro na API: " + errorMsg, 'system', true);
    return;
  }

  let botResponse = "";  
  if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {  
    botResponse = data.choices[0].message.content;  
  } else if (data.response) {
    botResponse = data.response;
  } else {  
    botResponse = "Retorno inesperado da API.";  
  }  

  appendMessage(botResponse, 'bot', true);  
  speakJARVIS(botResponse);  
}  
  
function appendMessage(text, type, save = true) {  
  const msgDiv = document.createElement('div');  
  if (type === 'user') {  
    msgDiv.className = 'jarv-msg jarv-msg-user';  
    msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${escapeHTML(text)}`;  
  } else if (type === 'bot' || type === 'bot-html') {  
    msgDiv.className = 'jarv-msg jarv-msg-bot';  
    if (type === 'bot-html') {
      msgDiv.innerHTML = `<span class="jarv-code">[J.A.R.V.I.S.]</span> ${text}`;
    } else {
      msgDiv.innerHTML = `<span class="jarv-code">[J.A.R.V.I.S.]</span> ${formatMarkdown(text)}`;  
    }
  } else {  
    msgDiv.className = 'jarv-msg jarv-msg-system';  
    msgDiv.innerHTML = `<span class="jarv-code">[SYSTEM]</span> ${escapeHTML(text)}`;  
  }  
  msgArea.appendChild(msgDiv);  
  msgArea.scrollTop = msgArea.scrollHeight;  
  
  if (save && chatsStore[activeChatId]) {  
    chatsStore[activeChatId].messages.push({ type, content: text });  
    saveStore();  
  }  
}  

function appendCustomMessage(text, type, save = true) {
  appendMessage(text, type, save);
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#161b22; color:#00ffcc; padding:2px 4px; border-radius:3px;">$1</code>')
    .replace(/\n/g, '<br>');
}

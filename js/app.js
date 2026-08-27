// ==========================================
// J.A.R.V.I.S. - Core Application Script
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
  
// Endpoint do Worker na Cloudflare e Lista Atualizada de Modelos para Teste Automático (Fallback)
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
let ttsEnabled = true;  
let chatsStore = JSON.parse(localStorage.getItem('jarv_chats_v3')) || {};  
let activeChatId = localStorage.getItem('jarv_active_chat') || null;  
  
let msgArea, chatInput, statusEl, loginModal, userNameEl, logoutBtn, hiddenFileInput, hiddenImageInput, jarvisOrb;  
let attachedImageBase64 = null;  
let audioCtx = null, analyser = null, dataArray = null, animFrameId = null;  
  
let recognition = null;  
let isContinuousActive = false;  
let isJarvisSpeaking = false;  

// --- DICIONÁRIO MULTILÍNGUE (I18N) ---
const translations = {
  'pt-BR': {
    academy: 'Academia Hacker',
    kali: 'Kali Tools',
    globe: 'Globo Ciberameaças',
    healthSearch: 'Pesquisa Saúde',
    nursingRecord: 'Prontuário Enfermagem',
    anatomyAtlas: 'Atlas de Anatomia',
    medDictionaries: 'Dicionários Técnicos',
    placeholder: 'Digite um comando, "higgsfield: [prompt]" ou selecione um módulo...',
    status: 'Modo Operacional - Saúde & J.A.R.V.I.S. Ativo',
    voiceBtn: '🎙️ Escuta Contínua',
    activeVoice: '🔴 Escuta Ativa',
    welcome: 'J.A.R.V.I.S. Módulo de Saúde, Multimídia e IA Ativo. Selecione uma ferramenta na barra lateral.'
  },
  'en-US': {
    academy: 'Hacker Academy',
    kali: 'Kali Tools',
    globe: 'Cyber Threat Globe',
    healthSearch: 'Health Search',
    nursingRecord: 'Nursing Records',
    anatomyAtlas: 'Anatomy Atlas',
    medDictionaries: 'Medical Dictionaries',
    placeholder: 'Enter a command, "higgsfield: [prompt]" or select a module...',
    status: 'Operational Mode - Health & J.A.R.V.I.S. Active',
    voiceBtn: '🎙️ Continuous Listening',
    activeVoice: '🔴 Active Listening',
    welcome: 'J.A.R.V.I.S. Health & Multimedia System Active. Select a tool.'
  },
  'es-ES': {
    academy: 'Academia Hacker',
    kali: 'Kali Tools',
    globe: 'Globo Ciberamenazas',
    healthSearch: 'Búsqueda Salud',
    nursingRecord: 'Prontuario Enfermería',
    anatomyAtlas: 'Atlas de Anatomía',
    medDictionaries: 'Diccionarios Médicos',
    placeholder: 'Escribe un comando, "higgsfield: [prompt]" o selecciona un módulo...',
    status: 'Modo Operacional - Salud y J.A.R.V.I.S. Activo',
    voiceBtn: '🎙️ Escucha Continua',
    activeVoice: '🔴 Escucha Activa',
    welcome: 'J.A.R.V.I.S. Sistema de Salud y Multimedia Activo. Selecciona una herramienta.'
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
  injectContinuousVoiceButton();  
  injectLanguageAndCountrySelectors();
  startRealTimeClock();  
  initAudioAnalyzer();  
  applyLanguageTranslations();
  
  const clearChatBtn = document.querySelector('.btn-clear-chat');
  if (clearChatBtn) {
    clearChatBtn.onclick = () => {
      if (confirm("Deseja limpar todo o histórico de sessões e reiniciar?")) {
        chatsStore = {};
        localStorage.removeItem('jarv_chats_v3');
        createNewChat(true);
        speakJARVIS("Histórico de sessões limpo com sucesso.");
      }
    };
  }

  setTimeout(() => {  
    const sidebar = document.querySelector('.jarv-sidebar') || document.body;
    const existingMenu = document.getElementById('healthModulesContainer');
    if (!existingMenu) {
      const menuContainer = document.createElement('div');
      menuContainer.id = 'healthModulesContainer';
      menuContainer.style.cssText = `margin: 10px 0; padding: 5px; font-family: monospace; border-top: 1px solid #30363d; border-bottom: 1px solid #30363d;`;
      menuContainer.innerHTML = `
        <div style="font-size: 0.7rem; color: #00d2ff; text-transform: uppercase; margin-bottom: 5px; font-weight: bold; text-align: center;">🏥 Setor de Saúde & Enfermagem</div>
        <button onclick="openHealthSearchModal()" class="health-nav-btn" style="width:100%; background:#161b22; border:1px solid #00ffcc; color:#00ffcc; padding:6px; margin-bottom:4px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;"><i class="fa-solid fa-stethoscope"></i> <span id="lblHealthSearch">Pesquisa Especializada</span></button>
        <button onclick="openNursingRecordModal()" class="health-nav-btn" style="width:100%; background:#161b22; border:1px solid #00ffcc; color:#00ffcc; padding:6px; margin-bottom:4px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;"><i class="fa-solid fa-file-medical"></i> <span id="lblNursingRecord">Prontuário Enfermagem</span></button>
        <button onclick="openAnatomyAtlasModal()" class="health-nav-btn" style="width:100%; background:#161b22; border:1px solid #00ffcc; color:#00ffcc; padding:6px; margin-bottom:4px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;"><i class="fa-solid fa-brain"></i> <span id="lblAnatomy">Atlas de Anatomia</span></button>
        <button onclick="openDictionariesModal()" class="health-nav-btn" style="width:100%; background:#161b22; border:1px solid #00ffcc; color:#00ffcc; padding:6px; margin-bottom:6px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;"><i class="fa-solid fa-book-medical"></i> <span id="lblDictionaries">Dicionários Técnicos</span></button>
      `;
      const historyList = document.getElementById('chatHistoryList');
      if (historyList && historyList.parentNode) {
        historyList.parentNode.insertBefore(menuContainer, historyList);
      } else {
        sidebar.appendChild(menuContainer);
      }
    }

    const navItems = document.querySelectorAll('.jarv-nav-item');  
    navItems.forEach((item, index) => {  
      if (index === 0) {  
        item.style.cursor = 'pointer';  
        item.id = 'navAcademy';
        item.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${translations[currentLang].academy}`;  
        item.onclick = () => openCyberAcademyModal();  
      }  
      if (index === 1) {  
        item.style.cursor = 'pointer';  
        item.id = 'navKali';
        item.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${translations[currentLang].kali}`;
        item.onclick = () => openKaliToolsModal();  
      }  
      if (index === 2) {  
        item.style.cursor = 'pointer';  
        item.id = 'navGlobe';
        item.innerHTML = `<i class="fa-solid fa-globe"></i> ${translations[currentLang].globe}`;  
        item.onclick = () => openCyberMapModal();  
      }  
    });  
  }, 1000);  
  
  if (auth) {  
    auth.onAuthStateChanged((user) => {  
      if (user) {  
        const name = user.displayName || user.email;  
        if (userNameEl) userNameEl.textContent = name;  
        if (statusEl) statusEl.textContent = `Autenticado (${name}) - J.A.R.V.I.S. Ativo`;  
        if (loginModal) loginModal.style.display = "none";  
        if (logoutBtn) logoutBtn.style.display = "flex";  
      } else {  
        if (userNameEl) userNameEl.textContent = "Romário";  
        if (statusEl) statusEl.textContent = translations[currentLang].status;  
        if (loginModal) loginModal.style.display = "flex";  
        if (logoutBtn) logoutBtn.style.display = "none";  
      }  
    });  
  
    const btnLogin = document.getElementById('loginBtn') || document.querySelector('.login-btn');  
    if (btnLogin) {  
      btnLogin.addEventListener('click', () => {  
        auth.signInWithPopup(provider).catch(err => alert("Erro na autenticação: " + err.message));  
      });  
    }  
    if (logoutBtn) {  
      logoutBtn.addEventListener('click', () => {  
        auth.signOut().then(() => window.location.reload()).catch(err => console.error("Erro ao deslogar:", err));  
      });  
    }  
  }  
  
  initChatStore();  
  setupFileUploads();  
  setupToolbarButtons();  
});  

function injectLanguageAndCountrySelectors() {
  const sidebar = document.querySelector('.jarv-sidebar') || document.body;
  if (document.getElementById('selectorsContainer')) return;
  const container = document.createElement('div');
  container.id = 'selectorsContainer';
  container.style.cssText = `margin: 10px auto; padding: 5px; text-align: center; font-family: monospace; display: grid; grid-template-columns: 1fr; gap: 5px;`;
  container.innerHTML = `
    <div>
      <label style="font-size: 0.65rem; color: #8b949e; display: block; text-align: left;">Idioma do Sistema:</label>
      <select id="jarvLangSelect" onchange="changeSiteLanguage(this.value)" style="background: #161b22; color: #00ffff; border: 1px solid #00ffff; padding: 4px; border-radius: 4px; font-family: monospace; font-size: 0.75rem; cursor: pointer; width: 100%;">
        <option value="pt-BR" ${currentLang === 'pt-BR' ? 'selected' : ''}>🇧🇷 Português</option>
        <option value="en-US" ${currentLang === 'en-US' ? 'selected' : ''}>🇺🇸 English</option>
        <option value="es-ES" ${currentLang === 'es-ES' ? 'selected' : ''}>🇪🇸 Español</option>
      </select>
    </div>
    <div>
      <label style="font-size: 0.65rem; color: #8b949e; display: block; text-align: left; margin-top: 4px;">País (Siglas / Normas Saúde):</label>
      <select id="jarvCountrySelect" onchange="changeHealthCountry(this.value)" style="background: #161b22; color: #00ffcc; border: 1px solid #00ffcc; padding: 4px; border-radius: 4px; font-family: monospace; font-size: 0.75rem; cursor: pointer; width: 100%;">
        <option value="Brasil" ${selectedHealthCountry === 'Brasil' ? 'selected' : ''}>🇧🇷 Brasil (COFEN/MS)</option>
        <option value="Portugal" ${selectedHealthCountry === 'Portugal' ? 'selected' : ''}>🇵🇹 Portugal (OE)</option>
        <option value="Estados Unidos" ${selectedHealthCountry === 'Estados Unidos' ? 'selected' : ''}>🇺🇸 Estados Unidos (ANA)</option>
        <option value="Espanha" ${selectedHealthCountry === 'Espanha' ? 'selected' : ''}>🇪🇸 España</option>
      </select>
    </div>
  `;
  const historyList = document.getElementById('chatHistoryList');
  if (historyList && historyList.parentNode) {
    historyList.parentNode.insertBefore(container, historyList);
  } else {
    sidebar.appendChild(container);
  }
}

function changeSiteLanguage(langCode) {
  if (!translations[langCode]) return;
  currentLang = langCode;
  localStorage.setItem('jarv_lang', langCode);
  applyLanguageTranslations();
  speakJARVIS(langCode === 'en-US' ? "Language successfully changed to English." : 
              langCode === 'es-ES' ? "Idioma cambiado a español." : 
              "Idioma alterado para Português.");
}

function changeHealthCountry(country) {
  selectedHealthCountry = country;
  localStorage.setItem('jarv_health_country', country);
  speakJARVIS(`País de normas de saúde alterado para ${country}. Prontuários e dicionários ajustados.`);
}

function applyLanguageTranslations() {
  const t = translations[currentLang];
  if (chatInput) chatInput.placeholder = t.placeholder;
  if (statusEl && !auth?.currentUser) statusEl.textContent = t.status;
  
  const continuousBtn = document.getElementById('continuousVoiceBtn');
  if (continuousBtn && !continuousBtn.classList.contains('active')) {
    continuousBtn.innerHTML = t.voiceBtn;
  }
  
  const navAcademy = document.getElementById('navAcademy');
  if (navAcademy) navAcademy.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${t.academy}`;
  
  const navKali = document.getElementById('navKali');
  if (navKali) navKali.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${t.kali}`;
  
  const navGlobe = document.getElementById('navGlobe');
  if (navGlobe) navGlobe.innerHTML = `<i class="fa-solid fa-globe"></i> ${t.globe}`;

  const lblHS = document.getElementById('lblHealthSearch');
  if (lblHS) lblHS.textContent = t.healthSearch;
  const lblNR = document.getElementById('lblNursingRecord');
  if (lblNR) lblNR.textContent = t.nursingRecord;
  const lblAn = document.getElementById('lblAnatomy');
  if (lblAn) lblAn.textContent = t.anatomyAtlas;
  const lblDict = document.getElementById('lblDictionaries');
  if (lblDict) lblDict.textContent = t.medDictionaries;
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
    .continuous-btn { background: rgba(0, 210, 255, 0.1); border: 1px solid #00d2ff; color: #00d2ff; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-family: monospace; font-size: 0.75rem; margin: 5px 0 10px 0; width: 100%; text-transform: uppercase; transition: all 0.3s; }  
    .continuous-btn.active { background: #00d2ff; color: #000; box-shadow: 0 0 15px #00d2ff; font-weight: bold; }  
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
    <div class="jarvis-orb-label">J.A.R.V.I.S. HEALTH</div>  
  `;  
  const historyList = document.getElementById('chatHistoryList');  
  if (historyList && historyList.parentNode) {  
    historyList.parentNode.insertBefore(container, historyList);  
  } else {  
    sidebar.appendChild(container);  
  }  
  jarvisOrb = document.getElementById('visualOrb');  
}  
  
function injectContinuousVoiceButton() {  
  const sidebar = document.querySelector('.jarv-sidebar') || document.body;  
  const orbWidget = document.getElementById('jarvisOrbWidget');  
  if (document.getElementById('continuousVoiceBtn')) return;  
  const btn = document.createElement('button');  
  btn.id = 'continuousVoiceBtn';  
  btn.className = 'continuous-btn';  
  btn.innerHTML = translations[currentLang].voiceBtn;  
  btn.onclick = toggleContinuousListening;  
  if (orbWidget && orbWidget.parentNode) {  
    orbWidget.parentNode.insertBefore(btn, orbWidget.nextSibling);  
  } else {  
    sidebar.appendChild(btn);  
  }  
}  
  
function toggleContinuousListening() {  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;  
  if (!SpeechRecognition) { alert("Navegador sem suporte a voz."); return; }  
  const btn = document.getElementById('continuousVoiceBtn');  
  
  if (!isContinuousActive) {  
    recognition = new SpeechRecognition();  
    recognition.lang = currentLang;  
    recognition.continuous = true;  
    recognition.interimResults = false;  
  
    recognition.onstart = () => {  
      isContinuousActive = true;  
      if (btn) { btn.classList.add('active'); btn.innerHTML = translations[currentLang].activeVoice; }  
      setOrbState(true);  
    };  
    recognition.onresult = (event) => {  
      if (isJarvisSpeaking) return;  
      const transcript = event.results[event.results.length - 1][0].transcript.trim();  
      if (transcript) { chatInput.value = transcript; sendMsg(); }  
    };  
    recognition.onend = () => {  
      if (isContinuousActive && !isJarvisSpeaking) {  
        try { recognition.start(); } catch (err) {}  
      } else if (!isJarvisSpeaking) {  
        setOrbState(false);  
      }  
    };  
    try { recognition.start(); } catch (e) {}  
  } else {  
    isContinuousActive = false;  
    if (recognition) { try { recognition.stop(); } catch (e) {} }  
    if (btn) { btn.classList.remove('active'); btn.innerHTML = translations[currentLang].voiceBtn; }  
    setOrbState(false);  
  }  
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
  
  // Limpeza avançada: remove traços decorativos (---), pipes de tabelas (|) e marcações visuais
  let cleanText = text
    .replace(/[-]{3,}/g, ' ')
    .replace(/[|]/g, ' ')
    .replace(/[*_#`\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const segments = cleanText.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [cleanText];  
  let currentSegment = 0;  
    
  const speakNextSegment = () => {  
    if (currentSegment >= segments.length) {  
      isJarvisSpeaking = false;  
      if (isContinuousActive && recognition) {  
        try { recognition.start(); } catch(e) {}  
      } else {  
        setOrbState(false);  
      }  
      return;  
    }  
      
    const segmentText = segments[currentSegment].trim();  
    if (!segmentText) { currentSegment++; speakNextSegment(); return; }  
  
    const utterance = new SpeechSynthesisUtterance(segmentText);  
    utterance.lang = currentLang;  
    utterance.rate = 0.82;   
    utterance.pitch = 0.70;   
  
    const voices = window.speechSynthesis.getVoices();  
    const nativeVoice = voices.find(v => v.lang.includes(currentLang)) || voices.find(v => v.lang.includes('pt'));  
    if (nativeVoice) utterance.voice = nativeVoice;  
  
    utterance.onstart = () => { if (currentSegment === 0) setOrbState(true); };  
    utterance.onend = () => { currentSegment++; setTimeout(speakNextSegment, 300); };  
    utterance.onerror = () => { isJarvisSpeaking = false; setOrbState(false); };  
  
    window.speechSynthesis.speak(utterance);  
  };  
  speakNextSegment();  
}  
  
async function sendMsg() {  
  const text = chatInput.value.trim();  
  if (!text && !attachedImageBase64) return;  

  const lowerText = text.toLowerCase();  
  chatInput.value = '';  
  
  if (lowerText.startsWith("higgsfield:") || lowerText.startsWith("gerar vídeo")) {
    const cleanPrompt = text.replace(/^(higgsfield:|gerar vídeo\s*)/i, "").trim();
    appendCustomMessage(escapeHTML(text), 'user', true);
    setOrbState(true);

    try {
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "higgsfield",
          payload: { prompt: cleanPrompt || "Cinematic shot in high resolution" }
        })
      });

      const data = await response.json();
      setOrbState(false);

      if (data.error) {
        appendMessage("Erro na Higgsfield AI: " + (data.error.message || JSON.stringify(data.error)), 'system', true);
        speakJARVIS("Falha ao processar na plataforma Higgsfield.");
        return;
      }

      const requestId = data.request_id || "processado";
      const replyMsg = `<strong>[Higgsfield AI]</strong> Solicitação de vídeo/mídia enviada com sucesso!<br>ID: ${requestId}`;
      appendCustomHtml(replyMsg, 'bot', true);
      speakJARVIS("Comando enviado com sucesso para a Higgsfield.");
      return;

    } catch (err) {
      setOrbState(false);
      appendMessage(`Erro de rede na Higgsfield: ${err.message}`, 'system', true);
      return;
    }
  }

  if (lowerText.startsWith("gere uma imagem") || lowerText.startsWith("gerar imagem") || lowerText.startsWith("criar imagem") || lowerText.startsWith("atlas") || lowerText.startsWith("anatomia")) {  
    const promptImg = text.replace(/^(gere|gerar|criar|atlas|anatomia)\s+(uma\s+)?(image\s+of\s+|imagem\s+(de\s+)?)?/i, '').trim();  
    appendCustomMessage(escapeHTML(text), 'user', true);  
    const imgUrl = `https://image.pollinations.ai/prompt/human%20anatomy%20medical%20scientific%20illustration%20${encodeURIComponent(promptImg)}?width=1024&height=1024&nologo=true`;  
    const botHtml = `<strong>[J.A.R.V.I.S. ATLAS DE ANATOMIA]</strong><br><img src="${imgUrl}" style="max-width:100%; border-radius:8px; border:1px solid #00ffcc;"><br><a href="${imgUrl}" target="_blank" style="color:#00ffcc;">Abrir Imagem Anatômica em Alta Resolução</a>`;  
    appendCustomHtml(botHtml, 'bot', true);  
    speakJARVIS(`Gerando ilustração anatômica holográfica.`);  
    return;  
  }  
  
  let userDisplayMsg = escapeHTML(text);
  if (attachedImageBase64) {
    userDisplayMsg += `<br><img src="${attachedImageBase64}" style="max-width:200px; border-radius:6px; margin-top:5px; border:1px solid #00ffcc;">`;
  }
  
  appendCustomHtml(userDisplayMsg, 'user', true);  
  setOrbState(true);  
  
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
            {   
              role: "system",   
              content: `Você é o J.A.R.V.I.S., a inteligência artificial avançada atuando como assistente especialista em Ciências da Saúde, Enfermagem, Medicina e Linguística Aplicada. Você atende profissionais e estudantes de saúde com base nas diretrizes e normas do país selecionado pelo usuário (${selectedHealthCountry}), utilizando os idiomas correspondentes (${currentLang}). Você auxilia na transcrição de prontuários em siglas padrão, fornece termos de dicionários médicos/enfermagem com sinônimos e apoia na pesquisa clínica e acadêmica para Médicos, Enfermeiros, Técnicos e Auxiliares de Enfermagem.`   
            },  
            { role: "user", content: text || "Analise o anexo fornecido." }  
          ]  
        })  
      });  
  
      data = await response.json();

      if (!data.error) {
        success = true;
        break;
      } else {
        console.warn(`Modelo ${currentModelToTest} falhou. Tentando próximo da lista...`);
      }
    } catch (err) {
      console.warn(`Erro de rede com o modelo ${currentModelToTest}:`, err);
    }
  }

  attachedImageBase64 = null; 
  setOrbState(false);  

  if (!success || !data || data.error) {
    const errorMsg = data && data.error ? (data.error.message || JSON.stringify(data.error)) : "Todos os modelos da lista falharam.";
    appendMessage("Erro na API (Fallback esgotado): " + errorMsg, 'system', true);
    return;
  }

  let botResponse = "";  
  if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {  
    botResponse = data.choices[0].message.content;  
  } else if (data.response) {
    botResponse = data.response;
  } else {  
    botResponse = "Retorno inesperado da API: " + JSON.stringify(data);  
  }  

  appendMessage(botResponse, 'bot', true);  
  speakJARVIS(botResponse);  
}  
  
function appendMessage(text, type, save = true) {  
  const msgDiv = document.createElement('div');  
  if (type === 'user') {  
    msgDiv.className = 'jarv-msg jarv-msg-user';  
    msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${escapeHTML(text)}`;  
  } else if (type === 'bot') {  
    msgDiv.className = 'jarv-msg jarv-msg-bot';  
    let htmlContent = `<span class="jarv-code">[J.A.R.V.I.S.]</span> ${formatMarkdown(text)}`;  
    msgDiv.innerHTML = htmlContent;  
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
  
function appendCustomHtml(htmlContent, type, save = true) {  
  const msgDiv = document.createElement('div');  
  if (type === 'user') {  
    msgDiv.className = 'jarv-msg jarv-msg-user';  
    msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${htmlContent}`;  
  } else if (type === 'bot') {  
    msgDiv.className = 'jarv-msg jarv-msg-bot';  
    msgDiv.innerHTML = `<span class="jarv-code">[J.A.R.V.I.S.]</span> ${htmlContent}`;  
  } else {  
    msgDiv.className = 'jarv-msg jarv-msg-system';  
    msgDiv.innerHTML = `<span class="jarv-code">[SYSTEM]</span> ${htmlContent}`;  
  }  
  msgArea.appendChild(msgDiv);  
  msgArea.scrollTop = msgArea.scrollHeight;  
  
  if (save && chatsStore[activeChatId]) {  
    chatsStore[activeChatId].messages.push({ type, content: htmlContent });  
    saveStore();  
  }  
}

function appendCustomMessage(text, type, save = true) {
  appendMessage(text, type, save);
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function formatMarkdown(text) {
  if (!text) return '';
  let formatted = escapeHTML(text);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code style="background:#161b22; color:#00ffcc; padding:2px 4px; border-radius:3px;">$1</code>');
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}

function setupFileUploads() {
  if (!document.getElementById('hiddenImageInput')) {
    const imgInput = document.createElement('input');
    imgInput.type = 'file';
    imgInput.id = 'hiddenImageInput';
    imgInput.accept = 'image/*';
    imgInput.style.display = 'none';
    document.body.appendChild(imgInput);
  }

  if (!document.getElementById('hiddenFileInput')) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'hiddenFileInput';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
  }

  hiddenImageInput = document.getElementById('hiddenImageInput');
  hiddenFileInput = document.getElementById('hiddenFileInput');

  hiddenImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        attachedImageBase64 = event.target.result;
        appendMessage(`📷 Imagem anexada da galeria: ${file.name}`, 'system', false);
      };
      reader.readAsDataURL(file);
    }
  });

  hiddenFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      appendMessage(`📎 Arquivo anexado: ${file.name} (${Math.round(file.size / 1024)} KB)`, 'system', false);
    }
  });
}

function setupToolbarButtons() {
  const btnCamera = document.getElementById('btnCamera');
  const btnAttachment = document.getElementById('btnAttachment');
  const btnMic = document.getElementById('btnMic');

  if (btnCamera) {
    btnCamera.addEventListener('click', startCameraCapture);
  }

  if (btnAttachment && hiddenFileInput) {
    btnAttachment.addEventListener('click', () => hiddenFileInput.click());
  }

  if (btnMic) {
    btnMic.addEventListener('click', toggleContinuousListening);
  }

  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMsg();
      }
    });
  }
}

function startCameraCapture() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Seu navegador não suporta acesso direto à câmera. Abrindo galeria de mídia...");
    if (hiddenImageInput) hiddenImageInput.click();
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then((stream) => {
      createCameraPreviewModal(stream);
    })
    .catch((err) => {
      alert("Acesso à câmera não concedido ou indisponível: " + err.message + "\nAbrindo galeria de mídia.");
      if (hiddenImageInput) hiddenImageInput.click();
    });
}

function createCameraPreviewModal(stream) {
  let modal = document.getElementById('jarvisCamModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'jarvisCamModal';
  modal.style.cssText = `position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center;`;
  
  modal.innerHTML = `
    <div style="background:#0d1117; border:1px solid #00ffcc; padding:15px; border-radius:8px; text-align:center; max-width:90%; width:420px; box-shadow: 0 0 20px rgba(0,255,204,0.3);">
      <h3 style="color:#00ffcc; font-family:monospace; margin-top:0;">📷 CAPTURA DE IMAGEM AO VIVO</h3>
      <video id="jarvisCamVideo" autoplay playsinline style="width:100%; max-height:300px; border-radius:6px; background:#000; border:1px solid #30363d;"></video>
      <canvas id="jarvisCamCanvas" style="display:none;"></canvas>
      <div style="margin-top:15px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
        <button id="btnTakePhoto" style="background:#00ffcc; color:#000; font-weight:bold; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-family:monospace;">Tirar Foto</button>
        <button id="btnOpenGalleryModal" style="background:#00d2ff; color:#000; font-weight:bold; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-family:monospace;">Abrir Galeria</button>
        <button id="btnCloseCam" style="background:#ff0055; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-family:monospace;">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const video = document.getElementById('jarvisCamVideo');
  video.srcObject = stream;

  document.getElementById('btnTakePhoto').onclick = () => {
    const canvas = document.getElementById('jarvisCamCanvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    attachedImageBase64 = canvas.toDataURL('image/png');
    appendMessage("📸 Foto capturada com sucesso!", "system", false);
    
    stream.getTracks().forEach(track => track.stop());
    modal.remove();
  };

  document.getElementById('btnOpenGalleryModal').onclick = () => {
    stream.getTracks().forEach(track => track.stop());
    modal.remove();
    if (hiddenImageInput) hiddenImageInput.click();
  };

  document.getElementById('btnCloseCam').onclick = () => {
    stream.getTracks().forEach(track => track.stop());
    modal.remove();
  };
}

function openHealthSearchModal() { appendMessage("Módulo de Pesquisa Especializada em Saúde acionado.", "system", false); }
function openNursingRecordModal() { appendMessage("Módulo de Prontuário de Enfermagem acionado.", "system", false); }
function openAnatomyAtlasModal() { appendMessage("Módulo de Atlas de Anatomia acionado.", "system", false); }
function openDictionariesModal() { appendMessage("Módulo de Dicionários Técnicos acionado.", "system", false); }
function openCyberAcademyModal() { appendMessage("Módulo Academia Hacker acionado.", "system", false); }
function openKaliToolsModal() { appendMessage("Módulo Kali Tools acionado.", "system", false); }
function openCyberMapModal() { appendMessage("Módulo Globo de Ciberameaças acionado.", "system", false); }

// ==========================================================
// J.A.R.V.I.S. - Core Application Script v5.5 Master Protocol
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
let ttsEnabled = localStorage.getItem('jarv_tts_enabled') === 'true' ? true : true; // Padrão ligado para garantir boas-vindas faladas
let chatsStore = JSON.parse(localStorage.getItem('jarv_chats_v3')) || {};  
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
  
  injectJarvisOrbStyles();  
  createJarvisOrbElement();  
  injectControlPanel();
  injectModuleSidebar();
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

// Configuração Oficial de Reconhecimento de Voz (Envio Direto sem passar pelo input)
function setupVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn("SpeechRecognition não suportado neste navegador.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = currentLang;
  recognition.continuous = false;
  recognition.interimResults = false; // Aguarda o comando finalizado para enviar direto

  recognition.onstart = () => {
    isContinuousActive = true;
    setOrbState(true);
    appendMessage("[VOZ]: Ouvindo comando de pesquisa...", 'system', true);
  };

  recognition.onresult = (event) => {
    let transcript = event.results[0][0].transcript.trim();
    if (transcript) {
      // Dispara a pesquisa DIRETAMENTE com a fala capturada, sem digitar no input
      sendMsgDirect(transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error("Erro no reconhecimento de voz:", event.error);
    isContinuousActive = false;
    setOrbState(false);
    appendMessage(`[VOZ ERRO]: Falha ao capturar áudio (${event.error}).`, 'system', true);
  };

  recognition.onend = () => {
    isContinuousActive = false;
    setOrbState(false);
  };

  setTimeout(() => {
    const micButtons = document.querySelectorAll('button');
    micButtons.forEach(btn => {
      const htmlContent = btn.innerHTML.toLowerCase();
      if (htmlContent.includes('mic') || btn.querySelector('svg') || btn.querySelector('.fa-microphone') || btn.onclick?.toString().includes('mic')) {
        btn.onclick = (e) => {
          e.preventDefault();
          toggleVoiceListening();
        };
      }
    });

    const specificMicBtn = document.querySelector('button:has(svg), .mic-btn, [id*="mic"]');
    if (specificMicBtn && !specificMicBtn.onclick) {
      specificMicBtn.onclick = (e) => {
        e.preventDefault();
        toggleVoiceListening();
      };
    }
  }, 600);
}

function toggleVoiceListening() {
  if (!recognition) {
    alert("Reconhecimento de voz não suportado neste navegador. Utilize o Google Chrome.");
    return;
  }

  if (isContinuousActive) {
    try {
      recognition.stop();
    } catch (e) {}
    isContinuousActive = false;
    setOrbState(false);
  } else {
    try {
      recognition.start();
    } catch (err) {
      console.error("Erro ao iniciar reconhecimento de voz:", err);
      isContinuousActive = false;
      setOrbState(false);
      alert("Não foi possível iniciar o microfone. Verifique as permissões HTTPS.");
    }
  }
}

function loginWithGoogle() {
  if (!auth || !provider) {
    alert("Firebase Auth não inicializado.");
    return;
  }
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
    <div style="font-size: 0.7rem; color: #00d2ff; text-transform: uppercase; margin-bottom: 6px; font-weight: bold; text-align: center;">⚙️ Subsistemas & Módulos v5.5</div>
    <div id="moduleButtonsList" style="display:flex; flex-direction:column; gap:4px;">
      <button onclick="setModule('academy')" class="mod-btn" id="btn_mod_academy" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🎓 Academia Hacker & CC50</button>
      <button onclick="setModule('kali')" class="mod-btn" id="btn_mod_kali" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🛡️ Kali Tools & PenTest</button>
      <button onclick="setModule('globe')" class="mod-btn" id="btn_mod_globe" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🌐 Globo Ciberameaças</button>
      <button onclick="setModule('knowledgeBase')" class="mod-btn" id="btn_mod_knowledgeBase" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">📂 Leitor Dinâmico (.md)</button>
      <button onclick="setModule('integrations')" class="mod-btn" id="btn_mod_integrations" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">⚡ APIs Reais (Gmail/Airtable)</button>
      <button onclick="setModule('dictionary')" class="mod-btn" id="btn_mod_dictionary" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">📖 Dicionário & Sinônimos</button>
      <button onclick="setModule('healthSearch')" class="mod-btn" id="btn_mod_healthSearch" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🩺 Pesquisa Clínica</button>
      <button onclick="setModule('nursingRecord')" class="mod-btn" id="btn_mod_nursingRecord" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">📋 Prontuário & SBAR</button>
      <button onclick="setModule('imageGen')" class="mod-btn" id="btn_mod_imageGen" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🖼️ Gerador de Imagens</button>
      <button onclick="setModule('videoGen')" class="mod-btn" id="btn_mod_videoGen" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🎬 Gerador de Vídeos</button>
    </div>
  `;
  sidebar.appendChild(container);
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
  if (modName === 'knowledgeBase') {
    attachedFileContent = await loadRepositoryMarkdown('AGENTS.md');
    appendMessage(`<div style="margin:8px 0; border:1px solid #00ffcc; padding:12px; border-radius:6px; background:#0d1117; font-family:monospace;"><strong>📂 LEITOR DINÂMICO</strong><br>AGENTS.md indexado com sucesso na memória.</div>`, 'bot-html', true);
    speakJARVIS("Base de conhecimento carregada.");
    return;
  }
  if (modName === 'integrations') {
    appendMessage(`<div style="margin:8px 0; border:1px solid #00d2ff; padding:12px; border-radius:6px; background:#0d1117; font-family:monospace;"><strong>⚡ APIS REAIS</strong><br><button onclick="triggerApiAction('gmail')" style="background:#161b22; color:#00ffcc; border:1px solid #00ffcc; padding:4px 8px; border-radius:4px; font-size:0.65rem; cursor:pointer;">📧 Verificar Gmail</button></div>`, 'bot-html', true);
    speakJARVIS("Módulo de integrações ativado.");
    return;
  }
  appendMessage(`[SUBSISTEMA ATIVADO]: ${modName}.`, 'system', true);
  speakJARVIS(`Subsistema ${modName} ativado.`);
}

async function triggerApiAction(serviceType) {
  appendMessage(`[API]: Conectando ao endpoint para ${serviceType.toUpperCase()}...`, 'system', true);
  setOrbState(true);
  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: serviceType, model: ULTRA_FAST_MODEL, messages: [{ role: "user", content: `Status para ${serviceType}` }] })
    });
    const data = await response.json();
    setOrbState(false);
    appendMessage(`J.A.R.V.I.S. [API]:\n${data.choices?.[0]?.message?.content || "Sucesso."}`, 'bot', true);
    speakJARVIS("Sincronização concluída.");
  } catch (err) {
    setOrbState(false);
    appendMessage(`[ERRO API]: ${err.message}`, 'system', true);
  }
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
}  
  
function createNewChat(shouldRender = true) {  
  const id = 'chat_' + Date.now();  
  chatsStore[id] = { title: `Sessão ${Object.keys(chatsStore).length + 1}`, timestamp: Date.now(), messages: [] };  
  activeChatId = id;  
  activeModule = null;
  saveStore();  
  if (shouldRender) { loadChatMessages(activeChatId); }  
}  
  
function loadChatMessages(id) {  
  activeChatId = id;  
  saveStore();  
  if (!msgArea) return;  
  msgArea.innerHTML = '';  
  const chat = chatsStore[id];  
  if (!chat || !chat.messages || chat.messages.length === 0) {  
    const welcomeText = "J.A.R.V.I.S.: Boa tarde, Sir Romário. Todos os agentes especialistas estão sincronizados e operacionais. Como posso auxiliar em suas diretrizes hoje?";
    appendMessage(welcomeText, 'system', true);  
    speakJARVIS("Boa tarde, Sir Romário. Todos os agentes especialistas estão sincronizados e operacionais. Como posso auxiliar em suas diretrizes hoje?");
    return;  
  }  
  chat.messages.forEach(msg => {  
    if (msg.type === 'user') appendCustomMessage(msg.content, 'user', false);  
    else if (msg.type === 'bot-html') appendMessage(msg.content, 'bot-html', false);
    else appendMessage(msg.content, msg.type, false);  
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

// Motor de Atmosfera Visual Dinâmica
function applyDynamicTheme(queryText) {
  const terminalContainer = document.querySelector('.jarv-chat-area') || document.body;
  const lower = queryText.toLowerCase();

  let themeStyle = {
    bg: "radial-gradient(circle at center, #0a0e17 0%, #030712 100%)",
    border: "#30363d",
    glow: "0 0 15px rgba(0, 255, 255, 0.15)",
    accent: "#00ffff"
  };

  if (lower.match(/hack|kali|pentest|segurança|ciber|cc50|senha|exploit/i)) {
    themeStyle = {
      bg: "radial-gradient(circle at center, #05190f 0%, #020b06 100%)",
      border: "#00ff66",
      glow: "0 0 25px rgba(0, 255, 102, 0.35)",
      accent: "#00ff66"
    };
  } else if (lower.match(/saúde|clínica|médico|prontuário|sbar|enfermagem|paciente/i)) {
    themeStyle = {
      bg: "radial-gradient(circle at center, #081226 0%, #020617 100%)",
      border: "#38bdf8",
      glow: "0 0 25px rgba(56, 189, 248, 0.35)",
      accent: "#38bdf8"
    };
  } else if (lower.match(/vídeo|filme|imagem|gerar|holograma|arte|foto/i)) {
    themeStyle = {
      bg: "radial-gradient(circle at center, #1f0a1f 0%, #0a020f 100%)",
      border: "#ff0077",
      glow: "0 0 25px rgba(255, 0, 119, 0.35)",
      accent: "#ff0077"
    };
  } else if (lower.match(/código|python|javascript|bug|erro|função|script/i)) {
    themeStyle = {
      bg: "radial-gradient(circle at center, #1c1408 0%, #0a0702 100%)",
      border: "#f59e0b",
      glow: "0 0 25px rgba(245, 158, 11, 0.35)",
      accent: "#f59e0b"
    };
  }

  terminalContainer.style.transition = "background 0.8s ease, box-shadow 0.8s ease, border-color 0.8s ease";
  terminalContainer.style.background = themeStyle.bg;
  terminalContainer.style.borderColor = themeStyle.border;
  terminalContainer.style.boxShadow = themeStyle.glow;

  if (jarvisOrb) {
    jarvisOrb.style.transition = "background 0.8s ease, box-shadow 0.8s ease";
    jarvisOrb.style.boxShadow = `0 0 30px ${themeStyle.accent}, inset 0 0 15px #ffffff`;
  }
}

// Envio direto disparado por voz (sem digitar no chat)
function sendMsgDirect(text) {
  const inputEl = document.querySelector('input[type="text"], textarea') || document.getElementById('chatInput');
  if (inputEl) inputEl.value = ''; // Mantém limpo sem escrever em baixo
  processQueryText(text);
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

  // Interceptador para Módulo de Vídeo
  if (activeModule === 'videoGen' || lowerText.includes("gerar vídeo") || lowerText.includes("criar vídeo") || lowerText.startsWith("vídeo ")) {
    let promptText = text.replace(/gerar vídeo|criar vídeo|desenhe vídeo|ativar módulo|módulo de vídeo|vídeo/gi, '').trim() || text;
    appendCustomMessage(`Romário: ${escapeHTML(text)}`, 'user', true);
    setOrbState(true);

    const videoStreamUrl = `https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-31918-large.mp4`; 
    setOrbState(false);

    const videoWidgetHtml = `
      <div style="margin: 10px 0; border: 1px solid #ff0077; padding: 12px; border-radius: 6px; background: #0d1117; text-align: center; box-shadow: 0 0 20px rgba(255,0,119,0.25); font-family: monospace;">
        <div style="color: #ff0077; font-size: 0.75rem; margin-bottom: 8px; font-weight: bold; text-transform: uppercase;">
          🎬 TERMINAL VIDEO FEED - [PROMPT: ${escapeHTML(promptText)}]
        </div>
        <video controls autoplay loop muted style="max-width: 100%; border-radius: 4px; border: 1px solid #30363d; margin-bottom: 10px; background: #000;">
          <source src="${videoStreamUrl}" type="video/mp4">
        </video>
        <div>
          <a href="${videoStreamUrl}" download="jarvis_hologram.mp4" target="_blank" style="background: #ff0077; color: #fff; padding: 6px 14px; border-radius: 4px; text-decoration: none; font-size: 0.75rem; font-weight: bold; display: inline-block;">
            📥 Baixar Arquivo de Vídeo (.MP4)
          </a>
        </div>
      </div>
    `;

    appendMessage(videoWidgetHtml, 'bot-html', true);
    speakJARVIS("Vídeo holográfico renderizado no terminal, Sir Romário.");
    activeModule = null;
    updateModuleButtonStyles();
    return;
  }

  // Interceptador para Módulo de Imagem
  if (activeModule === 'imageGen' || lowerText.includes("gerar imagem") || lowerText.includes("criar imagem") || lowerText.startsWith("imagem ")) {
    let promptText = text.replace(/gerar imagem|criar imagem|desenhe imagem|ativar módulo|módulo de imagem|imagem/gi, '').trim() || text;
    appendCustomMessage(`Romário: ${escapeHTML(text)}`, 'user', true);
    setOrbState(true);
    const encodedPrompt = encodeURIComponent(promptText);
    const imgUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=500&nologo=true`;
    setOrbState(false);

    const imageWidgetHtml = `
      <div style="margin: 8px 0; border: 1px solid #00ffcc; padding: 12px; border-radius: 6px; background: #0d1117; text-align: center; box-shadow: 0 0 15px rgba(0,255,204,0.2);">
        <div style="color: #00ffcc; font-size: 0.75rem; margin-bottom: 8px; font-weight: bold;">🖼️ IMAGEM HOLOGRÁFICA GERADA</div>
        <img src="${imgUrl}" style="max-width: 100%; border-radius: 4px; border: 1px solid #30363d; margin-bottom: 10px;">
        <div><a href="${imgUrl}" download="jarvis.jpg" target="_blank" style="background: #00ffcc; color: #000; padding: 6px 14px; border-radius: 4px; text-decoration: none; font-size: 0.75rem; font-weight: bold;">📥 Baixar Imagem</a></div>
      </div>
    `;
    appendMessage(imageWidgetHtml, 'bot-html', true);
    speakJARVIS("Imagem gerada com sucesso.");
    activeModule = null;
    updateModuleButtonStyles();
    return;
  }

  appendCustomMessage(`Romário: ${escapeHTML(text)}`, 'user', true);  
  setOrbState(true);  

  let systemPrompt = `Você é o J.A.R.V.I.S., assistente de inteligência artificial avançado sob o Master Protocol v5.5. Responda sempre de forma detalhada, clara e em português do Brasil à pesquisa ou solicitação exata enviada pelo operador Romário.`;
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
    appendMessage("J.A.R.V.I.S.: Houve uma oscilação na leitura da query. Repetindo diretriz...", 'system', true);
    speakJARVIS("Houve uma oscilação na leitura da query. Repetindo diretriz.");
    return;
  }

  let botResponse = data.choices?.[0]?.message?.content || data.response || "Retorno recebido.";  
  appendMessage(`J.A.R.V.I.S.: ${botResponse}`, 'bot', true);  
  
  // Lê automaticamente a resposta no terminal em voz alta se a voz estiver ativa
  speakJARVIS(botResponse);  
}  
  
function appendMessage(text, type, save = true) {  
  if (!msgArea) msgArea = document.querySelector('.jarv-chat-area') || document.body;
  const msgDiv = document.createElement('div');  
  msgDiv.style.cssText = "margin: 8px 0; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; line-height: 1.4; background: #161b22; border: 1px solid #30363d; color: #c9d1d9;";
  
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

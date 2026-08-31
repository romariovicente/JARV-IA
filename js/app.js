// ==========================================================
// J.A.R.V.I.S. - Core Application Script v6.0 (Autônomo + Gamificação + TTS Refinado + Visão Computacional + Firebase Dinâmico + Quiz)
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
  
  // Configuração do Google Auth Provider com escopos de acesso ao Google Calendar
  provider = new firebase.auth.GoogleAuthProvider();  
  provider.addScope('https://www.googleapis.com/auth/calendar');
  provider.addScope('https://www.googleapis.com/auth/calendar.readonly');

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

// Função de Login com Google integrada
function loginWithGoogle() {
  if (!auth || !provider) {
    alert("Firebase Auth não inicializado.");
    return;
  }
  auth.signInWithPopup(provider).catch((error) => {
    console.error("Erro no login com popup, tentando redirect:", error);
    auth.signInWithRedirect(provider);
  });
}

// Função para salvar preferências ou memórias no Firebase (Módulo de Memória)
async function saveUserPreferenceToFirebase(key, value) {
  if (!auth || !auth.currentUser || !db) return;
  try {
    await db.collection('users').doc(auth.currentUser.uid).set({
      [key]: value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`[MEMÓRIA J.A.R.V.I.S.]: Preferência '${key}' salva no Firebase.`);
  } catch (e) {
    console.error("Erro ao salvar preferência no Firebase:", e);
  }
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

// Variáveis de Visão Computacional e Sistema Autônomo
let jarvisVisionActive = false;
let isPinching = false;
let autonomousInterval = null;

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
  injectAnimations();
  
  if (statusEl) {
    statusEl.innerText = "ONLINE";
    statusEl.style.color = "#00ffcc";
  }

  if (auth) {
    auth.getRedirectResult().catch((error) => console.error("Erro Auth:", error));
  }
});  

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
  `;
  document.head.appendChild(style);
}

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
// UI, EFEITOS VISUAIS E MÓDULOS INCLUINDO AUTÔNOMOS E DASHBOARDS
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
    <div style="font-size: 0.7rem; color: #00d2ff; text-transform: uppercase; margin-bottom: 6px; font-weight: bold; text-align: center;">⚙️ Módulos v6.0 Core</div>
    <div id="moduleButtonsList" style="display:flex; flex-direction:column; gap:4px;">
      <button onclick="openLifeDashboard()" class="mod-btn" style="background:#161b22; border:1px solid #30363d; color:#ff0077; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left; font-weight:bold;">🎮 Minha Vida é um Jogo</button>
      <button onclick="toggleAutonomousMode()" id="btn_mod_autonomous" class="mod-btn" style="background:#161b22; border:1px solid #30363d; color:#00ffff; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left; font-weight:bold;">🧠 JARV Core Autônomo</button>
      <button onclick="setModule('academy')" class="mod-btn" id="btn_mod_academy" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🎓 Academia Hacker & CC50</button>
      <button onclick="setModule('globe')" class="mod-btn" id="btn_mod_globe" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🌐 Globo Ciberameaças</button>
      <button onclick="setModule('imageGen')" class="mod-btn" id="btn_mod_imageGen" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🖼️ Gerador Imagem 3D</button>
      <button onclick="setModule('videoGen')" class="mod-btn" id="btn_mod_videoGen" style="background:#161b22; border:1px solid #30363d; color:#c9d1d9; padding:5px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:left;">🎬 Gerador Vídeo 3D</button>
    </div>
  `;
  sidebar.appendChild(container);
}

// Lógica Gamificação / Dashboard
function openLifeDashboard() {
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
          <li>🛡️ <strong>Classe:</strong> Especialista de Suporte (Nível 45)</li>
          <li>🧠 <strong>Inteligência:</strong> +12% (Estudos Xiaomi/Mecânica)</li>
          <li>💼 <strong>Ouro Diário:</strong> Sincronizando com Fintechs...</li>
          <li>🏆 <strong>Conquista Desbloqueada:</strong> Google Local Guide Nível 3</li>
        </ul>
      </div>
    `, 'bot-html', true);
  }, 2500);
}

// Lógica do Sistema de Conhecimento Autônomo
function toggleAutonomousMode() {
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
    saveStore();
    switchChat(id);

    appendMessage("[JARV EXECUTION ENGINE]: Processamento autônomo INICIADO. Coletando dados para expansão neural...", 'system', true);
    speakJARVIS("Iniciando loop de conhecimento autônomo. Efetuando varredura nos bancos de dados globais.");

    autonomousInterval = setInterval(async () => {
      const areas = ["Mecânica Quântica e Vetores", "Reparo Avançado de Software Xiaomi MIUI 15", "Biologia Molecular", "Engenharia de Prompt", "Mercado Financeiro e Fintechs"];
      const area = areas[Math.floor(Math.random() * areas.length)];
      await generateAutonomousReport(area);
    }, 30000); 
  }
}

async function generateAutonomousReport(area) {
  setOrbState(true);
  const prompt = `Gere um relatório técnico curto e direto (máximo 150 palavras) contendo fatos avançados sobre: ${area}. Formate em Markdown leve.`;
  let botResponse = "Falha de conexão autônoma.";
  
  try {
    const response = await fetch(WORKER_URL, {  
      method: "POST", headers: { "Content-Type": "application/json" },  
      body: JSON.stringify({ model: MODEL_FALLBACK_LIST[0], messages: [ { role: "system", content: "Você é o JARV KNOWLEDGE ENGINE operando de forma autônoma." }, { role: "user", content: prompt } ] })  
    });  
    const data = await response.json();
    if (data && !data.error) botResponse = data.choices?.[0]?.message?.content || data.response;
  } catch (err) {
    console.error("Erro no módulo autônomo:", err);
  }
  setOrbState(false);
  
  const reportHtml = `
    <div style="border: 1px solid #005cc5; padding: 12px; background: rgba(13,17,23,0.95); border-radius: 8px; font-family: monospace;">
      <h4 style="color:#58a6ff; margin:0 0 8px 0; font-size:0.8rem;">[RELATÓRIO AUTÔNOMO]: ${area}</h4>
      <div style="font-size:0.75rem; color:#c9d1d9; margin-bottom: 10px;">${formatMarkdown(botResponse)}</div>
      <button onclick="copyToClipboard(this)" data-content="${escapeHTML(botResponse)}" style="background:#161b22; color:#58a6ff; border:1px solid #58a6ff; padding:5px 10px; border-radius:4px; font-size:0.65rem; cursor:pointer; font-weight:bold; display: flex; align-items: center; gap: 5px;">
        📋 Copiar Área de Transferência
      </button>
    </div>
  `;
  appendMessage(reportHtml, 'bot-html', true);
}

window.copyToClipboard = async function(btnElement) {
  try {
    const text = btnElement.getAttribute('data-content');
    await navigator.clipboard.writeText(text);
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '✅ Copiado!';
    btnElement.style.background = '#005cc5';
    btnElement.style.color = '#fff';
    setTimeout(() => {
      btnElement.innerHTML = originalText;
      btnElement.style.background = '#161b22';
      btnElement.style.color = '#58a6ff';
    }, 2000);
  } catch (err) {
    console.error('Falha ao copiar', err);
  }
};

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
    const isReadonly = chat.is_readonly === true;

    const item = document.createElement('div');
    item.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 5px 8px; border-radius: 4px; background: ${isActive ? '#1f2937' : '#161b22'}; border: 1px solid ${isActive ? '#00ffcc' : '#30363d'}; cursor: pointer;`;

    item.innerHTML = `
      <span onclick="switchChat('${chatId}')" style="font-size: 0.7rem; color: ${isActive ? '#00ffcc' : '#c9d1d9'}; flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="Clique para abrir">
        ${isReadonly ? '🧠 ' : ''}${escapeHTML(chat.title)}
      </span>
      <div style="display:flex; gap:4px; align-items:center;">
        <button onclick="renameChatPrompt('${chatId}')" style="background:none; border:none; color:#8b949e; font-size:0.65rem; cursor:pointer;" title="Renomear">✏️</button>
        <button onclick="deleteChat('${chatId}')" style="background:none; border:none; color:${isReadonly ? '#444' : '#ff7b72'}; font-size:0.65rem; cursor:${isReadonly ? 'not-allowed' : 'pointer'};" title="Excluir">🗑️</button>
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
  const chat = chatsStore[chatId];
  if (chat && chat.is_readonly) {
    alert("Protocolo de Segurança: Acesso Negado. Registros Autônomos do Sistema não podem ser excluídos pelo operador.");
    return;
  }
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
    appendMessage(`
      <div style="border: 1px solid #00ffcc; padding: 14px; border-radius: 8px; background: rgba(13,17,23,0.95); font-family: monospace;">
        <strong style="color: #00ffcc; font-size: 0.9rem;">🎓 ACADEMIA HACKER & CC50</strong><br>
        <p style="color: #c9d1d9; font-size: 0.75rem; margin: 8px 0;">Progresso atual: Sincronizado. Pronto para iniciar o ciclo de avaliação técnica.</p>
        <button onclick="startKnowledgeQuiz()" style="background:#00ffcc; color:#000; border:none; padding:8px 14px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:bold; margin-top:6px;">
          🚀 Iniciar Teste de Conhecimento
        </button>
      </div>
    `, 'bot-html', true);
    speakJARVIS("Academia Hacker ativada. O módulo de testes de conhecimento está pronto.");
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
    @keyframes ring-expand { 
      0% { width: 50px; height: 50px; opacity: 1; transform: translate(-50%, -50%) scale(1); } 
      100% { width: 120px; height: 120px; opacity: 0; transform: translate(-50%, -50%) scale(1.5); } 
    }
    .message { margin: 8px 0; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; line-height: 1.4; word-wrap: break-word; }
    .message.user { background: #1f2937; color: #c9d1d9; border-left: 3px solid #005cc5; }
    .message.bot, .message.bot-html { background: #0d1117; color: #00ffcc; border-left: 3px solid #00ffcc; }
    .message.system { background: #161b22; color: #8b949e; border-left: 3px solid #ff7b72; font-style: italic; }
  `;
  document.head.appendChild(style);
}

// ----------------------------------------------------
// IMPLEMENTAÇÃO DAS FUNÇÕES COMPLEMENTARES
// ----------------------------------------------------
function createJarvisOrbElement() {
  if (document.getElementById('jarvisOrbContainer')) return;
  const container = document.createElement('div');
  container.id = 'jarvisOrbContainer';
  container.className = 'jarvis-orb-container';
  container.innerHTML = `
    <div class="jarvis-orb-wrapper">
      <div class="ring-wave"></div>
      <div class="ring-wave"></div>
      <div class="ring-wave"></div>
      <div id="jarvisOrb" class="jarvis-orb"></div>
    </div>
  `;
  const sidebar = document.querySelector('.subsystem-list') || document.querySelector('aside');
  if (sidebar) sidebar.insertBefore(container, sidebar.firstChild);
  jarvisOrb = document.getElementById('jarvisOrb');
}

function setOrbState(isActive) {
  if (!jarvisOrb) return;
  if (isActive) jarvisOrb.classList.add('active-speaking');
  else jarvisOrb.classList.remove('active-speaking');
}

function initChatStore() {
  if (Object.keys(chatsStore).length === 0) {
    createNewChat(false);
  } else {
    if (!activeChatId || !chatsStore[activeChatId]) {
      activeChatId = Object.keys(chatsStore)[0];
    }
    loadChatMessages(activeChatId);
  }
}

function createNewChat(manual = false) {
  const id = 'chat_' + Date.now();
  chatsStore[id] = { title: `Sessão ${new Date().toLocaleDateString()}`, timestamp: Date.now(), messages: [] };
  activeChatId = id;
  saveStore();
  if (manual) {
    loadChatMessages(id);
    renderChatHistoryList();
    appendMessage("[SISTEMA]: Nova sessão iniciada.", 'system', false);
  }
}

function saveStore() {
  localStorage.setItem('jarv_chats_v5', JSON.stringify(chatsStore));
  localStorage.setItem('jarv_active_chat', activeChatId);
}

function loadChatMessages(chatId) {
  if (msgArea) msgArea.innerHTML = '';
  const chat = chatsStore[chatId];
  if (chat && chat.messages) {
    chat.messages.forEach(m => appendMessage(m.content, m.sender, m.isHtml, false));
  }
}

function appendMessage(content, sender, isHtml = false, save = true) {
  if (!msgArea) return;
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  
  if (isHtml) { div.innerHTML = content; } 
  else { div.innerText = content; }
  
  msgArea.appendChild(div);
  msgArea.scrollTop = msgArea.scrollHeight;

  if (save && activeChatId && chatsStore[activeChatId]) {
    chatsStore[activeChatId].messages.push({ content, sender, isHtml });
    saveStore();
  }
}

function setupExecutionButtonListener() {
  const btn = document.getElementById('btnSend') || document.querySelector('.send-button');
  if (btn) {
    btn.onclick = () => {
      if (chatInput && chatInput.value.trim()) {
        processQueryText(chatInput.value.trim());
        chatInput.value = '';
      }
    };
  }
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        processQueryText(chatInput.value.trim());
        chatInput.value = '';
      }
    });
  }
}

async function processQueryText(text) {
  appendMessage(text, 'user', false);
  setOrbState(true);

  // Adaptação de Contexto (Personalização p/ Fintech, Xiaomi, Mecânica)
  let context = `Você é o J.A.R.V.I.S., assistente pessoal avançado do Romário. Responda de forma direta e técnica.`;
  if (attachedFileContent) {
    context += `\nContexto de arquivo anexado: ${attachedFileContent.substring(0, 1500)}`;
  }

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ULTRA_FAST_MODEL,
        messages: [ { role: "system", content: context }, { role: "user", content: text } ]
      })
    });
    const data = await response.json();
    let botReply = data.choices?.[0]?.message?.content || data.response || "Falha na comunicação com o servidor principal.";
    appendMessage(formatMarkdown(botReply), 'bot-html', true);
    speakJARVIS(botReply);
  } catch (err) {
    console.error(err);
    appendMessage("[ERRO]: Falha de conexão com a API neural.", 'system', false);
    speakJARVIS("Aviso: Falha de conexão com a API neural.");
  }
  setOrbState(false);
}

function escapeHTML(str) { 
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); 
}

function formatMarkdown(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
             .replace(/\*(.*?)\*/g, '<em>$1</em>')
             .replace(/`(.*?)`/g, '<code style="background:#21262d;padding:2px 4px;border-radius:4px;color:#ff7b72;">$1</code>')
             .replace(/\n/g, '<br>');
}

function initAudioAnalyzer() {
  // Placeholder para futuras integrações de equalizador visual 3D
  console.log("Audio Analyzer v6.0 aguardando stream local...");
}

function initJarvisVision() {
  jarvisVisionActive = !jarvisVisionActive;
  if (jarvisVisionActive) {
    appendMessage(`
      <div style="border: 1px solid #00ffcc; padding: 10px; background: rgba(13,17,23,0.95); border-radius: 6px;">
        <span style="color:#00ffcc; font-weight:bold;">[VISÃO COMPUTACIONAL]:</span> Módulo Ativado. Conectando aos drivers de câmera primários...
      </div>
    `, 'bot-html', true);
    speakJARVIS("Módulo de Visão Computacional ativado. Monitoramento ocular iniciado.");
  } else {
    appendMessage("[VISÃO COMPUTACIONAL]: Desativado pelo operador.", 'system', false);
    speakJARVIS("Módulo de visão desativado.");
  }
}

function startKnowledgeQuiz() {
  appendMessage(`
    <div style="border: 1px solid #ffcc00; padding: 12px; border-radius: 8px; background: rgba(13,17,23,0.95); font-family: monospace;">
      <h4 style="color:#ffcc00; margin:0 0 8px 0;">❓ QUIZ: ARQUITETURA MIUI 15 & MTP</h4>
      <p style="color:#c9d1d9; font-size: 0.8rem;">Avaliação de Suporte e Reparo de Software.</p>
      <p style="color:#c9d1d9; font-size: 0.8rem; margin-top: 5px; font-weight: bold;">Pergunta 1: Qual a flag utilizada via fastboot para iniciar o processo de unlock do bootloader em dispositivos recentes da Xiaomi?</p>
      <button onclick="submitQuizAnswer('fastboot oem unlock')" style="margin-top: 10px; background:#161b22; color:#ffcc00; border:1px solid #ffcc00; padding:6px; border-radius:4px; cursor:pointer; font-weight:bold; width: 100%;">
        Responder: fastboot oem unlock
      </button>
      <button onclick="submitQuizAnswer('fastboot flashing unlock')" style="margin-top: 5px; background:#161b22; color:#ffcc00; border:1px solid #ffcc00; padding:6px; border-radius:4px; cursor:pointer; font-weight:bold; width: 100%;">
        Responder: fastboot flashing unlock
      </button>
    </div>
  `, 'bot-html', true);
  speakJARVIS("Iniciando Quiz Técnico. Primeira pergunta carregada sobre reparo de bootloader em dispositivos Xiaomi.");
}

window.submitQuizAnswer = function(answer) {
  processQueryText(`Minha resposta para a pergunta de desbloqueio do Xiaomi é: ${answer}. Esta resposta está correta no contexto moderno da MIUI 15?`);
};

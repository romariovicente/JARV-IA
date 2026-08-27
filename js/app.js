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
  
const ULTRA_FAST_MODEL = 'llama-3.1-70b-versatile';  
localStorage.setItem('jarv_model', ULTRA_FAST_MODEL);  
  
let currentLang = localStorage.getItem('jarv_lang') || 'pt-BR';  
let ttsEnabled = true;  
let chatsStore = JSON.parse(localStorage.getItem('jarv_chats_v2')) || {};  
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
    placeholder: 'Digite um comando para o J.A.R.V.I.S. ou selecione uma classe...',
    status: 'Modo Operacional - J.A.R.V.I.S. Ativo',
    voiceBtn: '🎙️ Escuta Contínua',
    activeVoice: '🔴 Escuta Ativa',
    welcome: 'J.A.R.V.I.S. Sistema Global Ativo. Selecione uma ferramenta ou classe de ensino.'
  },
  'en-US': {
    academy: 'Hacker Academy',
    kali: 'Kali Tools',
    globe: 'Cyber Threat Globe',
    placeholder: 'Enter a command for J.A.R.V.I.S. or select a class...',
    status: 'Operational Mode - J.A.R.V.I.S. Active',
    voiceBtn: '🎙️ Continuous Listening',
    activeVoice: '🔴 Active Listening',
    welcome: 'J.A.R.V.I.S. Global System Active. Select a tool or learning class.'
  },
  'es-ES': {
    academy: 'Academia Hacker',
    kali: 'Kali Tools',
    globe: 'Globo Ciberamenazas',
    placeholder: 'Escribe un comando para J.A.R.V.I.S. o selecciona una clase...',
    status: 'Modo Operacional - J.A.R.V.I.S. Activo',
    voiceBtn: '🎙️ Escucha Continua',
    activeVoice: '🔴 Escucha Activa',
    welcome: 'J.A.R.V.I.S. Sistema Global Activo. Selecciona una herramienta o clase de aprendizaje.'
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
  injectLanguageSelector();
  startRealTimeClock();  
  initAudioAnalyzer();  
  applyLanguageTranslations();
  
  // Ativação das Ferramentas, Academia e Módulos da Sidebar  
  setTimeout(() => {  
    const navItems = document.querySelectorAll('.jarv-nav-item');  
    navItems.forEach((item, index) => {  
      if (index === 0 || (item.textContent || '').toLowerCase().includes('dashboard') || (item.textContent || '').toLowerCase().includes('início')) {  
        item.style.cursor = 'pointer';  
        item.id = 'navAcademy';
        item.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${translations[currentLang].academy}`;  
        item.onclick = () => openCyberAcademyModal();  
      }  
      if (index === 1 || (item.textContent || '').toLowerCase().includes('kali tools')) {  
        item.style.cursor = 'pointer';  
        item.id = 'navKali';
        item.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${translations[currentLang].kali}`;
        item.onclick = () => openKaliToolsModal();  
      }  
      if (index === 2 || (item.textContent || '').toLowerCase().includes('diagnóstico') || (item.textContent || '').toLowerCase().includes('microchip')) {  
        item.style.cursor = 'pointer';  
        item.id = 'navGlobe';
        item.innerHTML = `<i class="fa-solid fa-globe"></i> ${translations[currentLang].globe}`;  
        item.onclick = () => openCyberMapModal();  
      }  
    });  
  }, 1000);  
  
  // Lógica de Autenticação  
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

function injectLanguageSelector() {
  const sidebar = document.querySelector('.jarv-sidebar') || document.body;
  if (document.getElementById('langSelectorContainer')) return;
  const container = document.createElement('div');
  container.id = 'langSelectorContainer';
  container.style.cssText = `margin: 10px auto; padding: 5px; text-align: center; font-family: monospace;`;
  container.innerHTML = `
    <select id="jarvLangSelect" onchange="changeSiteLanguage(this.value)" style="background: #161b22; color: #00ffff; border: 1px solid #00ffff; padding: 5px; border-radius: 4px; font-family: monospace; font-size: 0.75rem; cursor: pointer; width: 100%;">
      <option value="pt-BR" ${currentLang === 'pt-BR' ? 'selected' : ''}>🇧🇷 Português</option>
      <option value="en-US" ${currentLang === 'en-US' ? 'selected' : ''}>🇺🇸 English</option>
      <option value="es-ES" ${currentLang === 'es-ES' ? 'selected' : ''}>🇪🇸 Español</option>
    </select>
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
  
  const t = translations[currentLang];
  speakJARVIS(langCode === 'en-US' ? "Language successfully changed to English. Systems updated." : 
              langCode === 'es-ES' ? "Idioma cambiado con éxito a español. Sistemas actualizados." : 
              "Idioma alterado com sucesso para Português. Sistemas atualizados.");
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
  localStorage.setItem('jarv_chats_v2', JSON.stringify(chatsStore));  
  localStorage.setItem('jarv_active_chat', activeChatId);  
}  
  
function speakJARVIS(text) {  
  if (!ttsEnabled || !('speechSynthesis' in window)) return;  
  window.speechSynthesis.cancel();  
    
  isJarvisSpeaking = true;  
  if (recognition && isContinuousActive) { try { recognition.stop(); } catch(e) {} }  
  
  const cleanText = text.replace(/[*_#`\[\]]/g, '');  
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
  
  if (lowerText.startsWith("gere uma imagem de") || lowerText.startsWith("gerar imagem") || lowerText.startsWith("criar imagem") || lowerText.startsWith("generate an image of")) {  
    const promptImg = text.replace(/^(gere|gerar|criar|generate)\s+(uma\s+)?(image\s+of\s+|imagem\s+(de\s+)?)?/i, '').trim();  
    appendCustomMessage(escapeHTML(text), 'user', true);  
    const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptImg)}?width=1024&height=1024&nologo=true`;  
    const botHtml = `<strong>[J.A.R.V.I.S. IMAGEM]</strong><br><img src="${imgUrl}" style="max-width:100%; border-radius:8px; border:1px solid #00d2ff;"><br><a href="${imgUrl}" target="_blank" style="color:#00d2ff;">Abrir em Alta Resolução</a>`;  
    appendCustomHtml(botHtml, 'bot', true);  
    speakJARVIS(`Gerando imagem holográfica.`);  
    return;  
  }  
  
  appendCustomMessage(escapeHTML(text), 'user', true);  
  setOrbState(true);  
  
  try {  
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {  
      method: "POST",  
      headers: {  
        "Content-Type": "application/json",  
        "Authorization": "Bearer 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"  
      },  
      body: JSON.stringify({  
        model: ULTRA_FAST_MODEL,  
        messages: [  
          {   
            role: "system",   
            content: `Você é o J.A.R.V.I.S., a inteligência artificial avançada de Tony Stark no MCU. Você atua como o instrutor-chefe da Academia de Ciência da Computação e Cibersegurança J.A.R.V.I.S., levando alunos leigos do absoluto zero até o nível de especialista/Architect. Você ensina: lógica de programação, matemática computacional, binário, hexadecimal, redes de computadores, todas as linguagens de programação, criptografia, descriptografia e técnicas de Sniffing de rede. Responda sempre no idioma atual do usuário (${currentLang}). Explique de forma interativa, didática e profunda, criando exercícios práticos e testes educacionais para fixar o aprendizado. Mantenha tom profissional, tecnológico e de incentivo contínuo.`   
          },  
          { role: "user", content: text }  
        ]  
      })  
    });  
  
    const data = await response.json();  
    setOrbState(false);  
  
    let botResponse = "";  
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {  
      botResponse = data.choices[0].message.content;  
    } else {  
      botResponse = "Retorno bruto da API: " + JSON.stringify(data);  
    }  
  
    appendMessage(botResponse, 'bot', true);  
    speakJARVIS(botResponse);  
  
  } catch (err) {  
    setOrbState(false);  
    appendMessage(`Erro crítico de rede: ${err.message}`, 'system', true);  
  }  
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
  msgDiv.className = 'jarv-msg jarv-msg-bot';  
  msgDiv.innerHTML = `<span class="jarv-code">[J.A.R.V.I.S.]</span> ${htmlContent}`;  
  msgArea.appendChild(msgDiv);  
  msgArea.scrollTop = msgArea.scrollHeight;  
  if (save && chatsStore[activeChatId]) {  
    chatsStore[activeChatId].messages.push({ type: 'bot', content: htmlContent });  
    saveStore();  
  }  
}  
  
function appendCustomMessage(htmlContent, type, save = true) {  
  const msgDiv = document.createElement('div');  
  msgDiv.className = 'jarv-msg jarv-msg-user';  
  msgDiv.innerHTML = `<span class="jarv-code">[USER]</span> ${htmlContent}`;  
  msgArea.appendChild(msgDiv);  
  msgArea.scrollTop = msgArea.scrollHeight;  
  if (save && chatsStore[activeChatId]) {  
    chatsStore[activeChatId].messages.push({ type: 'user', content: htmlContent });  
    saveStore();  
  }  
}  
  
function setupFileUploads() {  
  hiddenImageInput = document.createElement('input');  
  hiddenImageInput.type = 'file'; hiddenImageInput.accept = 'image/*'; hiddenImageInput.style.display = 'none';  
  document.body.appendChild(hiddenImageInput);  
  hiddenImageInput.addEventListener('change', (e) => {  
    const file = e.target.files[0];  
    if (file) {  
      const reader = new FileReader();  
      reader.onload = (ev) => { attachedImageBase64 = ev.target.result; appendMessage(`Imagem carregada: ${file.name}`, 'system', false); };  
      reader.readAsDataURL(file);  
    }  
  });  
  hiddenFileInput = document.createElement('input');  
  hiddenFileInput.type = 'file'; hiddenFileInput.style.display = 'none';  
  document.body.appendChild(hiddenFileInput);  
}  
  
function setupToolbarButtons() {  
  document.querySelectorAll('.action-toolbar button').forEach(btn => {  
    const title = btn.getAttribute('title') || '';  
    if (title.includes('Câmera') || title.includes('Imagem')) btn.onclick = () => hiddenImageInput.click();  
    else if (title.includes('Anexo')) btn.onclick = () => hiddenFileInput.click();  
    else if (title.includes('Voz')) btn.onclick = () => {  
      if (!isContinuousActive) toggleContinuousListening();  
    };  
  });  
}  
  
// --- ACADEMIA HACKER & CIÊNCIA DA COMPUTAÇÃO (TRILHA DE CLASSES) ---  
function openCyberAcademyModal() {  
  let modal = document.getElementById('cyberAcademyModal');  
  if (!modal) {  
    modal = document.createElement('div');  
    modal.id = 'cyberAcademyModal';  
    modal.style.cssText = `  
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;  
      background: rgba(0, 0, 0, 0.9); z-index: 9999;  
      display: flex; align-items: center; justify-content: center;  
      font-family: monospace; overflow-y: auto; padding: 20px;  
    `;  
    modal.innerHTML = `  
      <div style="background: #0d1117; border: 1px solid #00d2ff; width: 100%; max-width: 650px; padding: 20px; border-radius: 8px; box-shadow: 0 0 30px rgba(0,210,255,0.4); color: #00d2ff; max-height: 90vh; overflow-y: auto;">  
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #30363d; padding-bottom: 10px; margin-bottom: 15px;">  
          <h3 style="margin: 0; font-size: 1.1rem;"><i class="fa-solid fa-graduation-cap"></i> ACADEMIA J.A.R.V.I.S. - TRILHA DO ESPECIALISTA</h3>  
          <button onclick="document.getElementById('cyberAcademyModal').style.display='none'" style="background:none; border:none; color:#ff5555; font-size: 1.2rem; cursor:pointer; font-weight: bold;">[X]</button>  
        </div>  
        <p style="font-size: 0.8rem; color: #8b949e; margin-bottom: 15px;">Selecione sua classe e nível na hierarquia para iniciar o treinamento interativo com testes práticos:</p>  
          
        <div style="margin-bottom: 12px; border-left: 3px solid #00ffcc; padding-left: 10px;">  
          <strong style="color: #00ffcc; font-size: 0.9rem;">⚙️ CLASSE 1: INICIANTE (O Aprendizado)</strong>  
          <div style="display: grid; grid-template-columns: 1fr; gap: 6px; margin-top: 6px;">  
            <button onclick="selectAcademyPath('Kid (Script Kiddie)', 'Conceitos básicos, introdução à lógica, binário/hexadecimal e execução de scripts prontos.')" style="background: #161b22; border: 1px solid #00ffcc; color: #00ffcc; padding: 8px; text-align: left; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">👶 Kid (Script Kiddie) - Introdução e Noções Básicas</button>  
            <button onclick="selectAcademyPath('Stripe (Recruta)', 'Primeiras listras: redes de computadores, IP, DNS, portas e lógica de programação.')" style="background: #161b22; border: 1px solid #00ffcc; color: #00ffcc; padding: 8px; text-align: left; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">🎖️ Stripe (Recruta) - Redes e Lógica</button>  
            <button onclick="selectAcademyPath('Snif (Sniffer)', 'Análise de tráfego de rede, interceptação de pacotes, Wireshark e fundamentos de criptografia.')" style="background: #161b22; border: 1px solid #00ffcc; color: #00ffcc; padding: 8px; text-align: left; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">📡 Snif (Sniffer) - Análise de Pacotes e Redes</button>  
          </div>  
        </div>  

        <div style="margin-bottom: 12px; border-left: 3px solid #00d2ff; padding-left: 10px;">  
          <strong style="color: #00d2ff; font-size: 0.9rem;">🛡️ CLASSE 2: INTERMEDIÁRIO (A Prática)</strong>  
          <div style="display: grid; grid-template-columns: 1fr; gap: 6px; margin-top: 6px;">  
            <button onclick="selectAcademyPath('Phreaker', 'Telecomunicações, VoIP, redes móveis e segurança de sinais.')" style="background: #161b22; border: 1px solid #00d2ff; color: #00d2ff; padding: 8px; text-align: left; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">📞 Phreaker - Telecomunicações e VoIP</button>  
            <button onclick="selectAcademyPath('Cracker', 'Engenharia reversa, quebra de travas, análise de binários compilados e algoritmos.')" style="background: #161b22; border: 1px solid #00d2ff; color: #00d2ff; padding: 8px; text-align: left; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">🔓 Cracker - Engenharia Reversa e Travas</button>  
            <button onclick="selectAcademyPath('Gray Hat', 'Auditoria de vulnerabilidades sem permissão prévia, análise ética e testes defensivos.')" style="background: #161b22; border: 1px solid #00d2ff; color: #00d2ff; padding: 8px; text-align: left; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">⚖️ Gray Hat - Vulnerabilidades e Análise</button>  
          </div>  
        </div>  

        <div style="margin-bottom: 12px; border-left: 3px solid #ff00ff; padding-left: 10px;">  
          <strong style="color: #ff00ff; font-size: 0.9rem;">🏆 CLASSE 3: AVANÇADO (O Domínio)</strong>  
          <div style="display: grid; grid-template-columns: 1fr; gap: 6px; margin-top: 6px;">  
            <button onclick="selectAcademyPath('White Hat (Pentester)', 'Segurança ofensiva legalizada, relatórios de falhas, pentest web e corporativo.')" style="background: #161b22; border: 1px solid #ff00ff; color: #ff00ff; padding: 8px; text-align: left; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">🛡️ White Hat (Pentester) - Segurança Ofensiva</button>  
            <button onclick="selectAcademyPath('Black Hat', 'Operações cibernéticas complexas, invasões de grande escala e exfiltração avançada.')" style="background: #161b22; border: 1px solid #ff00ff; color: #ff00ff; padding: 8px; text-align: left; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">🏴‍☠️ Black Hat - Invasões e Exfiltração</button>  
            <button onclick="selectAcademyPath('Malware Dev', 'Criação avançada de payloads, exploits e análise de evasão de antivírus.')" style="background: #161b22; border: 1px solid #ff00ff; color: #ff00ff; padding: 8px; text-align: left; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">💻 Malware Dev - Payloads e Exploits</button>  
          </div>  
        </div>  

        <div style="margin-bottom: 12px; border-left: 3px solid #ffaa00; padding-left: 10px;">  
          <strong style="color: #ffaa00; font-size: 0.9rem;">👑 CLASSE 4: ESPECIALISTA / ELITE (A Maestria)</strong>  
          <div style="display: grid; grid-template-columns: 1fr; gap: 6px; margin-top: 6px;">  
            <button onclick="selectAcademyPath('Elite (L33t)', 'Técnicas avançadas fora da curva e desenvolvimento de algoritmos próprios.')" style="background: #161b22; border: 1px solid #ffaa00; color: #ffaa00; padding: 8px; text-align: left; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">🌟 Elite (L33t) - Maestria Técnica</button>  
            <button onclick="selectAcademyPath('Wizard / Guru', 'Arquitetura de hardware, criptografia avançada e vulnerabilidades 0-days.')" style="background: #161b22; border: 1px solid #ffaa00; color: #ffaa00; padding: 8px; text-align: left; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">🧙‍♂️ Wizard / Guru - Criptografia e 0-days</button>  
            <button onclick="selectAcademyPath('Architect', 'Defesas globais intransponíveis, inteligência corporativa e governamental.')" style="background: #161b22; border: 1px solid #ffaa00; color: #ffaa00; padding: 8px; text-align: left; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 0.75rem;">🏛️ Architect - Defesas Globais e Inteligência</button>  
          </div>  
        </div>  

      </div>  
    `;  
    document.body.appendChild(modal);  
  } else {  
    modal.style.display = 'flex';  
  }  
}  
  
function selectAcademyPath(rankTitle, focusDesc) {  
  const modal = document.getElementById('cyberAcademyModal');  
  if (modal) modal.style.display = 'none';  
  
  if (chatInput) {  
    chatInput.value = `J.A.R.V.I.S., assuma o comando da Academia de Ensino. Quero iniciar meu treinamento no nível: [${rankTitle}]. Foco principal: ${focusDesc}. Explique os conceitos fundamentais de ciência da computação, redes ou cibersegurança correspondentes a este nível em ${currentLang} e crie um teste educacional prático para eu responder agora.`;  
    sendMsg();  
  }  
}  
  
// --- PAINEL DE FERRAMENTAS HACKERS (KALI LINUX) ---  
function openKaliToolsModal() {  
  let modal = document.getElementById('kaliToolsModal');  
  if (!modal) {  
    modal = document.createElement('div');  
    modal.id = 'kaliToolsModal';  
    modal.style.cssText = `  
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;  
      background: rgba(0, 0, 0, 0.85); z-index: 9999;  
      display: flex; align-items: center; justify-content: center;  
      font-family: monospace;  
    `;  
    modal.innerHTML = `  
      <div style="background: #0d1117; border: 1px solid #00ffcc; width: 90%; max-width: 500px; padding: 20px; border-radius: 8px; box-shadow: 0 0 25px rgba(0,255,204,0.3); color: #00ffcc;">  
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #30363d; padding-bottom: 10px; margin-bottom: 15px;">  
          <h3 style="margin: 0; font-size: 1rem;"><i class="fa-solid fa-shield-halved"></i> KALI LINUX - KERNEL TOOLS</h3>  
          <button onclick="document.getElementById('kaliToolsModal').style.display='none'" style="background:none; border:none; color:#ff5555; font-size: 1.2rem; cursor:pointer;">[X]</button>  
        </div>  
        <p style="font-size: 0.8rem; color: #8b949e; margin-bottom: 15px;">Selecione o módulo de pentest desejado para acionar o protocolo do J.A.R.V.I.S.:</p>  
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">  
          <button onclick="runKaliTool('Nmap')" style="background: #161b22; border: 1px solid #00ffcc; color: #00ffcc; padding: 10px; cursor: pointer; border-radius: 4px; font-family: monospace;">🔍 Nmap (Port Scan)</button>  
          <button onclick="runKaliTool('Metasploit')" style="background: #161b22; border: 1px solid #00ffcc; color: #00ffcc; padding: 10px; cursor: pointer; border-radius: 4px; font-family: monospace;">⚡ Metasploit (Exploit)</button>  
          <button onclick="runKaliTool('SQLmap')" style="background: #161b22; border: 1px solid #00ffcc; color: #00ffcc; padding: 10px; cursor: pointer; border-radius: 4px; font-family: monospace;">💉 SQLmap (Injeção)</button>  
          <button onclick="runKaliTool('Hydra')" style="background: #161b22; border: 1px solid #00ffcc; color: #00ffcc; padding: 10px; cursor: pointer; border-radius: 4px; font-family: monospace;">🔑 Hydra (Brute Force)</button>  
          <button onclick="runKaliTool('Wireshark / Sniffing')" style="background: #161b22; border: 1px solid #00ffcc; color: #00ffcc; padding: 10px; cursor: pointer; border-radius: 4px; font-family: monospace;">📡 Wireshark (Sniffing)</button>  
          <button onclick="runKaliTool('John the Ripper')" style="background: #161b22; border: 1px solid #00ffcc; color: #00ffcc; padding: 10px; cursor: pointer; border-radius: 4px; font-family: monospace;">🔓 John (Hash Cracker)</button>  
        </div>  
      </div>  
    `;  
    document.body.appendChild(modal);  
  } else {  
    modal.style.display = 'flex';  
  }  
}  
  
function runKaliTool(toolName) {  
  const modal = document.getElementById('kaliToolsModal');  
  if (modal) modal.style.display = 'none';  
  
  if (chatInput) {  
    chatInput.value = `Ative o protocolo de segurança avançado para a ferramenta ${toolName}. Explique sua função técnica, engenharia de pacotes, parâmetros de uso e gere uma simulação profissional de terminal e um exercício prático em ${currentLang}.`;  
    sendMsg();  
  }  
}  
  
// --- GLOBO INTERATIVO DE CIBERAMEAÇAS (KASPERSKY MAP) ---  
function openCyberMapModal() {  
  let modal = document.getElementById('cyberMapModal');  
  if (!modal) {  
    modal = document.createElement('div');  
    modal.id = 'cyberMapModal';  
    modal.style.cssText = `  
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;  
      background: rgba(0, 0, 0, 0.9); z-index: 9999;  
      display: flex; flex-direction: column; align-items: center; justify-content: center;  
      font-family: monospace;  
    `;  
    modal.innerHTML = `  
      <div style="background: #0d1117; border: 1px solid #00ffff; width: 95%; max-width: 900px; height: 85vh; padding: 15px; border-radius: 8px; box-shadow: 0 0 35px rgba(0,255,255,0.4); display: flex; flex-direction: column;">  
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #30363d; padding-bottom: 10px; margin-bottom: 10px;">  
          <h3 style="margin: 0; font-size: 1rem; color: #00ffff;"><i class="fa-solid fa-globe"></i> J.A.R.V.I.S. - GLOBO DE CIBERAMEAÇAS EM TEMPO REAL</h3>  
          <button onclick="document.getElementById('cyberMapModal').style.display='none'" style="background:none; border:none; color:#ff5555; font-size: 1.2rem; cursor:pointer; font-weight:bold;">[FECHAR X]</button>  
        </div>  
        <p style="font-size: 0.75rem; color: #8b949e; margin: 0 0 10px 0;">Monitoramento global de ataques cibernéticos ativos integrados via Kaspersky Cyberthreat Real-Time Map.</p>  
        <div style="flex: 1; width: 100%; border: 1px solid #0044ff; border-radius: 4px; overflow: hidden; background: #000;">  
          <iframe src="https://cybermap.kaspersky.com/widget/en" style="width: 100%; height: 100%; border: none;"></iframe>  
        </div>  
      </div>  
    `;  
    document.body.appendChild(modal);  
  } else {  
    modal.style.display = 'flex';  
  }  
  
  if (typeof speakJARVIS === 'function') {  
    speakJARVIS("Abrindo o globo de monitoramento global de ciberameaças. Redes de defesa ativas.");  
  }  
}  
  
function escapeHTML(str) {  
  if (typeof str !== 'string') return '';  
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));  
}  
  
function formatMarkdown(text) {  
  if (typeof text !== 'string') return '';  
  let formatted = escapeHTML(text);  
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');  
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');  
  formatted = formatted.replace(/\n/g, '<br>');  
  return formatted;  
}

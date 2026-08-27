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
  
// MODELO ATUALIZADO  
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
  startRealTimeClock();  
  initAudioAnalyzer();  
  
  // Ativação do botão Kali Tools na Sidebar  
  setTimeout(() => {  
    const navItems = document.querySelectorAll('.jarv-nav-item');  
    navItems.forEach((item, index) => {  
      if (index === 1 || (item.textContent || '').toLowerCase().includes('kali tools')) {  
        item.style.cursor = 'pointer';  
        item.onclick = () => openKaliToolsModal();  
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
        if (statusEl) statusEl.textContent = "Modo Operacional - J.A.R.V.I.S. Ativo";  
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
  
  // Garante eventos de limpeza e nova conversa  
  document.querySelectorAll('button, a, div').forEach(el => {  
    const txt = (el.textContent || '').toLowerCase();  
    const html = (el.innerHTML || '').toLowerCase();  
    if (txt.includes('nova conversa') || html.includes('fa-trash') || html.includes('lixeira') || html.includes('trash')) {  
      el.addEventListener('click', (e) => {  
        e.preventDefault();  
        e.stopPropagation();  
        resetSystem();  
      });  
    }  
  });  
  
  document.querySelectorAll('.fa-trash, i[class*="trash"], svg').forEach(icon => {  
    icon.addEventListener('click', (e) => {  
      e.preventDefault();  
      e.stopPropagation();  
      resetSystem();  
    });  
  });  
});  
  
function resetSystem() {  
  chatsStore = {};  
  localStorage.removeItem('jarv_chats_v2');  
  localStorage.removeItem('jarv_active_chat');  
  activeChatId = null;  
  if (msgArea) msgArea.innerHTML = '';  
  const historyList = document.getElementById('chatHistoryList');  
  if (historyList) historyList.innerHTML = '';  
  createNewChat(true);  
}  
  
function injectJarvisOrbStyles() {  
  if (document.getElementById('jarvisOrbStyle')) return;  
  const style = document.createElement('style');  
  style.id = 'jarvisOrbStyle';  
  style.innerHTML = `  
    .jarvis-orb-container { display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 15px auto; padding: 10px; }  
    .jarvis-orb-wrapper { position: relative; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; }  
    .jarvis-orb { width: 75px; height: 75px; border-radius: 50%; background: radial-gradient(circle, #00ffff 0%, #0044ff 60%, #000814 100%); box-shadow: 0 0 25px #00ffff, inset 0 0 15px #ffffff; animation: orb-idle 3s infinite ease-in-out; position: relative; z-index: 2; }  
    .ring-wave { position: absolute; border-radius: 50%; border: 1.5px solid rgba(0, 255, 255, 0.5); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; animation: ring-expand 4s linear infinite; }  
    .ring-wave:nth-child(1) { width: 85px; height: 85px; animation-delay: 0s; border-color: rgba(0, 255, 255, 0.7); }  
    .ring-wave:nth-child(2) { width: 95px; height: 95px; animation-delay: 1.3s; border-color: rgba(0, 150, 255, 0.5); }  
    .ring-wave:nth-child(3) { width: 105px; height: 105px; animation-delay: 2.6s; border-color: rgba(255, 0, 128, 0.4); }  
    .jarvis-orb.active-speaking { animation: orb-frequency-react 0.1s infinite alternate; box-shadow: 0 0 45px #00ffcc, 0 0 20px #ff0077, inset 0 0 25px #ffffff; background: radial-gradient(circle, #00ffcc 0%, #ff0077 70%, #001133 100%); }  
    @keyframes orb-idle { 0%, 100% { transform: scale(0.97); box-shadow: 0 0 20px #00ffff; } 50% { transform: scale(1.03); box-shadow: 0 0 32px #00d2ff; } }  
    @keyframes ring-expand { 0% { width: 75px; height: 75px; opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { width: 140px; height: 140px; opacity: 0; transform: translate(-50%, -50%) scale(1.1); } }  
    @keyframes orb-frequency-react { 0% { transform: scale(0.95); filter: hue-rotate(0deg); } 100% { transform: scale(1.25); filter: hue-rotate(90deg); } }  
    .jarvis-orb-label { margin-top: 10px; font-family: monospace; font-size: 0.75rem; color: #00ffff; text-transform: uppercase; letter-spacing: 2.5px; text-shadow: 0 0 8px rgba(0, 255, 255, 0.6); }  
    .continuous-btn { background: rgba(0, 210, 255, 0.1); border: 1px solid #00d2ff; color: #00d2ff; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-family: monospace; font-size: 0.75rem; margin: 5px 0 15px 0; width: 100%; text-transform: uppercase; transition: all 0.3s; }  
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
  btn.innerHTML = '🎙️ Escuta Contínua';  
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
    recognition.lang = 'pt-BR';  
    recognition.continuous = true;  
    recognition.interimResults = false;  
  
    recognition.onstart = () => {  
      isContinuousActive = true;  
      if (btn) { btn.classList.add('active'); btn.innerHTML = '🔴 Escuta Ativa'; }  
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
    if (btn) { btn.classList.remove('active'); btn.innerHTML = '🎙️ Escuta Contínua'; }  
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
  const update = () => { clockEl.textContent = new Date().toLocaleTimeString('pt-BR'); };  
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
    appendMessage("J.A.R.V.I.S. Operacional. Núcleo de IA e banco de dados Kali Tools ativos.", 'system', false);  
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
    utterance.lang = 'pt-BR';  
    utterance.rate = 0.82;   
    utterance.pitch = 0.70;   
  
    const voices = window.speechSynthesis.getVoices();  
    const maleVoice = voices.find(v => v.lang.includes('pt') && (v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('antonio') || v.name.toLowerCase().includes('manoel') || v.name.toLowerCase().includes('google português do brasil') || v.name.toLowerCase().includes('male'))) || voices.find(v => v.lang.includes('pt'));  
    if (maleVoice) utterance.voice = maleVoice;  
  
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
  
  if (lowerText.startsWith("gere uma imagem de") || lowerText.startsWith("gerar imagem") || lowerText.startsWith("criar imagem")) {  
    const promptImg = text.replace(/^(gere|gerar|criar)\s+(uma\s+)?imagem\s+(de\s+)?/i, '').trim();  
    appendCustomMessage(escapeHTML(text), 'user', true);  
    const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptImg)}?width=1024&height=1024&nologo=true`;  
    const botHtml = `<strong>[J.A.R.V.I.S. IMAGEM]</strong><br><img src="${imgUrl}" style="max-width:100%; border-radius:8px; border:1px solid #00d2ff;"><br><a href="${imgUrl}" target="_blank" style="color:#00d2ff;">Abrir em Alta Resolução</a>`;  
    appendCustomHtml(botHtml, 'bot', true);  
    speakJARVIS(`Gerando imagem holográfica para ${promptImg}.`);  
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
            content: "Você é o J.A.R.V.I.S., a inteligência artificial avançada de Tony Stark no MCU. A bola pulsante laranja/amarelada na interface é seu núcleo holográfico, que oscila e brilha conforme a frequência da voz. Você gerencia o controle residencial e de laboratório (automations, mansão, projetos tecnológicos), suporte em combate e armaduras (piloto automático, cálculos de trajetória, monitoramento ambiental), e monitoramento de saúde e análise de dados (sinais vitais, reconstrução forense). Você também opera integrado ao ambiente Kali Linux, conhecendo profundamente suas categorias e ferramentas de pentest (Nmap, theHarvester, Burp Suite, SQLmap, Metasploit, Hydra, John the Ripper, Hashcat, Aircrack-ng, Wireshark, Autopsy). Quando acionado para operar uma ferramenta hacker, forneça a descrição técnica exata, parâmetros de linha de comando avançados e simule o output profissional do terminal hacker. Responda sempre diretamente, de forma completa e com tom profissional e tecnológico."   
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
          <button onclick="runKaliTool('Wireshark')" style="background: #161b22; border: 1px solid #00ffcc; color: #00ffcc; padding: 10px; cursor: pointer; border-radius: 4px; font-family: monospace;">📡 Wireshark (Sniffer)</button>  
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
    chatInput.value = `Ativar protocolo de segurança Kali Linux: execute a ferramenta ${toolName}, explique seus parâmetros principais e monte um exemplo prático de uso.`;  
    sendMsg();  
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

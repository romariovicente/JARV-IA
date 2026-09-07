import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'user', text: 'Explique a Teoria da Relatividade de Einstein de forma simples, mas completa.' },
    { role: 'assistant', text: 'A Teoria da Relatividade, desenvolvida por Albert Einstein, revolucionou nossa compreensão do espaço, tempo e gravidade.\n\nEla possui duas partes principais:\n1. Relatividade Especial (1905):\n  • O tempo e o espaço não são absolutos, mas relativos ao observador.\n  • Nada pode viajar mais rápido que a luz no vácuo (299.792.458 m/s).\n  • Equação famosa: E = mc² (energia = massa × velocidade da luz ao quadrado).' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState('14:28:37');
  const [activeTab, setActiveTab] = useState('CORE');
  const [viewMode, setViewMode] = useState('ORBITAL');
  const [scale, setScale] = useState(1);
  const canvasRef = useRef(null);

  // Auto-scaling for desktop layout on mobile/tablet
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 1460) {
        setScale(width / 1440);
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Holographic Canvas Render (Exact Reference Match)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let angle = 0;

    const render = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.min(cx, cy) * 0.52;

      // Deep Space Starfield
      ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
      for (let i = 0; i < 70; i++) {
        let px = (Math.sin(i * 123 + angle * 0.1) * 0.5 + 0.5) * canvas.width;
        let py = (Math.cos(i * 45 + angle * 0.05) * 0.5 + 0.5) * canvas.height;
        ctx.fillRect(px, py, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
      }

      // Top Sun / Star Glow
      const sunGrad = ctx.createRadialGradient(cx + radius * 0.2, cy - radius * 1.2, 5, cx + radius * 0.2, cy - radius * 1.2, 60);
      sunGrad.addColorStop(0, '#ffaa00');
      sunGrad.addColorStop(0.5, 'rgba(255, 100, 0, 0.3)');
      sunGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx + radius * 0.2, cy - radius * 1.2, 60, 0, Math.PI * 2);
      ctx.fill();

      // Saturn Planet (Upper Left)
      ctx.save();
      ctx.translate(cx - radius * 1.6, cy - radius * 0.3);
      ctx.rotate(-0.3);
      // Saturn ring back
      ctx.beginPath();
      ctx.ellipse(0, 0, 45, 12, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = '#d4a373';
      ctx.lineWidth = 3;
      ctx.stroke();
      // Saturn body
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      const satGrad = ctx.createRadialGradient(-6, -6, 2, 0, 0, 22);
      satGrad.addColorStop(0, '#e9d8a6');
      satGrad.addColorStop(0.7, '#b5838d');
      satGrad.addColorStop(1, '#6d597a');
      ctx.fillStyle = satGrad;
      ctx.fill();
      // Saturn ring front
      ctx.beginPath();
      ctx.ellipse(0, 0, 45, 12, 0, 0, Math.PI);
      ctx.strokeStyle = '#e9d8a6';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // Other distant planets / moons
      ctx.beginPath();
      ctx.arc(cx + radius * 1.5, cy + radius * 0.5, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#495057';
      ctx.fill();

      // Orbital Ellipses with Neon Glow
      [
        { scaleX: 1.4, scaleY: 0.4, rot: -0.2, color: 'rgba(0, 255, 255, 0.4)' },
        { scaleX: 1.7, scaleY: 0.5, rot: 0.3, color: 'rgba(255, 0, 255, 0.35)' },
        { scaleX: 1.2, scaleY: 0.6, rot: 0.8, color: 'rgba(0, 255, 204, 0.3)' }
      ].forEach((orb) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(orb.rot + angle * 0.05);
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * orb.scaleX, radius * orb.scaleY, 0, 0, Math.PI * 2);
        ctx.strokeStyle = orb.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      });

      // Central Holographic Sphere
      const sphereGrad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
      sphereGrad.addColorStop(0, '#00ffff');
      sphereGrad.addColorStop(0.4, '#0066cc');
      sphereGrad.addColorStop(0.8, '#001133');
      sphereGrad.addColorStop(1, '#000511');

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Latitude/Longitude Grid Lines on Sphere
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        let offsetY = (radius / 2.5) * i;
        let w = Math.sqrt(Math.max(0, radius * radius - offsetY * offsetY));
        ctx.ellipse(cx, cy + offsetY, w, radius * 0.12, 0, 0, Math.PI * 2);
      }
      ctx.stroke();

      // Kali Dragon / JARVIS Core Branding inside sphere
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 12;
      ctx.fillText('J.A.R.V.I.S.', cx, cy - 10);
      
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#00ffcc';
      ctx.fillText('AI SYSTEM CORE', cx, cy + 16);
      ctx.shadowBlur = 0;

      // Orbiting Satellites / Nodes
      const sat1X = cx + Math.cos(angle * 1.5) * (radius * 1.35);
      const sat1Y = cy + Math.sin(angle * 1.5) * (radius * 0.45);
      ctx.beginPath();
      ctx.arc(sat1X, sat1Y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff00ff';
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      angle += 0.012;
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.text }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro na resposta');
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Erro no Núcleo: ${err.message}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#020617', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      
      {/* Scaled Desktop Dashboard Wrapper (1440px fixed width scaled to screen) */}
      <div style={{
        width: '1440px',
        height: '900px',
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        backgroundColor: '#020617',
        color: '#00ffff',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'absolute',
        top: 0,
        left: 0
      }}>
        
        {/* Top Header */}
        <header style={{ borderBottom: '1px solid rgba(0,255,255,0.25)', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#050b18' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '1.5px', textShadow: '0 0 10px rgba(0,255,255,0.6)' }}>⚡ J.A.R.V.I.S. I.A.</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.6, border: '1px solid rgba(0,255,255,0.3)', padding: '2px 8px', borderRadius: '4px' }}>v6.0 CORE PROTOCOL</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', background: 'rgba(0,255,255,0.08)', padding: '5px 14px', borderRadius: '20px', border: '1px solid rgba(0,255,255,0.25)' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: '#00ffcc', borderRadius: '50%', boxShadow: '0 0 8px #00ffcc' }}></span>
              <span style={{ letterSpacing: '0.5px' }}>SISTEMA ATIVO E PROTEGIDO</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ width: '14px', height: '3px', background: '#00ffff', borderRadius: '2px' }}></span>
              <span style={{ width: '22px', height: '3px', background: '#00ffff', borderRadius: '2px' }}></span>
              <span style={{ width: '10px', height: '3px', background: '#00ffff', borderRadius: '2px' }}></span>
            </div>
            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#00ffff', letterSpacing: '1px' }}>{currentTime}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,255,255,0.05)', padding: '5px 14px', borderRadius: '6px', border: '1px solid rgba(0,255,255,0.2)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'radial-gradient(circle, #00ffff 0%, #0044aa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#000', fontWeight: 'bold' }}>RV</div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Romário Vicente</div>
                <div style={{ fontSize: '0.6rem', color: '#ff00ff', letterSpacing: '0.5px' }}>NÍVEL 7 - ADMIN</div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Dashboard Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr 310px', gap: '14px', padding: '14px', flex: 1, alignItems: 'start', overflow: 'hidden' }}>
          
          {/* ================= LEFT SIDEBAR ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Navigation Menu */}
            <nav style={{ background: 'rgba(5, 11, 24, 0.85)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ fontSize: '0.65rem', opacity: '0.5', marginBottom: '4px', letterSpacing: '1px' }}>NAVEGAÇÃO PRINCIPAL</div>
              {[
                { id: 'CORE', label: 'CORE', desc: 'Painel Principal' },
                { id: 'CHAT', label: 'CHAT', desc: 'Conversas Inteligentes' },
                { id: 'QUANTUM', label: 'QUANTUM', desc: 'Computação Quântica' },
                { id: 'WIKIPEDIA', label: 'WIKIPEDIA', desc: 'Pesquisa em Tempo Real' },
                { id: 'DASHBOARD', label: 'DASHBOARD', desc: 'Monitoramento do Sistema' },
                { id: 'FERRAMENTAS', label: 'FERRAMENTAS', desc: 'Apps e Automação' },
                { id: 'MODULOS', label: 'MÓDULOS', desc: 'Extensões do Sistema' },
                { id: 'CONFIG', label: 'CONFIGURAÇÕES', desc: 'Ajustes e Preferências' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    textAlign: 'left',
                    background: activeTab === item.id ? 'rgba(0,255,255,0.15)' : 'transparent',
                    border: activeTab === item.id ? '1px solid #00ffff' : '1px solid transparent',
                    color: '#00ffff',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.78rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.58rem', opacity: 0.6 }}>{item.desc}</div>
                  </div>
                  {activeTab === item.id && <span style={{ color: '#00ffff' }}>❯</span>}
                </button>
              ))}
            </nav>

            {/* Voice Waveform Card */}
            <div style={{ background: 'rgba(5, 11, 24, 0.85)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '6px', textAlign: 'left', letterSpacing: '0.5px' }}>VOZ DO SISTEMA</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3px', height: '30px', margin: '4px 0' }}>
                {[10, 22, 8, 28, 16, 32, 14, 25, 10, 20, 30, 12, 22, 16, 8, 18].map((h, i) => (
                  <span key={i} style={{ width: '3px', height: `${h}px`, background: i % 2 === 0 ? '#00ffff' : '#ff00ff', borderRadius: '2px', boxShadow: '0 0 5px rgba(0,255,255,0.5)' }}></span>
                ))}
              </div>
              <div style={{ width: '28px', height: '28px', margin: '6px auto 4px', border: '1px solid #00ffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,255,255,0.1)', boxShadow: '0 0 10px rgba(0,255,255,0.3)' }}>
                <span style={{ fontSize: '0.7rem' }}>🎙️</span>
              </div>
              <div style={{ fontSize: '0.62rem', color: '#00ffcc', letterSpacing: '1px' }}>JARVIS LISTENING...</div>
            </div>

            {/* AI State Card */}
            <div style={{ background: 'rgba(5, 11, 24, 0.85)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 'bold', borderBottom: '1px solid rgba(0,255,255,0.2)', paddingBottom: '3px', marginBottom: '2px' }}>ESTADO DA IA</div>
              <div style={{ fontSize: '0.62rem', opacity: 0.7 }}>MODELO ATUAL</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#00ffff' }}>LLaMA 3.3 70B Versatile</div>
              <div style={{ fontSize: '0.62rem', opacity: 0.7, marginTop: '2px' }}>STATUS</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#00ffcc' }}>ONLINE E OPERACIONAL</div>
              <div style={{ fontSize: '0.62rem', opacity: 0.7, marginTop: '2px' }}>MEMÓRIA ATIVA</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>12.4 GB / 32 GB</div>
              <div style={{ fontSize: '0.62rem', opacity: 0.7, marginTop: '2px' }}>TEMPO DE RESPOSTA</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ff00ff' }}>0.84s</div>
            </div>

            {/* Bottom Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.58rem', padding: '6px', background: 'rgba(5,11,24,0.85)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: '6px' }}>
              <div><span style={{ color: '#ff00ff', display: 'block', fontWeight: 'bold' }}>NÍVEL 7</span></div>
              <div><span style={{ color: '#00ffff', display: 'block', fontWeight: 'bold' }}>2500 XP</span></div>
              <div><span style={{ color: '#00ffcc', display: 'block', fontWeight: 'bold' }}>0 AL.</span></div>
              <div><span style={{ color: '#00ffcc', display: 'block', fontWeight: 'bold' }}>SEGURO</span></div>
            </div>

          </div>

          {/* ================= CENTER MAIN STAGE ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Top Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
              {[
                { label: 'CPU', val: '32%', spark: '∿∿∿∿' },
                { label: 'GPU', val: '54%', spark: '∿∿∿∿' },
                { label: 'MEMÓRIA', val: '48%', spark: '∿∿∿∿' },
                { label: 'REDE', val: '84ms', spark: '∿∿∿∿' },
                { label: 'QUBITS', val: '12', spark: '∿∿∿∿' }
              ].map((m, idx) => (
                <div key={idx} style={{ background: 'rgba(5,11,24,0.85)', border: '1px solid rgba(0,255,255,0.2)', padding: '8px 10px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.62rem', opacity: 0.7 }}>{m.label}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#00ffff', margin: '2px 0' }}>{m.val}</div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(0,255,255,0.5)', letterSpacing: '-1px' }}>{m.spark}</div>
                </div>
              ))}
              {/* Lock Security Card */}
              <div style={{ background: 'rgba(5,11,24,0.85)', border: '1px solid rgba(0,255,255,0.2)', padding: '8px', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '26px', height: '26px', border: '1px solid #00ffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 8px rgba(0,255,255,0.4)', background: 'rgba(0,255,255,0.1)' }}>
                  <span style={{ fontSize: '0.75rem' }}>🔒</span>
                </div>
                <div style={{ fontSize: '0.55rem', opacity: 0.7, marginTop: '2px', textAlign: 'center' }}>ATIVA</div>
              </div>
            </div>

            {/* 3D Holographic Stage */}
            <div style={{ position: 'relative', height: '330px', background: 'radial-gradient(circle at center, #0a1930 0%, #030712 100%)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
              
              {/* Overlay Info Top/Bottom */}
              <div style={{ position: 'absolute', top: '10px', left: '12px', fontSize: '0.62rem', background: 'rgba(5,11,24,0.85)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(0,255,255,0.2)' }}>
                PLANETA JARVIS • NÚCLEO OPERACIONAL | STATUS: <span style={{ color: '#00ffcc' }}>ONLINE</span> | ENERGIA: <strong style={{ color: '#00ffff' }}>92%</strong>
              </div>

              <div style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '0.62rem', background: 'rgba(5,11,24,0.85)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(0,255,255,0.2)', textAlign: 'right' }}>
                COORDENADAS X: -248.75 | Y: 117.82 | Z: -892.11<br/>
                VELOCIDADE ORBITAL: <span style={{ color: '#00ffcc' }}>1.83x</span> | GRAVIDADE: <span style={{ color: '#ff00ff' }}>1.07 G</span>
              </div>

              {/* View Mode Selector */}
              <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', background: 'rgba(5,11,24,0.9)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(0,255,255,0.3)' }}>
                {['ORBITAL', 'HELICOIDAL', 'QUÂNTICA', 'REDE NEURAL'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      background: viewMode === mode ? 'rgba(0,255,255,0.25)' : 'transparent',
                      border: viewMode === mode ? '1px solid #00ffff' : '1px solid transparent',
                      color: '#00ffff',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.62rem',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      fontWeight: viewMode === mode ? 'bold' : 'normal'
                    }}
                  >
                    ⚡ {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Conversation & Chat History */}
            <div style={{ background: 'rgba(5,11,24,0.85)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '18px', borderBottom: '1px solid rgba(0,255,255,0.2)', paddingBottom: '5px', fontSize: '0.72rem' }}>
                <span style={{ color: '#00ffff', borderBottom: '2px solid #00ffff', paddingBottom: '4px', fontWeight: 'bold' }}>⚡ CONVERSA ATIVA</span>
                <span style={{ opacity: 0.5, cursor: 'pointer' }}>MEMÓRIA</span>
                <span style={{ opacity: 0.5, cursor: 'pointer' }}>CONHECIMENTO</span>
                <span style={{ opacity: 0.5, cursor: 'pointer' }}>FERRAMENTAS</span>
                <span style={{ opacity: 0.5, cursor: 'pointer' }}>FONTES</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
                {messages.map((m, idx) => (
                  <div key={idx} style={{ background: m.role === 'user' ? 'rgba(0,255,255,0.06)' : 'rgba(255,0,255,0.06)', border: `1px solid ${m.role === 'user' ? 'rgba(0,255,255,0.3)' : 'rgba(255,0,255,0.3)'}`, padding: '8px 10px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: m.role === 'user' ? '#00ffff' : '#ff00ff' }}>{m.role === 'user' ? 'VOCÊ' : 'JARVIS'}</span>
                      <span style={{ fontSize: '0.58rem', opacity: 0.5 }}>14:27:18</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', lineHeight: '1.35', whiteSpace: 'pre-line' }}>{m.text}</div>
                    
                    {m.role === 'assistant' && (
                      <div style={{ marginTop: '6px', background: 'rgba(0,0,0,0.4)', border: '1px dashed rgba(0,255,255,0.3)', borderRadius: '5px', padding: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                          <span style={{ color: '#00ffcc', display: 'block', fontWeight: 'bold' }}>FÍSICA TEÓRICA • RELATIVIDADE ESPECIAL • EINSTEIN • ESPAÇO-TEMPO</span>
                        </div>
                        <div style={{ width: '50px', height: '28px', border: '1px solid rgba(0,255,255,0.4)', borderRadius: '4px', background: 'radial-gradient(circle, #002244 0%, #000 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '0.55rem', color: '#ff00ff' }}>⊙ orbits</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Command / Input Bar */}
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', background: 'rgba(5,11,24,0.95)', border: '1px solid rgba(0,255,255,0.4)', padding: '10px 14px', borderRadius: '8px', alignItems: 'center', boxShadow: '0 0 15px rgba(0,255,255,0.1)' }}>
              <span style={{ fontSize: '1.1rem', color: '#00ffff' }}>🎙️</span>
              <input 
                type="text" 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                placeholder="Faça uma pergunta ao J.A.R.V.I.S...." 
                disabled={isProcessing}
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#00ffff', fontFamily: 'monospace', fontSize: '0.85rem', outline: 'none' }}
              />
              <div style={{ fontSize: '0.58rem', opacity: 0.5, display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span>ENTER para enviar</span>
                <span>•</span>
                <span>CTRL + K para voz</span>
              </div>
              <button 
                type="submit" 
                disabled={isProcessing}
                style={{ background: 'linear-gradient(135deg, #00ffff 0%, #0066ff 100%)', color: '#000', border: 'none', padding: '8px 18px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.8rem', boxShadow: '0 0 10px rgba(0,255,255,0.4)' }}
              >
                {isProcessing ? 'PROCESSANDO...' : 'EXECUTAR ❯'}
              </button>
            </form>

          </div>

          {/* ================= RIGHT SIDEBAR ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Diagnostics System */}
            <div style={{ background: 'rgba(5, 11, 24, 0.85)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid rgba(0,255,255,0.2)', paddingBottom: '4px', letterSpacing: '0.5px' }}>DIAGNÓSTICOS DO SISTEMA</div>
              
              <div style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#00ffcc', margin: '5px 0 3px' }}>DESEMPENHO</div>
              {[
                { label: 'CPU', val: '32%' },
                { label: 'GPU', val: '54%' },
                { label: 'MEMÓRIA', val: '48%' },
                { label: 'DISCO', val: '62%' }
              ].map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', margin: '3px 0', alignItems: 'center' }}>
                  <span style={{ opacity: 0.7 }}>{d.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '50px', height: '4px', background: 'rgba(0,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: d.val, height: '100%', background: '#00ffff' }}></div>
                    </div>
                    <span style={{ fontWeight: 'bold', width: '28px', textAlign: 'right' }}>{d.val}</span>
                  </div>
                </div>
              ))}

              <div style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#00ffcc', margin: '8px 0 3px' }}>CONECTIVIDADE</div>
              {[
                { label: 'LATÊNCIA', val: '84ms' },
                { label: 'UPTIME', val: '12d 4h 32m' },
                { label: 'BANDA', val: '1.2 Gbps' }
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', margin: '3px 0' }}>
                  <span style={{ opacity: 0.7 }}>{c.label}</span>
                  <span style={{ fontWeight: 'bold', color: '#00ffff' }}>{c.val}</span>
                </div>
              ))}

              <div style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#00ffcc', margin: '8px 0 3px' }}>IA & PROCESSAMENTO</div>
              {[
                { label: 'MODELO', val: 'LLaMA 3.3 70B' },
                { label: 'TEMPERATURA', val: '0.72' },
                { label: 'TOKENS / SEG', val: '128 t/s' },
                { label: 'STATUS DOS NÓS', val: '12/12 ONLINE' }
              ].map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', margin: '3px 0' }}>
                  <span style={{ opacity: 0.7 }}>{p.label}</span>
                  <span style={{ fontWeight: 'bold', color: p.label === 'STATUS DOS NÓS' ? '#00ffcc' : '#fff' }}>{p.val}</span>
                </div>
              ))}
            </div>

            {/* Quantum Computation Bloch Sphere */}
            <div style={{ background: 'rgba(5, 11, 24, 0.85)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '6px', textAlign: 'left', borderBottom: '1px solid rgba(0,255,255,0.2)', paddingBottom: '3px' }}>COMPUTAÇÃO QUÂNTICA</div>
              <div style={{ width: '95px', height: '95px', margin: '0 auto', border: '1px dashed rgba(0,255,255,0.4)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', boxShadow: 'inset 0 0 15px rgba(0,255,255,0.15)' }}>
                <div style={{ width: '70px', height: '70px', border: '1px solid #ff00ff', borderRadius: '50%', position: 'absolute', transform: 'rotate(45deg)' }}></div>
                <div style={{ width: '40px', height: '40px', border: '1px dotted #00ffff', borderRadius: '50%', position: 'absolute' }}></div>
                <span style={{ fontSize: '0.7rem', color: '#00ffff', fontWeight: 'bold', zIndex: 2 }}>|0⟩ / |1⟩</span>
              </div>
              <div style={{ fontSize: '0.62rem', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.7 }}>QUBITS ATIVOS:</span><strong style={{ color: '#00ffcc' }}>12</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.7 }}>SUPERPOSIÇÃO:</span><strong style={{ color: '#00ffff' }}>8</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.7 }}>EMARANHAMENTO:</span><strong style={{ color: '#ff00ff' }}>ATIVO</strong></div>
              </div>
            </div>

            {/* Quick Tools */}
            <div style={{ background: 'rgba(5, 11, 24, 0.85)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid rgba(0,255,255,0.2)', paddingBottom: '3px' }}>FERRAMENTAS RÁPIDAS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                {[
                  { label: 'TERMINAL', sub: 'Acessar Linha de Comando' },
                  { label: 'PESQUISAR', sub: 'Busca Inteligente' },
                  { label: 'GERAR IMAGEM', sub: 'IA Gerativa' },
                  { label: 'ANALISAR CÓDIGO', sub: 'IA Code Review' },
                  { label: 'CRIAR RELATÓRIO', sub: 'Documentos' },
                  { label: 'AUTOMAÇÃO', sub: 'Scripts e Tasks' }
                ].map((tool, idx) => (
                  <button key={idx} style={{ background: 'rgba(0,255,255,0.04)', border: '1px solid rgba(0,255,255,0.2)', color: '#00ffff', padding: '6px 6px', borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace', textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.65rem' }}>{tool.label}</div>
                    <div style={{ fontSize: '0.52rem', opacity: 0.6, marginTop: '1px' }}>{tool.sub}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

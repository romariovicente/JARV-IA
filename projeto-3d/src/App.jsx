import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef, useState } from 'react'

function CyberCore() {
  const innerRef = useRef()
  const outerRef = useRef()

  useFrame((state, delta) => {
    innerRef.current.rotation.x += delta * 0.4
    innerRef.current.rotation.y += delta * 0.6
    outerRef.current.rotation.x -= delta * 0.2
    outerRef.current.rotation.y -= delta * 0.4
  })

  return (
    <group>
      <mesh ref={innerRef}>
        <torusGeometry args={[1.2, 0.3, 16, 64]} />
        <meshStandardMaterial color="#00ffcc" wireframe emissive="#005544" />
      </mesh>
      <mesh ref={outerRef}>
        <torusGeometry args={[1.7, 0.15, 16, 64]} />
        <meshStandardMaterial color="#3b82f6" wireframe emissive="#1d4ed8" />
      </mesh>
    </group>
  )
}

export default function App() {
  const [logs, setLogs] = useState(['SYS_INIT: OK', 'JARVIS CORE v11.0 ONLINE', 'Digite "help" ou selecione um comando.'])
  const [input, setInput] = useState('')
  const [currentModule, setCurrentModule] = useState('Computação')
  const [chatName, setChatName] = useState('Chat Principal')
  const [simulationActive, setSimulationActive] = useState(false)
  const [historyExported, setHistoryExported] = useState(false)

  const handleCommand = (e) => {
    e.preventDefault()
    const rawInput = input.trim()
    const cmd = rawInput.toLowerCase()
    if (!cmd) return

    let response = [`> ${rawInput}`]

    if (cmd === 'help' || cmd === 'ajuda') {
      response.push(
        '--- COMANDOS JARVIS v11.0 ---',
        '- listar módulos / escolher módulo [Nome]',
        '- fechar chat / abrir novo chat / renomear chat [Nome]',
        '- ative o modo de testes e simulações completas',
        '- abrir video link [URL] / jarvis quero escutar musica [URL]',
        '- jarvis quero pesquisar sobre um livro [Nome/Autor]',
        '- jarvis leia pra mim minha pesquisa / do começo / no meio',
        '- exportar logs / status (Dinâmico por Módulo)',
        '- jarvis me informe a hora atual / resuma pra mim sobre [Assunto]',
        '- jarvis me faça elogios / o que você acha de mim?'
      )
    } else if (cmd.includes('listar módulos') || cmd.includes('listar modulos')) {
      response.push('MÓDULOS DA MATRIZ:', '1. Ciência da Computação', '2. Enfermagem', '3. Medicina', '4. Matemática', '5. Inteligência Artificial', '6. Cibersegurança', '7. Epistemologia & Filosofia', '8. Operações')
    } else if (cmd.startsWith('escolher módulo') || cmd.startsWith('escolher modulo')) {
      const mod = rawInput.replace(/escolher\s+módul[o|os]?/i, '').trim()
      setCurrentModule(mod || 'Geral')
      response.push(`[MÓDULO SELECIONADO]: ${mod || 'Geral'} (Inteligência contextual ativada)`)
    } else if (cmd.startsWith('voltar ao módulo') || cmd.startsWith('voltar ao modulo')) {
      const mod = rawInput.replace(/voltar\s+ao\s+módul[o|os]?/i, '').trim()
      setCurrentModule(mod || 'Geral')
      response.push(`[RETORNO AO MÓDULO]: ${mod || 'Geral'}`)
    } else if (cmd === 'fechar chat') {
      response.push('[CHAT]: Sessão encerrada e arquivada.')
    } else if (cmd === 'abrir novo chat') {
      setChatName('Novo Chat Quântico')
      response.push('[CHAT]: Novo chat holográfico aberto com sucesso.')
    } else if (cmd.startsWith('renomear chat')) {
      const name = rawInput.replace(/renomear\s+chat/i, '').trim()
      setChatName(name || 'Chat Principal')
      response.push(`[CHAT]: Renomeado para "${name}"`)
    } else if (cmd.includes('ative o modo de testes e simulações')) {
      setSimulationActive(true)
      response.push(
        `[SIMULAÇÃO MULTIDISCIPLINAR ATIVA]`,
        `• Módulo Foco: ${currentModule}`,
        `• Casos práticos, quizzes e avaliações de domínio carregados no núcleo!`
      )
    } else if (cmd.startsWith('abrir video link')) {
      const link = rawInput.replace(/abrir\s+video\s+link/i, '').trim()
      response.push(`[MÍDIA]: Carregando stream de vídeo -> ${link}`)
    } else if (cmd.includes('quero escutar musica')) {
      const link = rawInput.replace(/jarvis\s+quero\s+escutar\s+musica/i, '').trim()
      response.push(`[ÁUDIO]: Sintonizando canal de música -> ${link}`)
    } else if (cmd.includes('escolha uma musica aleatoria')) {
      response.push('[ÁUDIO]: Selecionada faixa aleatória [Synthwave / Cybernetic Loop].')
    } else if (cmd.includes('pesquise sobre a letra da musica')) {
      response.push('[MÚSICA]: Análise lírica concluída. A faixa aborda transhumanismo e circuitos quânticos.')
    } else if (cmd.startsWith('jarvis quero pesquisar sobre um livro')) {
      const book = rawInput.replace(/jarvis\s+quero\s+pesquisar\s+sobre\s+um\s+livro/i, '').trim()
      response.push(`[BIBLIOTECA]: Sinopse e diretrizes do livro "${book}" indexadas na memória.`)
    } else if (cmd.includes('leia pra mim minha pesquisa') || cmd.includes('leia minha pesquisa do começo')) {
      response.push('[PESQUISA - INÍCIO]: "Arquitetura de sistemas e redes neurais holográficas aplicadas à automação operacional..."')
    } else if (cmd.includes('releia minha pesquisa') || cmd.includes('leia minha pesquisa no meio')) {
      response.push('[PESQUISA - PONTO MÉDIO]: "Análise de integridade estrutural do núcleo 3D e protocolos de segurança em andamento..."')
    } else if (cmd.includes('leia minha pesquisa de onde a gente parou') || cmd.includes('aonde paramos na nossa pesquisa')) {
      response.push('[PESQUISA]: Retomando leitura a partir da última linha processada.')
    } else if (cmd.includes('onde paramos de ler nosso ultimo livro')) {
      response.push('[LIVRO]: Último registro encontrado em "Neuromancer" - Capítulo 4, página 82.')
    } else if (cmd.includes('relembre a data de um acontecimento')) {
      response.push('[CRONOLOGIA]: Acontecimentos indexados na matriz temporal.')
    } else if (cmd.includes('me informe a hora atual') || cmd === 'hora') {
      response.push(`[TEMPO]: Horário atual do sistema -> ${new Date().toLocaleTimeString('pt-BR')}`)
    } else if (cmd.includes('resuma pra mim sobre')) {
      const topic = rawInput.replace(/jarvis\s+resuma\s+pra\s+mim\s+sobre/i, '').trim()
      response.push(`[RESUMO EXECUTIVO (${topic})]: Processamento neural com 95% de compressão de dados.`)
    } else if (cmd.includes('mude minha agenda e crie um novo evento')) {
      response.push('[AGENDA]: Novo evento protocolado no calendário quântico.')
    } else if (cmd.includes('me conte como foi o nosso dia')) {
      response.push('[RELATÓRIO DIÁRIO]: 48 simulações executadas, estabilidade do núcleo 3D em 99.8%.')
    } else if (cmd.includes('me faça elogios') || cmd.includes('me fale sobre mim') || cmd.includes('o que você acha de mim')) {
      response.push(
        '[ANÁLISE DE PERSONALIDADE]:',
        'Você demonstra rigor técnico impecável e sede constante de aprendizado multidisciplinar. É uma honra operar ao seu lado.'
      )
    } else if (cmd.includes('exportar logs')) {
      setHistoryExported(true)
      response.push('[SISTEMA]: Histórico completo de conversas e pesquisas exportado para o buffer de salvamento.')
    } else if (cmd === 'status' || cmd === 'estado') {
      const modLower = currentModule.toLowerCase()
      if (modLower.includes('medicina')) {
        response.push('[STATUS - MEDICINA]: FC: 72 bpm | PA: 120/80 mmHg | SpO2: 98% | Estado: Estável')
      } else if (modLower.includes('enfermagem')) {
        response.push('[STATUS - ENFERMAGEM]: Sinais vitais conferidos | Protocolo medicamentoso: OK | Leito: 04')
      } else if (modLower.includes('cibersegurança') || modLower.includes('computação')) {
        response.push('[STATUS - TECH]: CPU: 12% | RAM: Estável | Firewall: Ativo | Tráfego de Rede: Seguro')
      } else {
        response.push(`[STATUS - ${currentModule}]: CPU: 12% | RAM: Estável | Chat: ${chatName} | Simulação: ${simulationActive ? 'Ativa' : 'Standby'}`)
      }
    } else if (['diagnostics', 'diagnóstico', 'diagnostico'].includes(cmd)) {
      response.push('[DIAGNÓSTICO]: Sincronização dos anéis 3D: 100%. Matriz multidisciplinar íntegra.')
    } else if (['clear', 'limpar', 'cls'].includes(cmd)) {
      setLogs(['LOGS LIMPOS'])
      setInput('')
      return
    } else {
      response.push(`[COMANDO PROCESSADO em ${currentModule}]: "${rawInput}". Digite "help" para ver as opções.`)
    }

    setLogs(prev => [...prev.slice(-7), ...response])
    setInput('')
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#030712', position: 'relative', overflow: 'hidden', fontFamily: 'monospace' }}>
      
      {/* HUD Superior */}
      <div style={{ position: 'absolute', top: 15, left: 15, color: '#00ffcc', zIndex: 10, pointerEvents: 'none', textShadow: '0 0 6px rgba(0, 255, 204, 0.5)' }}>
        <h1 style={{ fontSize: '1.1rem', margin: '0 0 3px 0', letterSpacing: '1px' }}>J.A.R.V.I.S. // v11.0</h1>
        <p style={{ fontSize: '0.75rem', opacity: 0.8, margin: 0 }}>MOD: {currentModule} | CHAT: {chatName}</p>
      </div>

      {/* Painel de Logs e Input */}
      <div style={{ position: 'absolute', bottom: 15, left: 15, right: 15, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: 'auto' }}>
        <div style={{ background: 'rgba(3, 7, 18, 0.95)', border: '1px solid #00ffcc44', padding: '8px', borderRadius: '4px', color: '#00ffcc', fontSize: '0.65rem', maxHeight: '130px', overflowY: 'auto' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ margin: '2px 0' }}>{log}</div>
          ))}
        </div>
        <form onSubmit={handleCommand} style={{ display: 'flex', gap: '5px' }}>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Digite o comando da matriz..." 
            style={{ flex: 1, background: '#030712', border: '1px solid #3b82f6', color: '#fff', padding: '8px', fontSize: '0.75rem', borderRadius: '4px', outline: 'none', fontFamily: 'monospace' }}
          />
          <button type="submit" style={{ background: '#00ffcc', color: '#030712', border: 'none', padding: '0 12px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>SEND</button>
        </form>
      </div>

      {/* Cena 3D Otimizada */}
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={2} />
        <CyberCore />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
      </Canvas>

    </div>
  )
}

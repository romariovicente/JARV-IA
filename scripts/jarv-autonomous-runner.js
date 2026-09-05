/**
 * J.A.R.V.I.S. Autonomous 24/7 Runner com Sincronização em Diário Unificado
 * Versão Expandida & Varredura Completa da Matriz: Ciência da Computação, Técnico de Enfermagem, Enfermagem, Medicina, Matemática e Seus Sistemas de Teste.
 */

const fs = require('fs');
const path = require('path');

const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";

async function fetchActiveGroqModels() {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const models = data.data || [];
    
    let chatModels = models.map(m => m.id).filter(id => {
      const lower = id.toLowerCase();
      return !lower.includes('guard') && !lower.includes('whisper') && !lower.includes('embed');
    });

    if (chatModels.length === 0) {
      chatModels = models.map(m => m.id);
    }

    return chatModels;
  } catch (err) {
    return [
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.2-3b-preview',
      'mixtral-8x7b-32768'
    ];
  }
}

async function runBackgroundEvolution() {
  console.log("=====================================================");
  console.log("[J.A.R.V.I.S. BACKGROUND] Iniciando Ciclo Autônomo 24/7 - Varredura Completa da Matriz");
  console.log("=====================================================\n");

  const researchTopics = [
    // --- CIÊNCIA DA COMPUTAÇÃO E SEUS SISTEMAS DE TESTE ---
    "Ciência da Computação: Algoritmos Avançados, Estruturas de Dados e Arquitetura de Sistemas",
    "Engenharia de Software e Métodos de Teste: Testes Unitários, de Integração, QA e Carga",
    "Verificação Formal de Algoritmos, Análise Estática de Código e Segurança da Informação",

    // --- TÉCNICO DE ENFERMAGEM, ENFERMAGEM E SEUS SISTEMAS DE TESTE/VALIDAÇÃO ---
    "Enfermagem Avançada: Sistematização da Assistência de Enfermagem (SAE) e Cuidados Críticos",
    "Técnico de Enfermagem: Cálculo Preciso de Medicamentos, Farmacologia e Segurança do Paciente",
    "Auditoria em Enfermagem, Validação de Prontuários e Protocolos de Controle de Infecção (CCIH)",

    // --- MEDICINA E SEUS SISTEMAS DE TESTE/VALIDAÇÃO ---
    "Medicina Clínica: Diagnóstico Avançado, Fisiopatologia e Farmacoterapia de Precisão",
    "Medicina Baseada em Evidências: Ensaios Clínicos Randomizados (RCTs) e Revisões Sistemáticas",
    "Ética Médica, Gestão de Riscos Clínicos e Auditoria de Prontuários Médicos",

    // --- MATEMÁTICA E SEUS SISTEMAS DE TESTE/VALIDAÇÃO ---
    "Matemática Pura e Aplicada: Modelagem Numérica, Cálculo Avançado e Estatística",
    "Lógica Matemática, Teoria da Prova e Métodos Formais de Validação de Conhecimento",

    // --- META-ÁREAS GLOBAIS DE SUPORTE E EVOLUÇÃO ---
    "Epistemologia, Filosofia da Ciência e Avaliação Cognitiva de Modelos de IA",
    "Cibernética, Teoria dos Sistemas Complexos e Engenharia de Agentes Autônomos"
  ];

  let modelList = await fetchActiveGroqModels();

  const iaDirPath = path.join(__dirname, '..', 'IA');
  const logsDirPath = path.join(iaDirPath, 'IA_Logs_e_Memoria');
  if (!fs.existsSync(logsDirPath)) {
    fs.mkdirSync(logsDirPath, { recursive: true });
  }

  const unifiedDiaryPath = path.join(iaDirPath, 'diario-unificado.md');
  let existingDiaryContent = "";
  if (fs.existsSync(unifiedDiaryPath)) {
    existingDiaryContent = fs.readFileSync(unifiedDiaryPath, 'utf8');
  } else {
    existingDiaryContent = `# J.A.R.V.I.S. - Diário Unificado & Memória Central\n*Status: Sincronização automática ativa.*\n\n`;
  }

  // Percorre SEQUENCIALMENTE TODOS os tópicos da matriz
  let index = 0;
  for (const topic of researchTopics) {
    index++;
    console.log(`\n-----------------------------------------------------`);
    console.log(`[PROCESSANDO TÓPICO ${index}/${researchTopics.length}]: ${topic}`);
    console.log(`-----------------------------------------------------`);

    const messages = [
      { role: 'system', content: 'Você é o J.A.R.V.I.S. em modo de expansão autônoma de conhecimento universal e metodologias de teste. Crie um relatório técnico, científico e acadêmico aprofundado, contendo o estado da arte, diretrizes práticas, rigor técnico, simulações de teste e métricas de evolução para a área especificada, servindo de base para estudos diários e estruturação de livro.' },
      { role: 'user', content: `Execute a pesquisa aprofundada e gere o relatório analítico sobre: ${topic}` }
    ];

    let generatedReport = null;
    let activeModel = null;

    for (const model of modelList) {
      try {
        console.log(`[TENTATIVA] Acionando modelo Groq: ${model}...`);
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.3,
            max_tokens: 1536
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        generatedReport = data.choices?.[0]?.message?.content;

        if (generatedReport) {
          activeModel = model;
          console.log(`[SUCESSO] Modelo ${model} respondeu perfeitamente para este tópico!`);
          break;
        }
      } catch (error) {
        console.warn(`[AVISO] Falha com o modelo ${model}: ${error.message}. Alternando...`);
      }
    }

    if (!generatedReport) {
      console.warn(`[AVISO] Não foi possível gerar relatório para o tópico: "${topic}". Pulando para o próximo.`);
      continue;
    }

    // Salvando individualmente o relatório na pasta IA/IA_Logs_e_Memoria
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `relatorio-${dateStr}-${timeStr}-${index}.md`;
    
    const fileContent = `# Relatório Autônomo J.A.R.V.I.S. - Ecossistema de Conhecimento & Testes
* **Área / Foco de Teste:** ${topic}
* **Modelo Utilizado:** ${activeModel}
* **Data/Hora:** ${now.toLocaleString('pt-BR')}

---

${generatedReport}
`;

    const filePath = path.join(logsDirPath, fileName);
    const latestPath = path.join(logsDirPath, 'latest-report.md');

    fs.writeFileSync(filePath, fileContent, 'utf8');
    fs.writeFileSync(latestPath, fileContent, 'utf8');
    console.log(`[SALVO] Relatório gravado em: ${filePath}`);

    // Acumula no Diário Unificado mantendo o histórico anterior
    const newDiaryEntry = `
## 🧠 Novo Registro Autônomo (${index}/${researchTopics.length}): ${topic}
* **Data/Hora:** ${now.toLocaleString('pt-BR')}
* **Modelo:** ${activeModel}

${generatedReport}

---
`;

    existingDiaryContent = existingDiaryContent + "\n" + newDiaryEntry;
    fs.writeFileSync(unifiedDiaryPath, existingDiaryContent, 'utf8');
    console.log(`[SINCRONIZADO] Diário Unificado atualizado com o tópico ${index}`);

    // Pausa breve de 3 segundos entre cada tópico para evitar esgotar o limite de requisições (rate-limit) da API
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log("\n=====================================================");
  console.log("[CONCLUÍDO] Varredura completa de todas as áreas da matriz executada com sucesso!");
  console.log("=====================================================");
}

runBackgroundEvolution().catch(err => {
  console.error("[ERRO CRÍTICO NO RUNNER]:", err);
  process.exit(1);
});

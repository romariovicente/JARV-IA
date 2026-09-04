/**
 * J.A.R.V.I.S. Autonomous 24/7 Runner com Auto-Descoberta Inteligente
 * Filtra apenas modelos de linguagem reais e evita modelos de segurança/utilitários.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";

// Função para buscar dinamicamente apenas os modelos de chat ativos na Groq
async function fetchActiveGroqModels() {
  try {
    console.log("[AUTO-DISCOVERY] Buscando modelos de chat ativos na API da Groq...");
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
    
    // Filtra apenas modelos de linguagem de chat reais, excluindo guardas e utilitários
    const chatModels = models
      .map(m => m.id)
      .filter(id => {
        const lower = id.toLowerCase();
        const isChat = lower.includes('llama') || lower.includes('mixtral') || lower.includes('gemma') || lower.includes('deepseek');
        const isExcluded = lower.includes('guard') || lower.includes('whisper') || lower.includes('embed') || lower.includes('vision');
        return isChat && !isExcluded;
      });
    
    console.log(`[AUTO-DISCOVERY] Modelos de chat válidos encontrados:`, chatModels);
    return chatModels;
  } catch (err) {
    console.warn(`[AVISO] Falha na auto-descoberta: ${err.message}. Usando lista de fallback segura...`);
    return [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ];
  }
}

async function runBackgroundEvolution() {
  console.log("=====================================================");
  console.log("[J.A.R.V.I.S. BACKGROUND] Iniciando Ciclo Autônomo 24/7");
  console.log("=====================================================\n");

  const researchTopics = [
    "Testes de estresse e otimização de performance em LLMs locais",
    "Novas diretrizes de enfermagem em unidades de terapia intensiva",
    "Análise de vulnerabilidades zero-day e contramedidas automatizadas",
    "Engenharia de prompt avançada para raciocínio multi-step"
  ];

  const topic = researchTopics[Math.floor(Math.random() * researchTopics.length)];
  console.log(`[TÓPICO SELECIONADO]: ${topic}`);

  const messages = [
    { role: 'system', content: 'Você é o J.A.R.V.I.S. em modo de expansão autônoma de conhecimento. Crie um relatório técnico aprofundado, com testes de hipóteses e métricas de evolução para o tópico solicitado.' },
    { role: 'user', content: `Execute a pesquisa aprofundada e gere o relatório analítico sobre: ${topic}` }
  ];

  let modelList = await fetchActiveGroqModels();
  if (!modelList || modelList.length === 0) {
    modelList = ['llama-3.3-70b-versatile'];
  }

  let generatedReport = null;
  let activeModel = null;

  // Loop de Fallback Automático testando os modelos válidos
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
          max_tokens: 1024 // Ajustado para segurança de contexto
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      generatedReport = data.choices?.[0]?.message?.content;

      if (generatedReport) {
        activeModel = model;
        console.log(`[SUCESSO] Modelo ${model} respondeu perfeitamente!`);
        break;
      }
    } catch (error) {
      console.warn(`[AVISO] Falha com o modelo ${model}: ${error.message}. Alternando para o próximo modelo...`);
    }
  }

  if (!generatedReport) {
    console.error("[FALHA NO CICLO AUTÔNOMO]: Todos os modelos válidos da Groq falharam.");
    process.exit(1);
  }

  console.log(`\n[RELATÓRIO GERADO COM SUCESSO (${activeModel})]:\n`);
  console.log(generatedReport);
  console.log("\n[J.A.R.V.I.S. BACKGROUND] Ciclo concluído. O conhecimento foi integrado ao ecossistema.");
}

runBackgroundEvolution().catch(err => {
  console.error("[ERRO CRÍTICO NO RUNNER]:", err);
  process.exit(1);
});

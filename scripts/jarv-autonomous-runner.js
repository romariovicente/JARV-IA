/**
 * J.A.R.V.I.S. Autonomous 24/7 Runner com Auto-Descoberta Robusta
 * Lista e testa dinamicamente todos os modelos disponíveis na conta da Groq.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";

async function fetchActiveGroqModels() {
  try {
    console.log("[AUTO-DISCOVERY] Buscando modelos ativos na API da Groq...");
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
    
    console.log("[AUTO-DISCOVERY] Modelos brutos retornados pela API:", models.map(m => m.id));

    // Filtra apenas excluindo utilitários pesados (como guardas/whisper/embeddings)
    let chatModels = models.map(m => m.id).filter(id => {
      const lower = id.toLowerCase();
      return !lower.includes('guard') && !lower.includes('whisper') && !lower.includes('embed');
    });

    if (chatModels.length === 0) {
      chatModels = models.map(m => m.id);
    }

    console.log(`[AUTO-DISCOVERY] Modelos prontos para teste:`, chatModels);
    return chatModels;
  } catch (err) {
    console.warn(`[AVISO] Falha na auto-descoberta: ${err.message}. Usando lista de fallback robusta...`);
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
    modelList = [
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.2-3b-preview',
      'mixtral-8x7b-32768'
    ];
  }

  let generatedReport = null;
  let activeModel = null;

  // Loop de Fallback inteligente testando um por um até obter sucesso
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
          max_tokens: 1024
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
    console.error("[FALHA NO CICLO AUTÔNOMO]: Todos os modelos testados falharam.");
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

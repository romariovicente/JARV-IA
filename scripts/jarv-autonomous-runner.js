/**
 * J.A.R.V.I.S. Autonomous 24/7 Runner com Fallback de Modelos
 * Executa testes de inteligência e gera relatórios de evolução contínua em background.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";

// Lista atualizada com modelos estáveis e amplamente suportados na Groq
const MODEL_FALLBACK_LIST = [
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768'
];

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

  let generatedReport = null;
  let activeModel = null;

  // Sistema de Fallback Automático entre os modelos
  for (const model of MODEL_FALLBACK_LIST) {
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
          max_tokens: 2000
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
      console.warn(`[AVISO] Falha com o modelo ${model}: ${error.message}. Alternando para o próximo modelo do fallback...`);
    }
  }

  if (!generatedReport) {
    console.error("[FALHA NO CICLO AUTÔNOMO]: Todos os modelos da lista de fallback da Groq falharam.");
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

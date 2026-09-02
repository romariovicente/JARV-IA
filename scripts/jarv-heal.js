/**
 * J.A.R.V.I.S. Auto-Heal Engine com Seleção Automática de Modelos Atualizados
 * Módulo de auto-correção e diagnóstico contínuo via Groq API.
 * 
 * Versão: 6.9 (Com Modelos Atuais da Groq e Truncamento Inteligente)
 * Arquivo: scripts/jarv-heal.js
 */

const fs = require('fs');  
const path = require('path');

// Lista atualizada de modelos ativos na Groq API
const GROQ_MODELS = [
  'openai/gpt-oss-120b',     // Tentativa 1: Modelo principal de alta capacidade
  'openai/gpt-oss-20b',      // Tentativa 2: Modelo rápido e eficiente
  'qwen/qwen3.6-27b'         // Tentativa 3: Alternativa robusta
];

async function callGroqWithAutoModel(apiKey, prompt) {
  const TIMEOUT_MS = 45000;

  for (const model of GROQ_MODELS) {
    try {
      console.log(`[JARV-HEAL] 🔄 Conectando ao modelo: ${model}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'Você é o J.A.R.V.I.S. Auto-Heal Engine. Responda ESTRITAMENTE em formato JSON sem marcações de markdown e sem texto adicional.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 4096 
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[JARV-HEAL] ⚠️ O modelo ${model} falhou com status ${response.status} (${errText}). Alternando...`);
        continue;
      }

      const data = await response.json();
      const textResponse = data.choices?.[0]?.message?.content;

      if (textResponse) {
        console.log(`[JARV-HEAL] ✨ Resposta obtida via modelo: ${model}`);
        return textResponse;
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`[JARV-HEAL] ⏳ Timeout no modelo ${model}. Acionando fallback...`);
      } else {
        console.warn(`[JARV-HEAL] ⚠️ Erro no modelo ${model}: ${err.message}. Acionando fallback...`);
      }
    }
  }
  
  throw new Error('Todos os modelos operacionais falharam ou o limite da API da Groq foi atingido.');
}

async function runAutoHeal() {  
  console.log("=====================================================");
  console.log("[JARV-HEAL] Protocolo de Auto-Correção Inicializado");  
  console.log("=====================================================\n");
    
  const apiKey = process.env.GROQ_API_KEY;  
  if (!apiKey) {  
    console.error("[ERRO CRÍTICO] GROQ_API_KEY ausente nos secrets/env do projeto.");  
    process.exit(1);  
  }  
  
  const targetFile = path.resolve(process.cwd(), 'js/app.js');  
  if (!fs.existsSync(targetFile)) {  
    console.error(`[ERRO CRÍTICO] Arquivo não localizado: ${targetFile}`);  
    process.exit(1);  
  }  
  
  const codeContent = fs.readFileSync(targetFile, 'utf8');  
  
  if (!codeContent.trim()) {
    console.warn(`[AVISO] O arquivo ${targetFile} está vazio. Encerrando operação.`);
    return;
  }

  console.log(`[INFO] Analisando ${targetFile} (${codeContent.length} bytes)...`);  

  // Proteção contra estouro de limite de tokens
  let processedCode = codeContent;
  const MAX_CODE_LENGTH = 14000;
  if (processedCode.length > MAX_CODE_LENGTH) {
    console.log(`[AVISO] Arquivo grande detectado. Otimizando trecho para análise heurística...`);
    processedCode = '// [Trecho anterior omitido por otimização de tamanho]\n' + processedCode.slice(-MAX_CODE_LENGTH);
  }

  const prompt = `
Você é o J.A.R.V.I.S., uma Inteligência Artificial avançada de engenharia de software e arquitetura frontend.
Analise o código abaixo do arquivo js/app.js em busca de erros de sintaxe, bugs, quebras de compatibilidade ou falhas estruturais.
Se estiver tudo correto, adicione um comentário elegante no início confirmando que o sistema de auto-correção autônoma está ativo e operacional.

IMPORTANTE: Retorne integralmente o código funcional no campo "newContent", SEM omissões e SEM truncamentos.

Código atual:
\`\`\`javascript
${processedCode}
\`\`\`

Retorne ESTRITAMENTE um objeto JSON válido no formato abaixo, sem NENHUM texto ou marcação extra fora do bloco JSON:
{
  "hasError": true,
  "explanation": "Descrição técnica e direta da falha e da correção aplicada",
  "newContent": "Código completo, corrigido e otimizado"
}
`;

  try {
    console.log("[JARV-HEAL] Transmitindo dados para análise heurística...");
    
    const textResponse = await callGroqWithAutoModel(apiKey, prompt);

    const jsonStartIndex = textResponse.indexOf('{');
    const jsonEndIndex = textResponse.lastIndexOf('}');
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      throw new Error('Falha no parse: A IA não retornou uma estrutura JSON reconhecível.');
    }

    const jsonString = textResponse.substring(jsonStartIndex, jsonEndIndex + 1);
    
    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("[ERRO PARSE] Estrutura JSON corrompida pela IA.");
      throw new Error(parseError.message);
    }

    if (result.newContent && result.newContent.trim().length > 0) {
      console.log(`\n[JARV-HEAL] ⚠️ Processando ajustes no código!`);
      console.log(`[DIAGNÓSTICO] ${result.explanation}`);
      
      fs.writeFileSync(targetFile, result.newContent, 'utf8');
      
      console.log(`[JARV-HEAL] ✅ Código reparado e salvo em js/app.js com sucesso.`);
    } else {
      console.log("\n[JARV-HEAL] ✨ Monitoramento concluído. Nenhuma alteração necessária.");
    }

  } catch (error) {
    console.error(`\n[FALHA DE SISTEMA] Operação abortada: ${error.message}`);
    process.exit(1);
  }
}  
  
runAutoHeal();

/**
 * J.A.R.V.I.S. Auto-Heal Engine com Seleção Automática de Modelos (Fallback)
 * Módulo de auto-correção e diagnóstico contínuo via Groq API.
 */

const fs = require('fs');  
const path = require('path');

// Lista atualizada de modelos priorizados para seleção automática e fallback em cascata na Groq
const GROQ_MODELS = [
  'llama-3.3-70b-versatile', // Modelo primário de alta inteligência
  'llama-3.1-8b-instant',     // Fallback ultra-rápido e altamente estável
  'llama3-70b-8192',          // Alternativa clássica robusta de 70B
  'llama3-8b-8192'            // Alternativa clássica de 8B
];

async function callGroqWithAutoModel(apiKey, prompt) {
  const TIMEOUT_MS = 30000; // 30 segundos de limite para evitar travamento da engine

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
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: "json_object" } // Força o formato de saída estruturado
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[JARV-HEAL] ⚠️ O modelo ${model} falhou com status ${response.status}. Alternando para o próximo...`);
        continue;
      }

      const data = await response.json();
      const textResponse = data.choices?.[0]?.message?.content;

      if (textResponse) {
        console.log(`[JARV-HEAL] ✨ Resposta obtida via: ${model}`);
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
  
  throw new Error('Todos os modelos falharam ou o limite da API da Groq foi atingido.');
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
  
  // Prevenção de envio de arquivo vazio
  if (!codeContent.trim()) {
    console.warn(`[AVISO] O arquivo ${targetFile} está vazio. Encerrando operação.`);
    return;
  }

  console.log(`[INFO] Analisando ${targetFile} (${codeContent.length} bytes)...`);  

  const prompt = `
Você é o J.A.R.V.I.S., uma Inteligência Artificial avançada de engenharia de software e arquitetura frontend.
Analise o código abaixo do arquivo js/app.js em busca de erros de sintaxe, bugs, quebras de compatibilidade ou falhas estruturais.
Se estiver tudo correto, adicione um comentário elegante no início ou no fim do arquivo confirmando que o sistema de auto-correção autônoma está ativo e operacional.

Código atual:
\`\`\`javascript
${codeContent}
\`\`\`

Retorne ESTRITAMENTE um objeto JSON válido no formato abaixo, sem NENHUM texto ou marcação extra.
A propriedade "newContent" DEVE conter o código completo do arquivo atualizado com o ajuste.

{
  "hasError": true,
  "explanation": "Descrição técnica e direta da falha e da correção aplicada",
  "newContent": "Código completo, corrigido e otimizado"
}
`;

  try {
    console.log("[JARV-HEAL] Transmitindo dados para análise heurística...");
    
    const textResponse = await callGroqWithAutoModel(apiKey, prompt);

    // Sanitização de resposta bruta para isolamento rigoroso de JSON
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

    // Validação de segurança antes de sobrescrever o arquivo original
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

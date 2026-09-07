/**
 * J.A.R.V.I.S. Auto-Heal Engine - Protocolo Avançado de Auto-Correção
 * Módulo de diagnóstico e reparo contínuo via Groq API.
 * 
 * Versão: 7.1 (Com Modelos Oficiais Groq, Sanitize JSON, Key Fallback e Reconstrução de Arquivos Grandes)
 * Arquivo: scripts/jarv-heal.js
 */

const fs = require('fs');
const path = require('path');

// Chave reserva para garantir execução mesmo em caso de ausência nos Secrets do GitHub Actions
const FALLBACK_GROQ_KEY = "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";

// Lista oficial e atualizada de modelos de alta performance na Groq API
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768'
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
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
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
    
  const apiKey = process.env.GROQ_API_KEY || FALLBACK_GROQ_KEY;  
  if (!apiKey) {  
    console.error("[ERRO CRÍTICO] Nenhuma chave GROQ_API_KEY foi localizada.");  
    process.exit(1);  
  }  
  
  // Localiza dinamicamente o arquivo tanto na pasta js/ quanto na raiz
  let targetFile = path.resolve(process.cwd(), 'js/app.js');  
  if (!fs.existsSync(targetFile)) {  
    targetFile = path.resolve(process.cwd(), 'app.js');
    if (!fs.existsSync(targetFile)) {
      console.error(`[ERRO CRÍTICO] Arquivo app.js não localizado nem em js/app.js nem na raiz.`);  
      process.exit(1);  
    }
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
Analise o código abaixo do arquivo em busca de erros de sintaxe, bugs, quebras de compatibilidade ou falhas estruturais.
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

    // Sanitização rigorosa contra formatação Markdown (abrange cenários onde a IA usa tags javascript por engano)
    const cleanedText = textResponse
      .replace(/```json/gi, '')
      .replace(/```javascript/gi, '')
      .replace(/```/g, '')
      .trim();

    const jsonStartIndex = cleanedText.indexOf('{');
    const jsonEndIndex = cleanedText.lastIndexOf('}');
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      throw new Error('Falha no parse: A IA não retornou uma estrutura JSON reconhecível.');
    }

    const jsonString = cleanedText.substring(jsonStartIndex, jsonEndIndex + 1);
    
    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("[ERRO PARSE] Estrutura JSON corrompida pela IA.");
      console.debug("Conteúdo recebido:", jsonString);
      throw new Error(parseError.message);
    }

    // Valida se há conteúdo novo e se ele difere do original para evitar I/O desnecessário
    if (result.newContent && result.newContent.trim().length > 0 && result.newContent !== processedCode) {
      console.log(`\n[JARV-HEAL] ⚠️ Processando ajustes no código!`);
      console.log(`[DIAGNÓSTICO] ${result.explanation}`);
      
      let finalCode = result.newContent;

      // Reconstrução: Garante que a primeira metade do arquivo não seja deletada se houve truncamento inicial
      if (codeContent.length > MAX_CODE_LENGTH) {
        const omittedPart = codeContent.slice(0, codeContent.length - MAX_CODE_LENGTH);
        finalCode = omittedPart + finalCode.replace('// [Trecho anterior omitido por otimização de tamanho]\n', '');
      }
      
      fs.writeFileSync(targetFile, finalCode, 'utf8');
      
      console.log(`[JARV-HEAL] ✅ Código reparado e salvo em ${targetFile} com sucesso.`);
    } else {
      console.log("\n[JARV-HEAL] ✨ Monitoramento concluído. Nenhuma alteração necessária ou código já perfeitamente otimizado.");
    }

  } catch (error) {
    console.error(`\n[FALHA DE SISTEMA] Operação abortada: ${error.message}`);
    process.exit(1);
  }
}  
  
runAutoHeal();

/**
 * J.A.R.V.I.S. Auto-Heal Engine com Seleção Automática de Modelos (Fallback)
 * Módulo de auto-correção e diagnóstico contínuo via Groq API.
 */

const fs = require('fs');  
const path = require('path');

// Lista de modelos priorizados para seleção automática e fallback em cascata
const GROQ_MODELS = [
  'llama-3.3-70b-versatile', // Modelo primário (Alta inteligência e raciocínio complexo)
  'llama-3.1-70b-versatile', // Alternativa robusta de 70B
  'llama-3.1-8b-instant'     // Fallback de alta velocidade e leveza
];

async function callGroqWithAutoModel(apiKey, prompt) {
  for (const model of GROQ_MODELS) {
    try {
      console.log(`[JARV-HEAL] 🔄 Tentando conexão com o modelo: ${model}...`);
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        console.warn(`[JARV-HEAL] ⚠️ O modelo ${model} retornou status ${response.status}. Alternando para o próximo da fila...`);
        continue;
      }

      const data = await response.json();
      const textResponse = data.choices?.[0]?.message?.content;

      if (textResponse) {
        console.log(`[JARV-HEAL] ✨ Sucesso! Resposta obtida usando o modelo: ${model}`);
        return textResponse;
      }
    } catch (err) {
      console.warn(`[JARV-HEAL] ⚠️ Falha técnica no modelo ${model}: ${err.message}. Tentando próxima opção...`);
    }
  }
  
  throw new Error('Todos os modelos da lista de fallback falharam ou atingiram o limite de requisições.');
}

async function runAutoHeal() {  
  console.log("[JARV-HEAL] Robô de auto-correção iniciado...");  
    
  const apiKey = process.env.GROQ_API_KEY;  
  if (!apiKey) {  
    console.error("[ERRO] GROQ_API_KEY não encontrada nos secrets do repositório.");  
    process.exit(1);  
  }  
  
  // Garante a localização exata do arquivo js/app.js a partir da raiz da execução
  const targetFile = path.resolve(process.cwd(), 'js/app.js');  
  if (!fs.existsSync(targetFile)) {  
    console.error(`[ERRO] Arquivo alvo ${targetFile} não encontrado.`);  
    process.exit(1);  
  }  
  
  const codeContent = fs.readFileSync(targetFile, 'utf8');  
  console.log(`[INFO] Analisando o arquivo ${targetFile} (${codeContent.length} caracteres)...`);  

  // Prompt estruturado para o J.A.R.V.I.S. diagnosticar e corrigir o código
  const prompt = `
Você é o J.A.R.V.I.S., uma Inteligência Artificial avançada de engenharia de software e arquitetura frontend.
Analise o código abaixo do arquivo js/app.js em busca de erros de sintaxe, bugs, quebras de compatibilidade ou falhas estruturais.

Código atual:
\`\`\`javascript
${codeContent}
\`\`\`

Retorne estritamente um JSON no formato abaixo, sem nenhum texto ou marcação extra fora do bloco JSON:
{
  "hasError": true,
  "explanation": "Descrição clara do erro ou melhoria aplicada",
  "newContent": "Código completo, corrigido e otimizado do arquivo"
}

Se o código estiver perfeitamente íntegro e sem falhas, defina "hasError" como false e repita o código original em "newContent".
`;

  try {
    console.log("[JARV-HEAL] Acionando o seletor automático de inteligência...");
    
    const textResponse = await callGroqWithAutoModel(apiKey, prompt);

    // Sanitiza a resposta para remover delimitadores Markdown de bloco JSON
    const cleanedText = textResponse.replace(/```json\s*|\s*```/gi, '').trim();
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('A IA não retornou um formato JSON válido.');
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.hasError && result.newContent) {
      console.log(`[JARV-HEAL] ⚠️ Correção necessária detectada: ${result.explanation}`);
      fs.writeFileSync(targetFile, result.newContent, 'utf8');
      console.log(`[JARV-HEAL] ✅ Arquivo js/app.js corrigido e atualizado com sucesso pelo J.A.R.V.I.S.!`);
    } else {
      console.log("[JARV-HEAL] ✨ Sistema em modo de escuta. Nenhum erro crítico detectado no momento.");
    }

  } catch (error) {
    console.error("[ERRO] Falha crítica no processo de Auto-Heal:", error.message);
    process.exit(1);
  }
}  
  
runAutoHeal();

/**
 * J.A.R.V.I.S. Auto-Heal Engine
 * Módulo de auto-correção e diagnóstico contínuo via Groq API.
 */

const fs = require('fs');  
const path = require('path');

async function runAutoHeal() {  
  console.log("[JARV-HEAL] Robô de auto-correção iniciado...");  
    
  const apiKey = process.env.GROQ_API_KEY;  
  if (!apiKey) {  
    console.error("[ERRO] GROQ_API_KEY não encontrada nos secrets do repositório.");  
    process.exit(1);  
  }  
  
  // Verificação e leitura do arquivo principal do projeto
  const targetFile = 'js/app.js';  
  if (!fs.existsSync(targetFile)) {  
    console.error(`[ERRO] Arquivo alvo ${targetFile} não encontrado.`);  
    process.exit(1);  
  }  
  
  const codeContent = fs.readFileSync(targetFile, 'utf8');  
  console.log(`[INFO] Analisando o arquivo ${targetFile} (${codeContent.length} caracteres)...`);  

  // Prompt estruturado para o J.A.R.V.I.S. diagnosticar e corrigir o código
  const prompt = `
Você é o J.A.R.V.I.S., uma Inteligência Artificial avançada de engenharia de software e arquitetura frontend.
Analise o código abaixo do arquivo ${targetFile} em busca de erros de sintaxe, bugs, quebras de compatibilidade ou falhas estruturais.

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
    console.log("[JARV-HEAL] Conectando com a API da Groq para varredura lógica...");
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      })
    });

    const data = await response.json();
    const textResponse = data.choices?.[0]?.message?.content;

    if (!textResponse) {
      throw new Error('A resposta da API da Groq veio vazia.');
    }

    // Extrai o JSON limpo da resposta da IA
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('A IA não retornou um formato JSON válido.');
    }

    const result = JSON.parse(jsonMatch[0]);

    if (result.hasError && result.newContent) {
      console.log(`[JARV-HEAL] ⚠️ Correção necessária detectada: ${result.explanation}`);
      fs.writeFileSync(targetFile, result.newContent, 'utf8');
      console.log(`[JARV-HEAL] ✅ Arquivo ${targetFile} corrigido e atualizado com sucesso pelo J.A.R.V.I.S.!`);
    } else {
      console.log("[JARV-HEAL] ✨ Sistema em modo de escuta. Nenhum erro crítico detectado no momento.");
    }

  } catch (error) {
    console.error("[ERRO] Falha crítica no processo de Auto-Heal:", error.message);
    process.exit(1);
  }
}  
  
runAutoHeal();

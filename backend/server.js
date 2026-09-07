import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const MODELS_TO_TRY = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-20b'
];

app.post('/api/chat', async (req, res) => {
  console.log('📥 Requisição recebida em /api/chat:', req.body);
  try {
    const { messages } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey || apiKey === 'cole_sua_chave_groq_aqui') {
      console.warn('⚠️ GROQ_API_KEY não configurada. Usando simulador neural J.A.R.V.I.S.');
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      return res.json({ 
        reply: `[J.A.R.V.I.S. CORE] Analisei sua solicitação ("${lastUserMsg}"). Sistemas operacionais, matriz quântica e defesas orbitais em 98.4% de eficiência. (Nota: Configure sua GROQ_API_KEY no arquivo .env para ativar a IA avançada de alta velocidade).` 
      });
    }

    let data = null;
    let success = false;
    let lastErrorMsg = '';

    for (const model of MODELS_TO_TRY) {
      console.log(`🔄 Tentando modelo: ${model}`);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false
        })
      });
      
      data = await response.json();
      if (response.ok) {
        success = true;
        console.log(`✅ Sucesso com o modelo: ${model}`);
        break;
      } else {
        lastErrorMsg = data.error?.message || 'Erro desconhecido';
        console.warn(`⚠️ Falha com o modelo ${model}: ${lastErrorMsg}`);
      }
    }

    if (!success) {
      console.warn(`⚠️ Todos os modelos falharam. Ativando resposta táctica de contingência.`);
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      return res.json({ 
        reply: `[J.A.R.V.I.S. Contingência] Processando instrução: "${lastUserMsg}". Redirecionando fluxo para o sub-núcleo neural local. Todos os protocolos de segurança ativos.` 
      });
    }
    
    const reply = data.choices?.[0]?.message?.content || 'Sem resposta do modelo.';
    console.log('✅ Resposta enviada com sucesso');
    res.json({ reply });
  } catch (error) {
    console.error('❌ Erro no AI Gateway:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`AI Gateway rodando na porta ${PORT} com fallback avançado`));

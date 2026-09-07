/**
 * J.A.R.V.I.S. v6.0 Core Protocol - Cloudflare Worker
 * Proxy seguro para a API da Groq com suporte a CORS, histórico de mensagens 
 * e cascata automática de fallback entre modelos LLM.
 */

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Tratamento para requisições de preflight (CORS)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Processamento de requisições POST (Interação com a IA)
    if (request.method === "POST") {
      try {
        const body = await request.json();
        
        // Suporte tanto para envio de string única ("message") quanto array completo de contexto ("messages")
        const messages = body.messages || [
          { role: "user", content: body.message || "Status do sistema J.A.R.V.I.S." }
        ];

        // Cascata de Modelos Groq (Ordem estrita definida no PRD v6.0)
        const modelCascade = [
          "llama-3.3-70b-versatile", // Primário
          "llama-3.1-70b-versatile", // Secundário
          "llama-3.1-8b-instant"     // Fallback de Alta Velocidade
        ];

        let aiResponse = null;
        let successfulModel = null;
        let responseData = null;

        // Loop de tentativa através da cascata de modelos para garantir alta resiliência
        for (const model of modelCascade) {
          try {
            aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 4096
              })
            });

            if (aiResponse.ok) {
              responseData = await aiResponse.json();
              if (responseData.choices && responseData.choices.length > 0) {
                successfulModel = model;
                break; // Sucesso obtido, interrompe o loop de fallback
              }
            }
          } catch (modelError) {
            console.warn(`[J.A.R.V.I.S. Worker] Falha ao contatar modelo ${model}:`, modelError.message);
          }
        }

        if (!responseData || !responseData.choices?.[0]?.message?.content) {
          throw new Error("Todos os modelos da cascata Groq falharam ou retornaram resposta vazia.");
        }

        const reply = responseData.choices[0].message.content;

        return new Response(JSON.stringify({ 
          success: true, 
          reply, 
          modelUsed: successfulModel 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Resposta padrão para testes de conectividade via GET
    return new Response("J.A.R.V.I.S. v6.0 Core Worker Online 🚀", { status: 200, headers: corsHeaders });
  }
};

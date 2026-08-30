export default {
  async fetch(request, env, ctx) {
    // Configurar cabeçalhos CORS para permitir requisições do seu GitHub Pages
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === "POST") {
      try {
        const { message } = await request.json();

        // 🤖 Envio da diretriz para a API da Groq
        const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: message }]
          })
        });

        const data = await aiResponse.json();
        const reply = data.choices?.[0]?.message?.content || "Sem resposta da IA.";

        return new Response(JSON.stringify({ success: true, reply }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("J.A.R.V.I.S. Worker Online 🚀", { status: 200, headers: corsHeaders });
  }
};

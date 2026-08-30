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
        const data = await request.json();

        // Aqui entra a lógica de envio para a API da IA (ex: Groq / Gemini)
        // Usando a chave secreta salva no ambiente da Cloudflare (env.GROQ_API_KEY)

        return new Response(JSON.stringify({ success: true, message: "Mensagem processada pelo Worker com sucesso!" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("J.A.R.V.I.S. Worker Online", { status: 200, headers: corsHeaders });
  }
};


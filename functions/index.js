const { onRequest } = require("firebase-functions/v2/https");

exports.chat = onRequest(
  {
    region: "southamerica-east1",
    cors: true,
    secrets: ["GROQ_API_KEY"]
  },
  async (req, res) => {

    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método não permitido."
      });
    }

    try {

      const { message, history = [] } = req.body || {};

      if (!message || typeof message !== "string") {
        return res.status(400).json({
          error: "Mensagem inválida."
        });
      }

      const apiKey = process.env.GROQ_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          error: "GROQ_API_KEY não configurada."
        });
      }

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",

            messages: [
              {
                role: "system",
                content:
                  "Você é J.A.R.V.I.S., um assistente técnico avançado."
              },

              ...history
                .filter(
                  (item) =>
                    item &&
                    typeof item.content === "string" &&
                    (item.role === "user" ||
                      item.role === "assistant")
                )
                .slice(-20),

              {
                role: "user",
                content: message
              }
            ],

            temperature: 0.7,
            max_tokens: 2048
          })
        }
      );

      if (!response.ok) {

        const errorText = await response.text();

        return res.status(502).json({
          error: "Provedor de IA retornou erro.",
          details: errorText
        });
      }

      const data = await response.json();

      const content =
        data?.choices?.[0]?.message?.content ||
        "Não foi retornada uma resposta.";

      return res.json({
        content
      });

    } catch (error) {

      console.error("JARV-IA CHAT ERROR:", error);

      return res.status(500).json({
        error: "Erro interno ao processar a solicitação."
      });
    }
  }
);

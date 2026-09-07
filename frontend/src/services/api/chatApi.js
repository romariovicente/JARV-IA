export async function sendChatMessage(message, history = []) {
  const response = await fetch("/api/chat", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      message,
      history
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Erro na API.");
  }

  const data = await response.json();

  return data.content;
}

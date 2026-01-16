import OpenAI from "openai";

export async function* sendToGeminiStream(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt?: string
): AsyncGenerator<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const client = new OpenAI({
    apiKey: GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });

  const chatMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [];

  // ✅ Gemini supports system role when using OpenAI compatibility
  if (systemPrompt) {
    chatMessages.push({ role: "system", content: systemPrompt });
  }

  chatMessages.push(...messages);

  const stream = await client.chat.completions.create({
    model: "gemini-2.5-flash",
    messages: chatMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}

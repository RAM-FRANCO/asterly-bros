import { OpenRouter } from "@openrouter/sdk";

const AI_TIMEOUT_MS = 30000;

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const ENRICHMENT_MODEL =
  process.env.ENRICHMENT_MODEL || "deepseek/deepseek-chat-v3-0324";
const EMAIL_MODEL =
  process.env.EMAIL_MODEL || "deepseek/deepseek-chat-v3-0324";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function aiEnrich(prompt: string): Promise<string> {
  const response = await withTimeout(
    client.chat.send({
      chatGenerationParams: {
        model: ENRICHMENT_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        maxTokens: 2000,
      },
    }),
    AI_TIMEOUT_MS,
    "AI enrichment"
  );

  if ("choices" in response) {
    const choice = response.choices?.[0];
    if (choice && "message" in choice) {
      return (choice.message?.content as string) ?? "";
    }
  }
  return "";
}

export async function aiGenerateEmail(prompt: string): Promise<string> {
  const response = await withTimeout(
    client.chat.send({
      chatGenerationParams: {
        model: EMAIL_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        maxTokens: 2000,
      },
    }),
    AI_TIMEOUT_MS,
    "AI email generation"
  );

  if ("choices" in response) {
    const choice = response.choices?.[0];
    if (choice && "message" in choice) {
      return (choice.message?.content as string) ?? "";
    }
  }
  return "";
}

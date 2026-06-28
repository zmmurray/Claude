import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type ChatTurn = { role: "user" | "assistant"; content: string };

const provider = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
const anthropicModel = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const openaiModel = process.env.OPENAI_MODEL ?? "gpt-4o";

/** One call to the configured model. Provider-agnostic so we can swap Claude/GPT. */
export async function callModel(system: string, messages: ChatTurn[], maxTokens = 1800): Promise<string> {
  if (provider === "openai") {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: openaiModel,
      temperature: 0.3,
      messages: [{ role: "system", content: system }, ...messages],
    });
    return res.choices[0]?.message?.content ?? "";
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: anthropicModel,
    max_tokens: maxTokens,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const text = res.content.find((b) => b.type === "text");
  return text && text.type === "text" ? text.text : "";
}

/** Pull a JSON object out of a model reply, tolerating prose or ``` fences. */
export function extractJSON<T>(raw: string): T | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

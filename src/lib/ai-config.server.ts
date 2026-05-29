// Backend-agnostic AI configuration.
// Works with any OpenAI-compatible endpoint (OpenAI, OpenRouter, Together,
// Groq, Anyscale, self-hosted vLLM/Ollama, etc.). Fully provider-agnostic —
// no Lovable dependency.
//
// Resolution order (server-only env):
//   1. If AI_BASE_URL + AI_API_KEY are set → use them (fully custom).
//   2. Else if OPENAI_API_KEY is set → use OpenAI directly.
//   3. Else → null (caller must handle "AI unavailable" gracefully).

export type AIConfig = {
  url: string;
  key: string;
  // Map a logical model name (e.g. "google/gemini-2.5-flash") to the
  // model id this provider understands.
  model: (logical: string) => string;
};

export function getAIConfig(): AIConfig | null {
  const customUrl = process.env.AI_BASE_URL;
  const customKey = process.env.AI_API_KEY;
  const customModel = process.env.AI_MODEL; // optional override

  if (customUrl && customKey) {
    return {
      url: customUrl.replace(/\/$/, "") + "/chat/completions",
      key: customKey,
      model: (logical) => customModel || logical,
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: openaiKey,
      model: (logical) => {
        if (customModel) return customModel;
        // Map generic logical model names → OpenAI equivalents.
        if (logical.startsWith("google/gemini-2.5-pro")) return "gpt-4o";
        if (logical.startsWith("google/gemini")) return "gpt-4o-mini";
        if (logical.startsWith("openai/")) return logical.slice("openai/".length);
        return "gpt-4o-mini";
      },
    };
  }

  return null;
}
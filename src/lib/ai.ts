import { ModelConfig, ContextReference, ChatMessage } from "@/types";

const DEFAULT_SYSTEM_PROMPT = `You are NexusCode AI, an expert coding assistant embedded in an AI-native code editor. You have deep understanding of codebases and can help with:

- Writing, modifying, and explaining code
- Debugging and fixing issues
- Refactoring and optimization
- Architecture decisions
- Code reviews

When referencing code, use specific file paths and line numbers. When suggesting changes, provide complete code blocks. Be concise but thorough.`;

export async function streamChat(
  messages: ChatMessage[],
  context: ContextReference[],
  config: ModelConfig,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const systemMessage = buildSystemMessage(context);
  const apiMessages = [
    { role: "system" as const, content: systemMessage },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: apiMessages,
      config,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullResponse = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split("\n").filter((l) => l.startsWith("data: "));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || parsed.content || "";
        if (content) {
          fullResponse += content;
          onChunk(content);
        }
      } catch {
        if (data.trim()) {
          fullResponse += data;
          onChunk(data);
        }
      }
    }
  }

  return fullResponse;
}

export async function generateInlineEdit(
  code: string,
  instruction: string,
  filePath: string,
  config: ModelConfig
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: `You are an inline code editor. Given existing code and an instruction, output ONLY the modified code. Do not include explanations, markdown fences, or anything else — just the raw code. File: ${filePath}`,
        },
        {
          role: "user",
          content: `Existing code:\n\`\`\`\n${code}\n\`\`\`\n\nInstruction: ${instruction}\n\nOutput the modified code only:`,
        },
      ],
      config,
      stream: false,
    }),
  });

  if (!response.ok) throw new Error(`Inline edit API error: ${response.statusText}`);
  const data = await response.json();
  let result = data.content || data.choices?.[0]?.message?.content || "";
  result = result.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");
  return result;
}

export async function generateEmbedding(
  text: string,
  config?: Partial<ModelConfig>
): Promise<number[]> {
  const response = await fetch("/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, config }),
  });

  if (!response.ok) throw new Error(`Embedding API error: ${response.statusText}`);
  const data = await response.json();
  return data.embedding;
}

export async function semanticSearch(
  query: string,
  projectId: string,
  limit: number = 10
): Promise<ContextReference[]> {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, projectId, limit }),
  });

  if (!response.ok) throw new Error(`Search API error: ${response.statusText}`);
  const data = await response.json();
  return data.results;
}

export async function generateComposerPlan(
  prompt: string,
  context: ContextReference[],
  config: ModelConfig
): Promise<string> {
  const response = await fetch("/api/composer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, context, config }),
  });

  if (!response.ok) throw new Error(`Composer API error: ${response.statusText}`);
  const data = await response.json();
  return data.plan;
}

export async function generateCodeReview(
  filePath: string,
  content: string,
  config: ModelConfig
): Promise<string> {
  const response = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filePath, content, config }),
  });

  if (!response.ok) throw new Error(`Review API error: ${response.statusText}`);
  const data = await response.json();
  return data.review;
}

function buildSystemMessage(context: ContextReference[]): string {
  let message = DEFAULT_SYSTEM_PROMPT;

  if (context.length > 0) {
    message += "\n\n## Relevant Context\n\n";
    for (const ref of context) {
      switch (ref.type) {
        case "file":
          message += `### File: ${ref.path || ref.name}\n\`\`\`\n${ref.content || "Content not available"}\n\`\`\`\n\n`;
          break;
        case "function":
          message += `### Function: ${ref.name} (${ref.path})\n\`\`\`\n${ref.content || ""}\n\`\`\`\n\n`;
          break;
        case "selection":
          message += `### Selected Code (${ref.path} L${ref.startLine}-${ref.endLine})\n\`\`\`\n${ref.content || ""}\n\`\`\`\n\n`;
          break;
        case "docs":
          message += `### Documentation: ${ref.name}\n${ref.content || ""}\n\n`;
          break;
        case "search":
          message += `### Search Result: ${ref.name}\n${ref.content || ""}\n\n`;
          break;
      }
    }
  }

  return message;
}

export function parseMentions(
  text: string
): { cleanText: string; mentions: Array<{ type: string; value: string }> } {
  const mentionRegex = /@(file|function|docs):([^\s]+)/g;
  const mentions: Array<{ type: string; value: string }> = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({ type: match[1], value: match[2] });
  }

  const cleanText = text.replace(mentionRegex, "").trim();
  return { cleanText, mentions };
}

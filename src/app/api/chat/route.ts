import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { messages, config, stream } = await request.json();

    if (!config?.apiKey && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      // Return a helpful response when no API key is configured
      const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
      const helpfulResponse = generateLocalResponse(lastUserMsg?.content || "");

      if (stream) {
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          start(controller) {
            const words = helpfulResponse.split(" ");
            let idx = 0;
            const interval = setInterval(() => {
              if (idx < words.length) {
                const chunk = (idx === 0 ? "" : " ") + words[idx];
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
                );
                idx++;
              } else {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                clearInterval(interval);
              }
            }, 30);
          },
        });
        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      return NextResponse.json({ content: helpfulResponse });
    }

    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || "";
    const provider = config?.provider || "openai";
    const model = config?.model || "gpt-4o";

    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: config?.maxTokens || 4096,
          temperature: config?.temperature ?? 0.7,
          stream: !!stream,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json({ error }, { status: response.status });
      }

      if (stream) {
        return new Response(response.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      const data = await response.json();
      return NextResponse.json({
        content: data.choices[0].message.content,
      });
    } else {
      // Anthropic
      const anthropicKey = config?.apiKey || process.env.ANTHROPIC_API_KEY || "";
      const systemMsg = messages.find((m: any) => m.role === "system");
      const nonSystemMsgs = messages.filter((m: any) => m.role !== "system");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: config?.maxTokens || 4096,
          system: systemMsg?.content || "",
          messages: nonSystemMsgs,
          stream: !!stream,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json({ error }, { status: response.status });
      }

      if (stream) {
        // Transform Anthropic SSE format to our format
        const transformer = new TransformStream({
          transform(chunk, controller) {
            const text = new TextDecoder().decode(chunk);
            const lines = text.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === "content_block_delta") {
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({ content: data.delta.text })}\n\n`
                      )
                    );
                  } else if (data.type === "message_stop") {
                    controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                  }
                } catch {}
              }
            }
          },
        });

        return new Response(response.body!.pipeThrough(transformer), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      const data = await response.json();
      return NextResponse.json({
        content: data.content[0].text,
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generateLocalResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    return "Hello! I'm NexusCode AI. I can help you understand and modify your codebase. To enable full AI capabilities, add your API key in Settings (Cmd+,). In the meantime, try exploring the file tree, using the terminal, or reviewing code with the built-in tools.";
  }

  if (msg.includes("explain") || msg.includes("what does") || msg.includes("how does")) {
    return "I'd love to explain this code! To get detailed AI-powered explanations, please configure your API key in **Settings > AI Models**. You can use either OpenAI or Anthropic.\n\nIn the meantime, you can:\n- Browse the file tree to understand the project structure\n- Use **Cmd+Shift+F** to search across files\n- Use the terminal to explore the codebase";
  }

  if (msg.includes("refactor") || msg.includes("improve") || msg.includes("optimize")) {
    return "I can help with refactoring! Here are some general best practices for the code in this project:\n\n1. **Extract shared logic** into utility functions\n2. **Use TypeScript interfaces** for better type safety\n3. **Add error boundaries** and proper error handling\n4. **Follow SOLID principles** for maintainable code\n\nFor AI-powered refactoring suggestions, add your API key in Settings.";
  }

  if (msg.includes("test")) {
    return "For testing this codebase, I recommend:\n\n1. **Unit tests** with Jest for services and utilities\n2. **Integration tests** for API routes\n3. **Mock external dependencies** (database, Redis)\n\nExample test structure:\n```typescript\ndescribe('UserService', () => {\n  it('should find user by id', async () => {\n    const user = await userService.findById('test-id');\n    expect(user).toBeDefined();\n  });\n});\n```\n\nFor AI-generated tests, configure your API key in Settings.";
  }

  return "I'm NexusCode AI, your coding assistant. I can help with:\n\n- **Code explanation** and documentation\n- **Refactoring** suggestions\n- **Bug fixes** and debugging\n- **Writing tests**\n- **Architecture** decisions\n\nTo unlock full AI capabilities, add your OpenAI or Anthropic API key in **Settings** (Cmd+,).\n\nYou can also use:\n- **Cmd+K** for inline edits\n- **@file:path** to reference files\n- **@function:name** to reference functions\n- **Cmd+Shift+I** for the multi-file Composer";
}

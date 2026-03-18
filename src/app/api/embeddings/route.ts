import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, config } = await request.json();

    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Return a deterministic pseudo-embedding for local development
      const embedding = generatePseudoEmbedding(text);
      return NextResponse.json({ embedding });
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config?.model || "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      embedding: data.data[0].embedding,
    });
  } catch (error) {
    console.error("Embedding API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generatePseudoEmbedding(text: string): number[] {
  // Generate a deterministic pseudo-embedding based on text content
  // This allows semantic search to work in demo mode
  const embedding = new Array(1536).fill(0);
  const words = text.toLowerCase().split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = ((hash << 5) - hash + word.charCodeAt(j)) | 0;
    }
    // Distribute the hash across embedding dimensions
    for (let d = 0; d < 10; d++) {
      const idx = Math.abs((hash + d * 7919) % 1536);
      embedding[idx] += 1 / (words.length + 1);
    }
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0)) || 1;
  return embedding.map((v) => v / norm);
}

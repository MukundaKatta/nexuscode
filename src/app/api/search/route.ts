import { NextRequest, NextResponse } from "next/server";
import { ContextReference } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { query, projectId, limit = 10 } = await request.json();

    // For demo: perform text-based search since we may not have Supabase
    const { getAllFiles } = await import("@/lib/filesystem");
    const files = getAllFiles();
    const results: ContextReference[] = [];
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(Boolean);

    for (const [path, content] of Object.entries(files)) {
      const contentLower = content.toLowerCase();
      const pathLower = path.toLowerCase();

      // Score based on term matches
      let score = 0;
      for (const term of queryTerms) {
        if (pathLower.includes(term)) score += 3;
        const occurrences = (contentLower.match(new RegExp(term, "g")) || []).length;
        score += Math.min(occurrences, 5);
      }

      if (score > 0) {
        // Find the most relevant section
        const lines = content.split("\n");
        let bestLineIdx = 0;
        let bestLineScore = 0;

        for (let i = 0; i < lines.length; i++) {
          const lineLower = lines[i].toLowerCase();
          let lineScore = 0;
          for (const term of queryTerms) {
            if (lineLower.includes(term)) lineScore++;
          }
          if (lineScore > bestLineScore) {
            bestLineScore = lineScore;
            bestLineIdx = i;
          }
        }

        // Extract context around best match
        const start = Math.max(0, bestLineIdx - 5);
        const end = Math.min(lines.length, bestLineIdx + 15);
        const excerpt = lines.slice(start, end).join("\n");

        results.push({
          type: "file",
          name: path.split("/").pop() || path,
          path,
          content: excerpt,
          startLine: start + 1,
          endLine: end,
        });
      }
    }

    // Sort by relevance and limit
    results.sort((a, b) => {
      const scoreA = queryTerms.reduce(
        (s, t) => s + ((a.content || "").toLowerCase().includes(t) ? 1 : 0),
        0
      );
      const scoreB = queryTerms.reduce(
        (s, t) => s + ((b.content || "").toLowerCase().includes(t) ? 1 : 0),
        0
      );
      return scoreB - scoreA;
    });

    return NextResponse.json({
      results: results.slice(0, limit),
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

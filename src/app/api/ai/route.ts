import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const PROMPTS: Record<string, (title: string, author: string, brief: string) => string> = {
  hard: (title, author, brief) =>
    `You are a university-level research assistant. The student is writing about: "${brief}".

They are reading the source: "${title}" by ${author || "unknown author"}.

Write a detailed academic summary of this source (300-500 words). Include:
- The main argument / thesis
- Key evidence and examples used
- How it relates to the student's essay question
- Strengths and weaknesses of the argument
- Key quotes worth reading in full (give page number hints if possible)

Write in clear academic English. This is a STUDY AID — remind the student to read the original source.`,

  soft: (title, author, brief) =>
    `You are a university-level research assistant. The student is writing about: "${brief}".

They are reading: "${title}" by ${author || "unknown author"}.

Write a brief 3-4 sentence overview of what this source is likely about and how it might be relevant to their essay. Keep it simple and accessible. End with a suggestion of what to look for when reading it.`,

  cards: (title, author, brief) =>
    `You are a university-level research assistant. The student is reading: "${title}" by ${author || "unknown author"} for an essay about: "${brief}".

Generate 5-8 flashcard-style Q&A pairs from this source. Format each as:

Q: [question]
A: [concise answer]

Focus on key concepts, arguments, and evidence that would be useful for the essay. Keep answers to 1-2 sentences.`,

  pages: (title, author, brief) =>
    `You are a university-level research assistant. The student is writing about: "${brief}".

They have the source: "${title}" by ${author || "unknown author"}.

Suggest which sections/chapters of this source are most likely relevant to their essay question. Format as a bullet list with brief explanations of what to look for in each section. If you're not sure of exact page numbers, suggest what keywords or topics to search for within the text.`,

  essay_plan: (title, _author, brief) =>
    `You are an expert UK university essay tutor. A student needs help planning their essay.

${brief}

Essay question: "${title}"

Create a detailed essay plan with:

1. A clear thesis statement they could use
2. For each body paragraph (suggest 3-4), provide:
   - The main POINT (topic sentence)
   - What EVIDENCE to look for (types of sources, scholars, data)
   - How to EXPLAIN the evidence (connecting phrases, reasoning)
   - How to ANALYSE it (significance, implications, links to thesis)
3. Suggested counter-arguments to address
4. A strong conclusion approach

Use the PEEA structure (Point, Evidence, Explain, Analysis) explicitly. Be specific and practical — give them actual sentence starters and scholar names to look up where possible. Write for a UK university context.`,
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI features are not configured. Add ANTHROPIC_API_KEY to environment variables." },
      { status: 500 }
    );
  }

  try {
    const { kind, title, author, brief } = await req.json();

    if (!kind || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const promptFn = PROMPTS[kind];
    if (!promptFn) {
      return NextResponse.json({ error: "Invalid summary type" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        { role: "user", content: promptFn(title, author || "", brief || "General research") },
      ],
    });

    // Extract text from response
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

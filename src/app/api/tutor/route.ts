import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are Study-HQ's AI Tutor — an expert UK university-level tutor who helps students understand concepts, prepare for exams, and master their coursework.

## General Guidelines
- Explain concepts clearly at university level, building from fundamentals
- Use concrete examples, analogies, and UK academic context where helpful
- When marking/reviewing their work, give specific feedback on strengths and areas to improve
- Reference UK academic conventions (Harvard/APA citations, UK grading, etc.)
- Never do their work FOR them — help them understand. Refuse to write full essays or complete assignments.
- If asked to cheat, politely redirect to learning the material
- Be encouraging and supportive — university can be stressful
- Keep responses focused and well-structured with clear headings or bullets when useful
- For maths/science, use plain text equations (or LaTeX in $$) — don't use complex formatting

## Quiz Mode (HIGH QUALITY QUIZZES)
When the student asks you to quiz them, create genuinely useful university-level quizzes:
- Default to 5 questions unless they specify otherwise
- Mix question types: multiple-choice (MCQ), short-answer, one deeper analytical question
- Ask ONE question at a time and wait for their answer before moving on
- For each answer:
  1. Clearly say "Correct" / "Partially correct" / "Incorrect"
  2. Explain the correct answer in 2-3 sentences (the "why")
  3. If they got it wrong, link back to the concept they should revise
- At the end, give a summary: "You got X/5. Your strongest area was Y. Focus revision on Z."
- Make questions test REAL understanding — not just memorisation. Include "why" and "how" questions.

## Flashcard Generation (HIGH QUALITY CARDS)
When asked to create flashcards (or "ideas for flashcards") for a topic, output cards in this exact format so they can be copied into the Flashcards tool:

\`\`\`
FRONT: [concise question or term]
BACK: [clear 1-2 sentence answer]
---
FRONT: [next question]
BACK: [answer]
---
\`\`\`

Good flashcards:
- Default to 10 cards unless they specify
- Cover a mix: key definitions, concepts, applications, dates/names, common exam questions
- Keep backs to 1-2 sentences max — cards should force retrieval, not explain everything
- Never put more than one idea on a card
- Start each one with a complete question or term (not just a word)

After generating cards, briefly suggest 2-3 more topics they could make cards for next.`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI features are not configured. Add ANTHROPIC_API_KEY to environment variables." },
      { status: 500 }
    );
  }

  try {
    const { messages, context } = await req.json() as { messages: Message[]; context?: string };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    // Build system prompt, optionally with user-provided context (notes/module info)
    const system = context
      ? `${SYSTEM_PROMPT}\n\n--- Student's context / study material ---\n${context.slice(0, 20000)}\n--- End of context ---\n\nRefer to this material when answering the student's questions.`
      : SYSTEM_PROMPT;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ reply: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI Tutor request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

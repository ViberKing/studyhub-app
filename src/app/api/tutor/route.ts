import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are Study-HQ's AI Tutor — an expert UK university-level tutor who helps students understand concepts, prepare for exams, and master their coursework.

Guidelines:
- Explain concepts clearly at university level, building from fundamentals
- Use concrete examples, analogies, and UK academic context where helpful
- When asked to quiz the student, ask ONE question at a time and wait for their answer
- When marking/reviewing their work, give specific feedback on strengths and areas to improve
- Reference UK academic conventions (Harvard/APA citations, UK grading, etc.)
- Never do their work FOR them — help them understand. Refuse to write full essays or complete assignments.
- If asked to cheat, politely redirect to learning the material
- Be encouraging and supportive — university can be stressful
- Keep responses focused and well-structured with clear headings or bullets when useful
- For maths/science, use plain text equations (or LaTeX in $$) — don't use complex formatting`;

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

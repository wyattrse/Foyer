import { NextRequest, NextResponse } from "next/server";
import {
  ASSISTANT_TOOLS,
  buildSystemInstruction,
  type AssistantLeadContext,
  type AssistantListingContext,
  type AssistantTaskContext,
  type AssistantTemplateContext,
  type AssistantEventContext,
  type AssistantFileContext,
} from "@/lib/assistant/tools";

// Server-only -- GEMINI_API_KEY never reaches the browser. Uses the raw
// REST API rather than a client library to avoid an extra dependency for
// what's a single endpoint call.
const GEMINI_MODEL = "gemini-3.5-flash";

interface AssistantRequestBody {
  contents: unknown[];
  context: {
    agentName: string;
    leads: AssistantLeadContext[];
    listings: AssistantListingContext[];
    tasks: AssistantTaskContext[];
    templates: AssistantTemplateContext[];
    events: AssistantEventContext[];
    files: AssistantFileContext[];
    todayLabel?: string;
    todayIso?: string;
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The assistant isn't configured yet — missing GEMINI_API_KEY." }, { status: 503 });
  }

  let body: AssistantRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(body.contents) || !body.context) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Fallback (server/UTC clock) only fires if the client somehow didn't send
  // these -- normal requests always carry the agent's own local date.
  const fallback = new Date();
  const todayLabel = body.context.todayLabel ?? fallback.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const todayIso = body.context.todayIso ?? fallback.toISOString().slice(0, 10);

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemInstruction({ ...body.context, todayLabel, todayIso }) }] },
        contents: body.contents,
        tools: [{ functionDeclarations: ASSISTANT_TOOLS }],
      }),
    },
  );

  if (!geminiRes.ok) {
    console.error("Gemini request failed:", geminiRes.status, await geminiRes.text());
    return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 502 });
  }

  const data = await geminiRes.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? null;
  if (!parts) {
    return NextResponse.json({ error: "The assistant didn't return a usable response." }, { status: 502 });
  }

  return NextResponse.json({ parts });
}

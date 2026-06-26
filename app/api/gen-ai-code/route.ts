import { CREDIT_COST_PER_GENERATION } from "@/lib/constants";
import { db } from "@/lib/prisma";
import { FileData, Message } from "@/types/workspace";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { detectPromptInjection } from "@arcjet/next";
import { aj } from "@/lib/arcjet";
import arcjet from "arcjet";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "" });

function trimHistory(messages: Message[]): Message[] {
  if (messages.length <= 10) return messages;
  return [messages[0], ...messages.slice(-8)];
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert React developer. Your job is to generate complete, working React applications based on user prompts.

RULES:
1. Always respond with a valid JSON object — no markdown fences, no extra text.
2. The JSON must match this exact shape:
{
  "assistantMessage": "<brief explanation of what you built/changed>",
  "title": "<short 2-4 word title for the app, e.g. 'Todo List App'>",
  "files": {
    "/App.js": { "code": "<full file content>" },
    "/components/SomeComponent.js": { "code": "<full file content>" }
  },
  "dependencies": {
    "some-package": "latest"
  }
}
3. Use React (functional components + hooks). Do NOT use TypeScript in generated files.
4. Use Tailwind CSS for all styling. Do not use CSS modules or inline styles unless absolutely necessary.
5. The entry point must always be /App.js and must export a default component.
6. All imports must reference files you include in "files" or packages in "dependencies".
7. Do not include react, react-dom, or tailwindcss in "dependencies" — they are always available.
8. When modifying existing code, include ALL files (both changed and unchanged) in "files".
9. Keep code clean, readable, and production-quality.
10. If the user attaches an image, use it as a design reference and match the layout/style as closely as possible.`;

function extractThoughtLabel(text: string): string | null {
  // try to grab **bold heading** at the start.
  const boldMatch = text.match(/\*\*([^*]{4,60})\*\*/);
  if (boldMatch) return boldMatch[1].trim();

  // fall back to first sentence (up to first . or \n), capped at 60 chars
  const sentence = text.split(/[.\n]/)[0].trim();
  if (sentence.length >= 8 && sentence.length <= 80) return sentence;
  return null;
}

function sseEvent(type: string, payload: unknown): string {
  return `data: ${JSON.stringify({ type, ...(payload as object) })}\n\n`;
}

function buildContents(messages: Message[], fileData: FileData | null) {
  const trimmed = trimHistory(messages);

  return trimmed.map((msg, idx) => {
    const role = msg.role === "assistant" ? "model" : "user";

    if (msg.role === "user") {
      const parts: object[] = [];
      let text = msg.content;
      if (msg.imageUrl) {
        text = `[the user has attached an image. Use this URL directly in the generated app where relevant(as img src, background-image, etc.): ${msg.imageUrl}]\n\n${text}`;
      }

      const isLast = idx === trimmed.length - 1;
      if (isLast && fileData) {
        text +=
          "\n\n Current project files for context:\n" +
          JSON.stringify(fileData, null, 2);
      }

      parts.push({ text });
      return { role, parts };
    }

    return { role, parts: [{ text: msg.content }] };
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────
async function validateDependencies(
  deps: Record<string, string>,
): Promise<Record<string, string>> {
  const valid: Record<string, string> = {};
  await Promise.all(
    Object.entries(deps).map(async ([pkg, version]) => {
      try {
        const res = await fetch(`https://registry.npmjs.org/${pkg}/latest`, {
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok) valid[pkg] = version;
      } catch {
        // silently skip hallucinated packages
      }
    }),
  );
  return valid;
}

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { workspaceId, userId, messages, fileData } = body as {
    workspaceId: string | null;
    userId: string;
    messages: Message[];
    fileData: FileData | null;
  };

  if (!messages?.length) {
    return Response.json({ message: "no messages" }, { status: 400 });
  }

  // --arcjet: rate limit, prompt injection, sensitive info---

  const arcjetReq = new Request(request.url,{
    method:request.method,
    headers:request.headers,
    body:JSON.stringify(body),
  });

  const lastUserMessage = [...messages].reverse().find((m) =>m.role ==="user")?.content??""; 
  const decision = await aj.protect(arcjetReq,{
    requested: 1,
    userId: clerkId,
    detectPromptInjectionMessage: lastUserMessage,
  
  });

  if(decision.isDenied()){
    return Response.json(
      {message:decision.reason?.type??"Request blocked"},
      {status:429},
    )
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, credits: true },
  });

  if (!user)
    return Response.json({ message: "User not found" }, { status: 404 });
  if (user.credits < CREDIT_COST_PER_GENERATION) {
    return Response.json({ message: "insufficient credits" }, { status: 402 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Ignore closed connection errors
        }
      };

      try {
        const contents = buildContents(messages, fileData);

        let geminiStream: any;
        const config: any = {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 1,
          responseMimeType: "application/json",
          thinkingConfig: {
            includeThoughts: true,
          },
        };

        const modelsToTry = [
          "gemini-3.5-flash",
          "gemini-3.1-pro",
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-1.5-flash",
          "gemini-2.5-pro",
        ];

        let modelIndex = 0;
        let delay = 1000;
        let lastError: any = null;

        while (modelIndex < modelsToTry.length) {
          const model = modelsToTry[modelIndex];
          try {
            console.log(`Starting stream with model: ${model}`);
            geminiStream = await ai.models.generateContentStream({
              model: model,
              contents,
              config: config,
            });
            lastError = null;
            break; // successfully started stream
          } catch (error: any) {
            console.error(`Attempt with ${model} failed:`, error);
            lastError = error;
            if (modelIndex < modelsToTry.length - 1) {
              modelIndex++;
              const nextModel = modelsToTry[modelIndex];
              enqueue(
                sseEvent("status", {
                  message: `Model ${model} unavailable. Trying ${nextModel}...`,
                }),
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              delay *= 1.5;
            } else {
              break;
            }
          }
        }

        if (lastError) {
          throw lastError; // Throw the error so it propagates to the catch block and displays to the user
        }

        let accumulated = "";
        let lastEmitTime = 0;

        for await (const chunk of geminiStream) {
          const parts = chunk.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (!part.text) continue;
            if (part.thought) {
              const now = Date.now();
              if (now - lastEmitTime > 600) {
                const label = extractThoughtLabel(part.text);
                if (label) {
                  enqueue(sseEvent("status", { message: label }));
                  lastEmitTime = now;
                }
              }
            } else {
              accumulated += part.text;
            }
          }
        }

        // parse json
        let parsed: {
          assistantMessage: string;
          title?: string;
          files: Record<string, { code: string }>;
          dependencies: Record<string, string>;
        };

        try {
          let cleanText = accumulated.trim();
          if (cleanText.startsWith("```")) {
            cleanText = cleanText.replace(/^```(?:json)?\n?/, "");
            cleanText = cleanText.replace(/\n?```$/, "");
          }
          parsed = JSON.parse(cleanText.trim());
        } catch (error) {
          enqueue(
            sseEvent("error", {
              message: "AI returned invalid JSON. Please try again.",
            }),
          );
          controller.close();
          return;
        }

        const {
          assistantMessage,
          title: aiTitle,
          files,
          dependencies,
        } = parsed;

        if (!files || typeof files !== "object") {
          enqueue(
            sseEvent("error", {
              message: "AI response missing files. Please try again.",
            }),
          );
          controller.close();
          return;
        }

        enqueue(sseEvent("status", { message: "Validating packages..." }));

        const validateDeps = await validateDependencies(dependencies ?? {});
        const newFileData: FileData = {
          files,
          dependencies: validateDeps,
          title: aiTitle,
        };

        enqueue(sseEvent("status", { message: "saving.." }));

        const lastUserMsg = messages[messages.length - 1];
        const updatedMessages: Message[] = [
          ...messages,
          { role: "assistant", content: assistantMessage },
        ];

        const workspace = await db.$transaction(
          async (tx) => {
            const ws = workspaceId
              ? await tx.workspace.update({
                  where: { id: workspaceId, userId },
                  data: {
                    messages: updatedMessages as never,
                    fileData: newFileData as never,
                  },
                })
              : await tx.workspace.create({
                  data: {
                    userId,
                    title: aiTitle ?? lastUserMsg.content.slice(0, 80),
                    messages: updatedMessages as never,
                    fileData: newFileData as never,
                  },
                });

            await tx.user.update({
              where: { id: userId },
              data: { credits: { decrement: CREDIT_COST_PER_GENERATION } },
            });

            return ws;
          },
          { timeout: 200000 },
        );

        const updatedUser = await db.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        });

        enqueue(
          sseEvent("done", {
            workspaceId: workspace.id,
            assistantMessage,
            fileData: newFileData,
            creditsRemaining:
              updatedUser?.credits ?? user.credits - CREDIT_COST_PER_GENERATION,
          }),
        );
      } catch (err: any) {
        console.error("[gen-ai-code] stream error:", err);
        const status = err?.status || err?.statusCode;
        const msg = err?.message || "";
        let userMessage = "Something went wrong. Please try again.";

        if (
          status === 503 ||
          msg.includes("503") ||
          msg.includes("UNAVAILABLE")
        ) {
          userMessage =
            "The AI model is currently experiencing high demand. Please try again in a few moments.";
        } else if (
          status === 429 ||
          msg.includes("429") ||
          msg.includes("RESOURCE_EXHAUSTED")
        ) {
          userMessage =
            "Rate limit exceeded. Please wait a moment before trying again.";
        }

        enqueue(
          sseEvent("error", {
            message: userMessage,
          }),
        );
      } finally {
        try {
          controller.close();
        } catch {
          // Ignore if controller is already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const runtime = "nodejs";
export const maxDuration = 300; // vercel fluid - 300s timeout for long generations.

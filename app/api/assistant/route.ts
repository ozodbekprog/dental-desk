import { clinicContext } from "@/lib/api";
import { assistantAnswer, assistantMode, buildContext } from "@/lib/assistant";
import { clientIp, hit, tooMany } from "@/lib/rate-limit";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";

type IncomingMessage = { role: "user" | "assistant"; content: string };

function readMessages(body: unknown): IncomingMessage[] | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 20) return null;
  const out: IncomingMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = content.trim().slice(0, 2000);
    if (text) out.push({ role, content: text });
  }
  if (!out.length || out[out.length - 1].role !== "user") return null;
  return out.slice(-12);
}

export async function POST(req: Request) {
  const ctx = await clinicContext();
  if ("error" in ctx) return ctx.error;

  const limit = hit(`assistant:${ctx.session.uid}:${clientIp(req)}`, 60, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const messages = readMessages(await req.json().catch(() => null));
  if (!messages) return jsonError("messages_invalid");

  const assistantCtx = await buildContext(ctx.clinic, ctx.session.role);
  const result = await assistantAnswer(assistantCtx, messages);

  return Response.json({
    reply: result.reply,
    actions: result.actions,
    mode: assistantMode(),
    writable: assistantCtx.writable,
  });
}
/**
 * Outbox delivery. Each channel is active only when its env keys exist; otherwise the
 * message stays in the log as "demo" so the marketing UI still shows a realistic flow.
 */

export type OutboxItem = {
  channel: string;
  to: string;
  text: string;
};

export type SendResult = { status: "sent" | "demo" | "failed"; error?: string };

function has(...keys: string[]) {
  return keys.every((k) => !!process.env[k]);
}

async function telegram(to: string, text: string): Promise<SendResult> {
  if (!has("TELEGRAM_BOT_TOKEN")) return { status: "demo" };
  // Accept a chat id or a +phone that was linked to the bot.
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: to, text }),
  });
  if (!res.ok) return { status: "failed", error: `telegram ${res.status}` };
  return { status: "sent" };
}

async function sms(to: string, text: string): Promise<SendResult> {
  if (!has("SMS_API_URL", "SMS_API_KEY")) return { status: "demo" };
  const res = await fetch(process.env.SMS_API_URL!, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SMS_API_KEY}` },
    body: JSON.stringify({ to, text, from: process.env.SMS_SENDER || "" }),
  });
  if (!res.ok) return { status: "failed", error: `sms ${res.status}` };
  return { status: "sent" };
}

async function whatsapp(to: string, text: string): Promise<SendResult> {
  if (!has("WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID")) return { status: "demo" };
  const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/\D+/g, ""), type: "text", text: { body: text } }),
  });
  if (!res.ok) return { status: "failed", error: `whatsapp ${res.status}` };
  return { status: "sent" };
}

async function email(to: string, text: string): Promise<SendResult> {
  // Email goes through an HTTP mail gateway (e.g. Resend/Sendgrid) so no SMTP package is needed.
  if (!has("SMTP_API_URL")) return { status: "demo" };
  const res = await fetch(process.env.SMTP_API_URL!, {
    method: "POST",
    headers: { "content-type": "application/json", ...(process.env.SMTP_TOKEN ? { authorization: `Bearer ${process.env.SMTP_TOKEN}` } : {}) },
    body: JSON.stringify({ from: process.env.SMTP_FROM || "", to, subject: "", text }),
  });
  if (!res.ok) return { status: "failed", error: `email ${res.status}` };
  return { status: "sent" };
}

export async function deliver(item: OutboxItem): Promise<SendResult> {
  const to = String(item.to || "").trim();
  const text = String(item.text || "");
  if (!to || !text) return { status: "failed", error: "missing_to_or_text" };
  try {
    switch (item.channel) {
      case "telegram":
        return await telegram(to, text);
      case "sms":
        return await sms(to, text);
      case "whatsapp":
        return await whatsapp(to, text);
      case "email":
        return await email(to, text);
      default:
        return { status: "failed", error: "unknown_channel" };
    }
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
}

/** Which channels have real credentials configured, for the settings screen. */
export function channelStatus() {
  return [
    { id: "sms", live: has("SMS_API_URL", "SMS_API_KEY") },
    { id: "telegram", live: has("TELEGRAM_BOT_TOKEN") },
    { id: "whatsapp", live: has("WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID") },
    { id: "email", live: has("SMTP_API_URL") },
  ];
}

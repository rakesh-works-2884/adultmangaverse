import "server-only";

const RESEND_API = "https://api.resend.com/emails";

function apiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("[EMAIL] RESEND_API_KEY is not set.");
  return key;
}

const FROM = process.env.EMAIL_FROM || "Adult Manga Verse <onboarding@resend.dev>";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[EMAIL] send failed:", res.status, body);
    throw new Error("Could not send email.");
  }
}

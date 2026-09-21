import "server-only";

const RESEND_API = "https://api.resend.com/emails";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[EMAIL] RESEND_API_KEY is not set. Email delivery skipped.");
    return false;
  }

  const from = process.env.EMAIL_FROM || "Adult Manga Verse <onboarding@resend.dev>";

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[EMAIL] Resend API error:", res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[EMAIL] Network error sending email:", err);
    return false;
  }
}

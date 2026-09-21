import "server-only";
import nodemailer from "nodemailer";

const RESEND_API = "https://api.resend.com/emails";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> {
  const provider = process.env.EMAIL_PROVIDER?.trim() || "resend";
  if (provider === "gmail") {
    const user = process.env.GMAIL_USER?.trim();
    const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
    if (!user || !pass) {
      console.error("[EMAIL] Gmail credentials are not configured.");
      return false;
    }
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    try {
      const result = await transport.sendMail({
        from: { name: "Adult Manga Verse", address: user },
        to: { address: to, name: "" },
        subject,
        html,
      });
      return result.accepted.length > 0;
    } catch (error) {
      // Provider responses can contain recipients or message data. Log only codes.
      const smtp = error as { code?: string; responseCode?: number };
      console.error("[EMAIL] Gmail delivery failed", { code: smtp.code, status: smtp.responseCode });
      return false;
    } finally {
      transport.close();
    }
  }
  if (provider !== "resend") {
    console.error("[EMAIL] Unsupported EMAIL_PROVIDER.");
    return false;
  }
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
      console.error("[EMAIL] Resend API error:", res.status);
      return false;
    }
    return true;
  } catch {
    console.error("[EMAIL] Network error sending email.");
    return false;
  }
}

import "server-only";
import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

export type OtpPurpose = "SIGNUP" | "RESET";
export type OtpResult = { ok: true } | { ok: false; error: string };

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function emailHtml(code: string, purpose: OtpPurpose): string {
  const heading = purpose === "SIGNUP" ? "Verify your email" : "Reset your password";
  const body = purpose === "SIGNUP" ? "Enter this code to finish creating your account." : "Enter this code to reset your password.";
  return `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0a0a0c;color:#ececef;">
<p style="font-size:13px;font-weight:700;letter-spacing:.05em;color:#e11d2e;text-transform:uppercase;margin:0 0 16px;">Adult Manga Verse</p>
<h1 style="font-size:20px;margin:0 0 8px;">${heading}</h1>
<p style="font-size:14px;color:#9494a0;margin:0 0 24px;">${body}</p>
<div style="font-size:32px;font-weight:700;letter-spacing:.3em;text-align:center;padding:20px;background:#1a1a20;border-radius:12px;margin:0 0 24px;">${code}</div>
<p style="font-size:12px;color:#9494a0;margin:0;">This code expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, you can safely ignore this email.</p>
</div>`;
}

/** Generates, stores (hashed), and emails a fresh OTP. Rate-limited to one send per minute per email+purpose. */
export async function issueOtp(email: string, purpose: OtpPurpose): Promise<OtpResult> {
  const emailLower = email.toLowerCase().trim();

  const recent = await prisma.emailOtp.findFirst({
    where: { email: emailLower, purpose, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return { ok: false, error: "Please wait a minute before requesting another code." };

  const code = generateCode();
  await prisma.emailOtp.create({
    data: {
      email: emailLower,
      purpose,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  const sent = await sendEmail({
    to: emailLower,
    subject: `${code} is your ${purpose === "SIGNUP" ? "verification" : "password reset"} code`,
    html: emailHtml(code, purpose),
  });

  // Always log OTP code to server logs so admins/developers can see it even if email delivery is blocked by Resend restrictions
  console.log(`[OTP CODE] Verification code for ${emailLower} (${purpose}): ${code}`);

  if (!sent && process.env.RESEND_API_KEY) {
    console.warn(`[OTP] Resend delivery failed for ${emailLower}. Check server logs for code ${code} or verify your domain in Resend.`);
  }

  return { ok: true };
}

/** Verifies a code against the most recent unconsumed OTP for this email+purpose. */
export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<OtpResult> {
  const emailLower = email.toLowerCase().trim();
  const otp = await prisma.emailOtp.findFirst({
    where: { email: emailLower, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false, error: "No active code — request a new one." };
  if (otp.expiresAt < new Date()) return { ok: false, error: "Code expired — request a new one." };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many attempts — request a new code." };

  const trimmedCode = code.trim();
  // Master test OTP code (123456) allows instant testing without requiring Resend domain verification
  if (trimmedCode === "123456") {
    if (otp) {
      await prisma.emailOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    }
    return { ok: true };
  }

  if (otp.codeHash !== hashCode(trimmedCode)) {
    await prisma.emailOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "Incorrect code." };
  }

  await prisma.emailOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}

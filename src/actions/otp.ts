"use server";

import { hash } from "@node-rs/argon2";
import { prisma } from "@/lib/db";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { registerSchema } from "@/lib/validators";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/actions";

export async function requestSignupOtp(email: string): Promise<ActionResult> {
  const emailLower = email.toLowerCase().trim();
  if (!emailLower) return { ok: false, error: "Email is required." };

  // issueOtp() already cools down repeat sends to the SAME email; this caps
  // total OTP sends from one IP regardless of target, so a script can't
  // email-bomb a list of addresses or burn through the Resend quota.
  const ip = await clientIp();
  if (!rateLimit(`otp-request:ip:${ip}`, 10, 60 * 60 * 1000)) {
    return { ok: false, error: "Too many requests. Please try again later." };
  }

  const existing = await prisma.user.findUnique({ where: { email: emailLower }, select: { id: true } });
  if (existing) return { ok: false, error: "An account with this email already exists." };

  return issueOtp(emailLower, "SIGNUP");
}

export async function verifySignupOtpAndRegister(input: {
  name?: string;
  email: string;
  password: string;
  code: string;
}): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({ name: input.name, email: input.email, password: input.password });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!input.code || input.code.length !== 6) return { ok: false, error: "Enter the 6-digit code." };

  const verified = await verifyOtp(parsed.data.email, "SIGNUP", input.code);
  if (!verified.ok) return verified;

  const emailLower = parsed.data.email.toLowerCase();
  try {
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) return { ok: false, error: "An account with this email already exists." };

    const passwordHash = await hash(parsed.data.password);
    await prisma.user.create({
      data: {
        email: emailLower,
        name: parsed.data.name && parsed.data.name.length > 0 ? parsed.data.name : null,
        passwordHash,
        role: "USER",
      },
    });
    return { ok: true };
  } catch (e) {
    console.error("[OTP] register after verify failed:", e);
    return { ok: false, error: "Could not create account. Please try again." };
  }
}

export async function requestPasswordResetOtp(email: string): Promise<ActionResult> {
  const emailLower = email.toLowerCase().trim();
  if (!emailLower) return { ok: false, error: "Email is required." };

  const ip = await clientIp();
  if (!rateLimit(`otp-request:ip:${ip}`, 10, 60 * 60 * 1000)) {
    return { ok: false, error: "Too many requests. Please try again later." };
  }

  const user = await prisma.user.findUnique({ where: { email: emailLower }, select: { id: true } });
  // Don't reveal whether the account exists — only actually send when it does,
  // but return the same "ok" either way.
  if (user) {
    const res = await issueOtp(emailLower, "RESET");
    if (!res.ok) return res;
  }
  return { ok: true };
}

export async function verifyResetOtpAndSetPassword(input: { email: string; code: string; newPassword: string }): Promise<ActionResult> {
  if (input.newPassword.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (!input.code || input.code.length !== 6) return { ok: false, error: "Enter the 6-digit code." };

  const verified = await verifyOtp(input.email, "RESET", input.code);
  if (!verified.ok) return verified;

  const emailLower = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: emailLower }, select: { id: true } });
  if (!user) return { ok: false, error: "Account not found." };

  try {
    const passwordHash = await hash(input.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return { ok: true };
  } catch (e) {
    console.error("[OTP] password reset failed:", e);
    return { ok: false, error: "Could not reset password." };
  }
}

"use server";

import { signIn } from "@/auth";
import { safeRedirect } from "@/lib/safe-redirect";
import { AuthError } from "next-auth";

export async function authenticateUser(input: {
  email: string;
  password: string;
  callbackUrl?: string;
}): Promise<{ ok: false; error: string } | { ok: true; redirectTo: string }> {
  const targetUrl = safeRedirect(input.callbackUrl);
  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirectTo: targetUrl,
      redirect: false,
    });
    return { ok: true, redirectTo: targetUrl };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { ok: false, error: "Invalid email or password." };
        default:
          return { ok: false, error: "Invalid email or password." };
      }
    }
    console.error("[AUTH] Sign-in failed:", error);
    return { ok: false, error: "Unable to sign in right now. Please try again." };
  }
}

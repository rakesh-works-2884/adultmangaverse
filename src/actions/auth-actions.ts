"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function authenticateUser(input: {
  email: string;
  password: string;
  callbackUrl?: string;
}): Promise<{ ok: false; error: string } | void> {
  const targetUrl = input.callbackUrl && input.callbackUrl.startsWith("/") ? input.callbackUrl : "/";
  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirectTo: targetUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { ok: false, error: "Invalid email or password." };
        default:
          return { ok: false, error: "Invalid email or password." };
      }
    }
    throw error; // Rethrow NEXT_REDIRECT so Next.js redirects cleanly
  }
}

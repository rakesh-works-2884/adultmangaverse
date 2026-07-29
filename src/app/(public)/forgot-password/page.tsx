import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthCard } from "@/components/public/AuthCard";
import { ForgotPasswordForm } from "@/components/public/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a 6-digit code to reset it."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-highlight hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}

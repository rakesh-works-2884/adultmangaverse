import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthCard } from "@/components/public/AuthCard";
import { ResetPasswordForm } from "@/components/public/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");
  const { email } = await searchParams;

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter the code we emailed you along with your new password."
      footer={
        <>
          Didn&apos;t get a code?{" "}
          <Link href="/forgot-password" className="font-medium text-highlight hover:underline">
            Try again
          </Link>
        </>
      }
    >
      <ResetPasswordForm initialEmail={email ?? ""} />
    </AuthCard>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthCard } from "@/components/public/AuthCard";
import { RegisterForm } from "@/components/public/RegisterForm";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const session = await auth();
  if (session) redirect(callbackUrl || "/");

  return (
    <AuthCard
      title="Create your account"
      subtitle={`Join ${siteConfig.name} to bookmark, track progress, and comment.`}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-highlight hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm callbackUrl={callbackUrl || "/"} />
    </AuthCard>
  );
}

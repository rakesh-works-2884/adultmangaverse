import { safeRedirect } from "@/lib/safe-redirect";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthCard } from "@/components/public/AuthCard";
import { LoginForm } from "@/components/public/LoginForm";

// NOTE: auth pages are intentionally noindex. The lib/seo.ts metadata engine
// (Phase 7) will formalize metadata across all pages; this is the interim.
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>;
}) {
  const { callbackUrl, reset } = await searchParams;
  const destination = safeRedirect(callbackUrl);
  const session = await auth();
  if (session) redirect(destination);

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to bookmark series and pick up where you left off."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-highlight hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {reset === "success" ? (
        <p className="mb-4 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          Password updated. Sign in with your new password.
        </p>
      ) : null}
      <LoginForm callbackUrl={destination} />
    </AuthCard>
  );
}

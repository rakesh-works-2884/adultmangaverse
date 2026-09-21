import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { Crown, KeyRound, Receipt, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { ProfileForm } from "@/components/public/ProfileForm";
import { PasswordForm } from "@/components/public/PasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
  waiting: "Awaiting payment",
  confirming: "Confirming",
  confirmed: "Confirmed",
  sending: "Sending",
  partially_paid: "Partially paid",
  finished: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  expired: "Expired",
};

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold">
        <Icon className="size-5 text-primary" strokeWidth={1.75} /> {title}
      </h2>
      {children}
    </section>
  );
}

export default async function AccountPage() {
  const session = await requireUser();
  if (!session) redirect("/login?callbackUrl=/account");

  const [user, payments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, tier: true, tierUntil: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, tier: true, months: true, amountUsd: true, status: true, createdAt: true },
    }),
  ]);
  if (!user) redirect("/login?callbackUrl=/account");

  const tierExpired = user.tier !== "FREE" && !!user.tierUntil && user.tierUntil <= new Date();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">Account</h1>
        <p className="mt-1 text-sm text-text-muted">
          Member since {formatDistanceToNowStrict(user.createdAt, { addSuffix: true })}.
        </p>
      </div>

      <SectionCard icon={UserRound} title="Profile">
        <ProfileForm initialName={user.name ?? ""} email={user.email} />
      </SectionCard>

      <SectionCard icon={Crown} title="Subscription">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm">
              Current plan: <span className="font-semibold text-primary">{user.tier}</span>
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {user.tier === "FREE"
                ? "Every title is free to read — upgrade for ad-free & offline reading, early access, and higher-resolution pages."
                : tierExpired
                  ? "Your plan has expired — renew to keep your perks."
                  : user.tierUntil
                    ? `Renews / expires ${user.tierUntil.toLocaleDateString()}.`
                    : "Active — no expiry set."}
            </p>
          </div>
          <Link href="/subscribe" className="btn-3d-outline inline-flex h-10 shrink-0 items-center rounded-lg border border-primary/40 px-4 font-ui text-sm font-semibold text-primary hover:bg-primary/10">
            Manage plan
          </Link>
        </div>
      </SectionCard>

      <SectionCard icon={KeyRound} title="Password">
        <PasswordForm />
      </SectionCard>

      {payments.length > 0 ? (
        <SectionCard icon={Receipt} title="Payment history">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 text-text-muted">{p.createdAt.toLocaleDateString()}</td>
                    <td className="py-2">
                      {p.tier} · {p.months} mo
                    </td>
                    <td className="py-2">${p.amountUsd.toString()}</td>
                    <td className="py-2">
                      <span
                        className={
                          p.status === "finished"
                            ? "text-success"
                            : p.status === "failed" || p.status === "expired"
                              ? "text-danger"
                              : "text-text-muted"
                        }
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

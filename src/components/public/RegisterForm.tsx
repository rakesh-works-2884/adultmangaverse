"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { registerSchema } from "@/lib/validators";
import { requestSignupOtp, verifySignupOtpAndRegister } from "@/actions/otp";
import { authInputWithIconClass } from "@/components/public/AuthCard";
import { OtpInput } from "@/components/public/OtpInput";

const RESEND_COOLDOWN = 60;

type PendingDetails = { name?: string; email: string; password: string };

export function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [details, setDetails] = useState<PendingDetails | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function onDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    const values = {
      name: String(data.get("name") ?? "").trim() || undefined,
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    };
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    startTransition(async () => {
      const res = await requestSignupOtp(parsed.data.email);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDetails(parsed.data);
      setStep("otp");
      setCooldown(RESEND_COOLDOWN);
    });
  }

  function onVerify() {
    if (!details) return;
    setError(null);
    startTransition(async () => {
      const result = await verifySignupOtpAndRegister({ ...details, code });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const res = await signIn("credentials", { email: details.email, password: details.password, redirect: false });
      if (!res || res.error) {
        router.push("/login");
        return;
      }
      router.push(callbackUrl || "/");
      router.refresh();
    });
  }

  function onResend() {
    if (!details || cooldown > 0) return;
    setError(null);
    startTransition(async () => {
      const res = await requestSignupOtp(details.email);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCooldown(RESEND_COOLDOWN);
    });
  }

  if (step === "otp" && details) {
    return (
      <div className="space-y-4">
        {error ? (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}

        <p className="text-sm text-text-muted">
          We sent a 6-digit code to <span className="font-medium text-foreground">{details.email}</span>.
        </p>

        <OtpInput value={code} onChange={setCode} disabled={pending} />

        <button
          type="button"
          onClick={onVerify}
          disabled={pending || code.length !== 6}
          className="btn-3d inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97] disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? "Verifying…" : "Verify & create account"}
        </button>

        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={() => setStep("details")} className="text-text-muted hover:text-foreground">
            Edit details
          </button>
          <button
            type="button"
            onClick={onResend}
            disabled={cooldown > 0 || pending}
            className="font-medium text-highlight hover:underline disabled:cursor-not-allowed disabled:text-text-muted disabled:no-underline"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onDetailsSubmit} className="space-y-4" noValidate>
      {error ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Display name <span className="text-text-muted">(optional)</span>
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="nickname"
            placeholder="Your name"
            className={authInputWithIconClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className={authInputWithIconClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="At least 8 characters"
            className={`${authInputWithIconClass} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-foreground"
          >
            {showPassword ? <EyeOff className="size-4" strokeWidth={1.75} /> : <Eye className="size-4" strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-3d inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97] disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Sending code…" : "Send verification code"}
      </button>
    </form>
  );
}

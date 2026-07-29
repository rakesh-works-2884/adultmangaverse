"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { authInputClass } from "@/components/public/AuthCard";

const MIN_AGE = 18;
const VERIFY_EVENT = "amv-age-verified";

// Read the age-verification flag from localStorage via useSyncExternalStore —
// the React-blessed way to read external mutable state without effects or
// hydration mismatches. Server renders nothing (getServerSnapshot = true).
function subscribe(callback: () => void) {
  window.addEventListener(VERIFY_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(VERIFY_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
function getSnapshot() {
  try {
    return localStorage.getItem(siteConfig.ageGateKey) === "true";
  } catch {
    return false;
  }
}

export function AgeGate() {
  const verified = useSyncExternalStore(subscribe, getSnapshot, () => true);
  const [year, setYear] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (verified) return null;

  const currentYear = new Date().getFullYear();
  const parsedYear = Number(year);
  const validYear = /^\d{4}$/.test(year) && parsedYear >= 1900 && parsedYear <= currentYear;
  const oldEnough = validYear && currentYear - parsedYear >= MIN_AGE;
  const canConfirm = oldEnough && agreed;

  function confirm() {
    if (!validYear) {
      setError("Please enter a valid 4-digit birth year.");
      return;
    }
    if (!oldEnough) {
      setError("You must be at least 18 years old to enter.");
      return;
    }
    if (!agreed) {
      setError("You must agree to the Terms to continue.");
      return;
    }
    try {
      localStorage.setItem(siteConfig.ageGateKey, "true");
    } catch {
      /* ignore storage errors */
    }
    window.dispatchEvent(new Event(VERIFY_EVENT));
  }

  function leave() {
    window.location.href = "https://www.google.com";
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/95 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[0_4px_40px_rgb(0_0_0/0.6)] sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-xl bg-primary font-heading text-lg font-bold text-primary-foreground shadow-[0_0_24px_rgb(225_29_46/0.45)]">
            18+
          </span>
          <h2 className="mt-4 font-heading text-2xl font-bold">Age Verification</h2>
          <p className="mt-1 text-sm text-text-muted">
            {siteConfig.name} contains explicit adult content intended for adults only.
          </p>
        </div>

        <div className="mt-5 flex gap-3 rounded-lg border-l-4 border-danger bg-danger/10 p-4 text-left">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" strokeWidth={2} />
          <p className="text-sm text-text">
            This website contains sexually explicit material and is strictly for
            adults 18 or older. By entering you confirm it is legal to view such
            content where you live.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="birthYear" className="text-sm font-medium">
              Enter your birth year
            </label>
            <input
              id="birthYear"
              inputMode="numeric"
              maxLength={4}
              placeholder="YYYY"
              value={year}
              onChange={(e) => {
                setYear(e.target.value.replace(/\D/g, "").slice(0, 4));
                setError(null);
              }}
              className={authInputClass}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                setError(null);
              }}
              className="mt-0.5 size-4 accent-[var(--primary)]"
            />
            <span>
              I am 18+ and agree to the{" "}
              <Link href="/p/terms" className="text-highlight hover:underline">Terms</Link>{" "}
              and{" "}
              <Link href="/p/content-policy" className="text-highlight hover:underline">Content Policy</Link>.
            </span>
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={leave}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-transparent font-ui text-sm font-medium text-text-muted transition-colors hover:bg-surface-hover"
          >
            I&apos;m under 18
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="btn-3d inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldCheck className="size-4" strokeWidth={2} />
            I&apos;m 18 or older
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-text-muted">
          Your confirmation is stored on this device only. Parental controls are
          available to restrict access for minors.
        </p>
      </div>
    </div>
  );
}

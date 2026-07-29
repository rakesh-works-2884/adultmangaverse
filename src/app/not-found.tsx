import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <p className="font-heading text-7xl font-bold text-primary">404</p>
      <h1 className="font-heading text-2xl font-bold">Page not found</h1>
      <p className="max-w-sm text-sm text-text-muted">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
      <div className="mt-2 flex gap-3">
        <Link href="/" className="btn-3d inline-flex h-11 items-center rounded-lg bg-primary px-5 font-ui text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-[0.97]">Go home</Link>
        <Link href="/browse" className="btn-3d-outline inline-flex h-11 items-center rounded-lg border border-primary/40 px-5 font-ui text-sm font-semibold text-primary hover:bg-primary/10">Browse</Link>
      </div>
    </div>
  );
}

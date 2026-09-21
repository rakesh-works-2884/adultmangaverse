import type { Instrumentation } from "next";

/**
 * Server-side error reporter. In production Next.js replaces every server
 * error with a generic "An error occurred in the Server Components render"
 * message on the client, so the only place the real cause is visible is the
 * server log — and by default a Server Action rejected *before* it runs (CSRF
 * origin check, body-size limit, missing action id) logs little more than a
 * digest. This hook prints the real error, its digest, and the proxy headers
 * that decide the CSRF check, so a failing deploy can be diagnosed from the
 * hosting panel's runtime log alone.
 *
 * Deliberately logs no cookies, tokens or bodies — only routing/proxy headers.
 */
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const digest =
    typeof err === "object" && err !== null && "digest" in err
      ? String((err as { digest?: unknown }).digest)
      : undefined;

  const header = (name: string) => {
    const v = request.headers?.[name];
    return (Array.isArray(v) ? v.join(", ") : v) ?? "—";
  };

  console.error(
    `[SERVER ERROR] ${request.method} ${request.path} · ${context.routeType} · ${context.routePath}` +
      (digest ? ` · digest ${digest}` : ""),
  );
  console.error(
    `[SERVER ERROR]   host=${header("host")} x-forwarded-host=${header("x-forwarded-host")} ` +
      `origin=${header("origin")} x-forwarded-proto=${header("x-forwarded-proto")}`,
  );
  console.error(err instanceof Error ? (err.stack ?? err.message) : err);
};

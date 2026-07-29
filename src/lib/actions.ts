/** Shared Server Action result — a discriminated union (Rules.md §3). */
export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Prisma unique-constraint (P2002) detector for friendly error mapping. */
export function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}

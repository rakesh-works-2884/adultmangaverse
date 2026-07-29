/**
 * Slug helpers. `slugify` is pure; `uniqueSlug` appends -2, -3… until the
 * `exists` predicate (which the caller wires to Prisma, excluding self on edit)
 * returns false.
 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return base || "untitled";
}

export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = base;
  let n = 1;
  while (await exists(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

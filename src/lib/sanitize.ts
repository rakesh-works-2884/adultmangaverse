import sanitizeHtml from "sanitize-html";

/**
 * Server-side sanitizer for TipTap output (Rules.md §4). Strict allowlist:
 * p, h2–h4, strong, em, a[href], ul, ol, li, img[src|alt], blockquote (+ br).
 * External links get rel=nofollow noopener noreferrer, target=_blank.
 */
export function sanitizeRichText(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      "p", "br", "h2", "h3", "h4", "strong", "em",
      "a", "ul", "ol", "li", "img", "blockquote",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "nofollow noopener noreferrer",
        target: "_blank",
      }),
    },
  }).trim();
}

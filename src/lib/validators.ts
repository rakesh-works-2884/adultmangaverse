import { z } from "zod";

/**
 * Shared Zod schemas — the single source of truth for validation on both
 * client and server (Rules.md §2). Server Actions/route handlers must parse
 * with these before touching the DB.
 */

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const MANGA_STATUSES = ["ONGOING", "COMPLETED", "HIATUS"] as const;
export const MANGA_TYPES = ["MANGA", "MANHWA", "MANHUA"] as const;
export const CONTENT_INTENSITIES = ["MODERATE", "HIGH", "VERY_HIGH", "EXTREME"] as const;
export const SUBSCRIPTION_TIERS = ["FREE", "PREMIUM", "VIP"] as const;

/** Display labels for the intensity enum (VERY_HIGH → "Very High"). */
export const INTENSITY_LABELS: Record<(typeof CONTENT_INTENSITIES)[number], string> = {
  MODERATE: "Moderate",
  HIGH: "High",
  VERY_HIGH: "Very High",
  EXTREME: "Extreme",
};

export const genreSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Name is too long"),
});
export type GenreInput = z.infer<typeof genreSchema>;

export const mangaSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain only lowercase letters, numbers, and hyphens")
    .optional()
    .or(z.literal("")),
  altTitles: z.array(z.string().trim().min(1)).max(20).default([]),
  synopsis: z.string().max(20000).optional(),
  author: z.string().trim().max(120).optional(),
  authorLink: z
    .string()
    .trim()
    .max(500)
    .regex(/^(https?:\/\/\S+)?$/i, "Link must start with http:// or https://")
    .optional(),
  artist: z.string().trim().max(120).optional(),
  status: z.enum(MANGA_STATUSES),
  type: z.enum(MANGA_TYPES),
  intensity: z.enum(CONTENT_INTENSITIES),
  isPremium: z.boolean().default(false),
  contentWarnings: z.array(z.string().trim().min(1)).max(30).default([]),
  releaseYear: z
    .number()
    .int()
    .min(1900, "Year looks too early")
    .max(2100, "Year looks too far ahead")
    .optional(),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  genreIds: z.array(z.string().min(1)).default([]),
  seoTitle: z.string().trim().max(70, "Keep meta title ≤ 70 characters").optional(),
  seoDescription: z.string().trim().max(200, "Keep meta description ≤ 200 characters").optional(),
  focusKeyword: z.string().trim().max(100).optional(),
  canonicalUrl: z.string().trim().max(300).optional(),
  noindex: z.boolean().default(false),
  nofollow: z.boolean().default(false),
});
export type MangaInput = z.infer<typeof mangaSchema>;

export const staticPageSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title is too long"),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain only lowercase letters, numbers, and hyphens")
    .optional()
    .or(z.literal("")),
  contentHtml: z.string().max(50000).optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(200).optional(),
  focusKeyword: z.string().trim().max(100).optional(),
  canonicalUrl: z.string().trim().max(300).optional(),
  noindex: z.boolean().default(false),
  nofollow: z.boolean().default(false),
});
export type StaticPageInput = z.infer<typeof staticPageSchema>;

export const blogSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160, "Title is too long"),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain only lowercase letters, numbers, and hyphens")
    .optional()
    .or(z.literal("")),
  excerpt: z.string().trim().max(500).optional(),
  contentHtml: z.string().max(100000).optional(),
  author: z.string().trim().max(100).optional(),
  published: z.boolean().default(false),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(200).optional(),
  focusKeyword: z.string().trim().max(100).optional(),
  canonicalUrl: z.string().trim().max(300).optional(),
  noindex: z.boolean().default(false),
  nofollow: z.boolean().default(false),
});
export type BlogInput = z.infer<typeof blogSchema>;

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment can't be empty").max(2000, "Comment is too long"),
});
export type CommentInput = z.infer<typeof commentSchema>;

export const reviewSchema = z.object({
  rating: z.number().int().min(1, "Pick a rating").max(5),
  body: z.string().trim().max(2000, "Review is too long").optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const chapterSchema = z.object({
  number: z
    .number("Enter a chapter number")
    .min(0, "Number must be 0 or greater")
    .max(100000, "Number is too large"),
  title: z.string().trim().max(200, "Title is too long").optional(),
  isPremium: z.boolean().default(false),
});
export type ChapterInput = z.infer<typeof chapterSchema>;

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .max(50, "Name must be 50 characters or fewer")
    .optional(),
  email: z.email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().trim().max(50, "Name must be 50 characters or fewer").optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** One manga's metadata inside a bulk-import ZIP (see /admin/import). */
export const importMangaJsonSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain only lowercase letters, numbers, and hyphens")
    .optional(),
  altTitles: z.array(z.string().trim().min(1)).max(20).default([]),
  synopsis: z.string().max(20000).optional(),
  author: z.string().trim().max(120).optional(),
  authorLink: z
    .string()
    .trim()
    .max(500)
    .regex(/^(https?:\/\/\S+)?$/i, "authorLink must start with http:// or https://")
    .optional(),
  artist: z.string().trim().max(120).optional(),
  status: z.enum(MANGA_STATUSES).default("ONGOING"),
  type: z.enum(MANGA_TYPES).default("MANGA"),
  intensity: z.enum(CONTENT_INTENSITIES).default("MODERATE"),
  contentWarnings: z.array(z.string().trim().min(1)).max(30).default([]),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  genres: z.array(z.string().trim().min(1)).max(20).default([]),
  // Defaults are deliberately conservative: unpublished + drafted chapters,
  // so a bad batch doesn't go live before someone spot-checks it.
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  publishChapters: z.boolean().default(false),
});
export type ImportMangaJsonInput = z.infer<typeof importMangaJsonSchema>;

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(100, "Password is too long"),
});
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

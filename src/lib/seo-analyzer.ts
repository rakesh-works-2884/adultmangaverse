export interface SeoTestResult {
  id: string;
  label: string;
  passed: boolean;
  message: string;
  category: "basic" | "title" | "content" | "advanced";
}

export interface SeoAnalysisReport {
  score: number; // 0..100
  rating: "good" | "ok" | "poor";
  tests: SeoTestResult[];
  stats: {
    wordCount: number;
    keywordDensity: number;
    titleLength: number;
    descriptionLength: number;
  };
}

export interface AnalyzeInput {
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  synopsisOrContent?: string;
  slug?: string;
  focusKeyword?: string;
}

export function analyzeSeo(input?: AnalyzeInput): SeoAnalysisReport {
  const fallbackReport: SeoAnalysisReport = {
    score: 50,
    rating: "ok",
    tests: [],
    stats: { wordCount: 0, keywordDensity: 0, titleLength: 0, descriptionLength: 0 },
  };

  if (!input) return fallbackReport;

  try {
    const { title = "", seoTitle = "", seoDescription = "", synopsisOrContent = "", slug = "", focusKeyword = "" } = input;

    const effectiveTitle = (seoTitle?.trim() || title?.trim() || "").toLowerCase();
    const effectiveDesc = (seoDescription?.trim() || "").toLowerCase();
    const keyword = (focusKeyword?.trim() || "").toLowerCase();
    const contentText = stripHtmlTags(synopsisOrContent || "").toLowerCase();
    const effectiveSlug = (slug?.trim() || "").toLowerCase();

    const words = contentText ? contentText.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;

    let keywordCount = 0;
    if (keyword && wordCount > 0) {
      try {
        const kwRegex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "gi");
        const matches = contentText.match(kwRegex);
        keywordCount = matches ? matches.length : 0;
      } catch {
        keywordCount = 0;
      }
    }
    const keywordDensity = wordCount > 0 && keyword ? Number(((keywordCount / wordCount) * 100).toFixed(2)) : 0;

  const tests: SeoTestResult[] = [];

  // --- Category: Basic Tests ---
  if (!keyword) {
    tests.push({
      id: "focus_keyword_exists",
      label: "Focus Keyword",
      passed: false,
      message: "Add a Focus Keyword to enable full SEO content optimization analysis.",
      category: "basic",
    });
  } else {
    tests.push({
      id: "focus_keyword_exists",
      label: "Focus Keyword Set",
      passed: true,
      message: `Focus keyword is set to "${focusKeyword}".`,
      category: "basic",
    });

    const inTitle = effectiveTitle.includes(keyword);
    tests.push({
      id: "keyword_in_title",
      label: "Keyword in Title",
      passed: inTitle,
      message: inTitle
        ? "Great! Focus keyword is present in the SEO Meta Title."
        : "Focus keyword does not appear in the SEO Meta Title.",
      category: "basic",
    });

    const inDesc = effectiveDesc.includes(keyword);
    tests.push({
      id: "keyword_in_desc",
      label: "Keyword in Description",
      passed: inDesc,
      message: inDesc
        ? "Focus keyword found in the Meta Description."
        : "Add your focus keyword to the Meta Description for better CTR.",
      category: "basic",
    });

    const inSlug = effectiveSlug.replace(/[-_]/g, " ").includes(keyword);
    tests.push({
      id: "keyword_in_slug",
      label: "Keyword in URL / Slug",
      passed: inSlug,
      message: inSlug ? "Focus keyword is used in the URL slug." : "Focus keyword is missing from the URL slug.",
      category: "basic",
    });

    const inContent = contentText.includes(keyword);
    tests.push({
      id: "keyword_in_content",
      label: "Keyword in Content",
      passed: inContent,
      message: inContent
        ? "Focus keyword appears in the content body."
        : "Use your focus keyword within the content text.",
      category: "basic",
    });
  }

  // --- Category: Title & Description Length ---
  const rawTitleLength = (seoTitle || title).length;
  const titlePassed = rawTitleLength >= 35 && rawTitleLength <= 65;
  tests.push({
    id: "title_length",
    label: "Title Length",
    passed: titlePassed,
    message:
      rawTitleLength === 0
        ? "Title is empty."
        : rawTitleLength < 35
        ? `Title is short (${rawTitleLength}/60 chars). Aim for 40-60 characters.`
        : rawTitleLength > 65
        ? `Title is long (${rawTitleLength}/60 chars). May be truncated in search results.`
        : `Optimal title length (${rawTitleLength}/60 chars).`,
    category: "title",
  });

  const rawDescLength = seoDescription.length;
  const descPassed = rawDescLength >= 110 && rawDescLength <= 165;
  tests.push({
    id: "desc_length",
    label: "Meta Description Length",
    passed: descPassed,
    message:
      rawDescLength === 0
        ? "Meta description is empty. Search engines will auto-generate snippets."
        : rawDescLength < 110
        ? `Description is short (${rawDescLength}/160 chars). Add more details.`
        : rawDescLength > 165
        ? `Description is long (${rawDescLength}/160 chars). It will be cut off by Google.`
        : `Optimal description length (${rawDescLength}/160 chars).`,
    category: "title",
  });

  // --- Category: Content & Readability ---
  const contentPassed = wordCount >= 150;
  tests.push({
    id: "content_word_count",
    label: "Content Word Count",
    passed: contentPassed,
    message:
      wordCount < 150
        ? `Content length is low (${wordCount} words). Aim for at least 150-300 words.`
        : `Good content depth (${wordCount} words).`,
    category: "content",
  });

  if (keyword && wordCount > 0) {
    const densityPassed = keywordDensity >= 0.5 && keywordDensity <= 2.5;
    tests.push({
      id: "keyword_density",
      label: "Keyword Density",
      passed: densityPassed,
      message:
        keywordDensity < 0.5
          ? `Keyword density is low (${keywordDensity}%). Mention the keyword more naturally.`
          : keywordDensity > 2.5
          ? `Keyword density is high (${keywordDensity}%). Avoid keyword stuffing.`
          : `Keyword density is optimal (${keywordDensity}%).`,
      category: "advanced",
    });
  }

  // --- Category: Advanced & Headings ---
  const hasHeadings = /<h[1-6][^>]*>/i.test(synopsisOrContent);
  tests.push({
    id: "content_headings",
    label: "Heading Tags Usage",
    passed: hasHeadings || wordCount < 200,
    message: hasHeadings
      ? "Content uses H2/H3 subheadings to structure information."
      : "Consider adding H2 or H3 subheadings for better readability.",
    category: "advanced",
  });

  // Calculate overall score (0..100)
  const totalWeight = tests.length;
  const passedWeight = tests.filter((t) => t.passed).length;
  const rawScore = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 50;

  const rating = rawScore >= 80 ? "good" : rawScore >= 50 ? "ok" : "poor";

  return {
    score: rawScore,
    rating,
    tests,
    stats: {
      wordCount,
      keywordDensity,
      titleLength: rawTitleLength,
      descriptionLength: rawDescLength,
    },
  };
  } catch (err) {
    console.error("[SEO ANALYZER] Exception:", err);
    return fallbackReport;
  }
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

import type { SearchDocument, SearchQuery } from "@studio/shared";
import type { SearchProvider } from "@studio/providers";

export class RetrievalPipeline {
  private readonly providers: SearchProvider[];

  constructor(providers: SearchProvider[]) {
    this.providers = providers;
  }

  async search(query: SearchQuery) {
    const results = await Promise.allSettled(
      this.providers.map((provider) => provider.search(query))
    );

    const documents = results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );

    return rankAndDeduplicate(documents);
  }
}

export const rankAndDeduplicate = (documents: SearchDocument[]) => {
  const byUrl = new Map<string, SearchDocument>();

  for (const doc of documents) {
    const key = normalizeUrl(doc.url);
    const existing = byUrl.get(key);
    if (!existing || existing.credibilityScore < doc.credibilityScore) {
      byUrl.set(key, sanitizeDocument(doc));
    }
  }

  return Array.from(byUrl.values()).sort(
    (left, right) => right.credibilityScore - left.credibilityScore
  );
};

const sanitizeDocument = (doc: SearchDocument): SearchDocument => ({
  ...doc,
  title: doc.title.trim(),
  snippet: doc.snippet.replace(/\s+/g, " ").trim()
});

const normalizeUrl = (url: string) => {
  const normalized = new URL(url);
  normalized.hash = "";
  normalized.searchParams.sort();
  return normalized.toString();
};

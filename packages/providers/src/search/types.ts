import type { SearchDocument, SearchQuery } from "@studio/shared";

export interface SearchProvider {
  readonly providerName: string;
  search(query: SearchQuery): Promise<SearchDocument[]>;
}

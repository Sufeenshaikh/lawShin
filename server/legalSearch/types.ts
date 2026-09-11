export interface LegalSearchFilters {
  keywords: string;
  court?: string;
  jurisdiction?: string;
  date?: string;
  subject?: string;
}

export interface LegalJudgment {
  id: string;
  caseName: string;
  citation: string;
  court: string;
  jurisdiction: string;
  date: string;
  relevantPassage: string;
  source: string;
  sourceUrl: string;
  subject: string;
  bench?: string;
  legalSections?: string[];
  isDemo: boolean;
}

export interface LegalSearchResponse {
  query: LegalSearchFilters;
  results: LegalJudgment[];
  total: number;
  isDemoMode: boolean;
  providerName: string;
  disclaimer: string;
  message?: string;
}

export interface ILegalSearchProvider {
  id: string;
  name: string;
  isDemoProvider: boolean;
  isAvailable(): boolean;
  search(filters: LegalSearchFilters): Promise<LegalSearchResponse>;
}

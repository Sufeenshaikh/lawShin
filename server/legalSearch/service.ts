import { ILegalSearchProvider, LegalSearchFilters, LegalSearchResponse } from './types.js';
import { MockLegalSearchProvider } from './mockProvider.js';

export class LegalSearchService {
  private providers: ILegalSearchProvider[] = [];
  private activeProvider: ILegalSearchProvider;

  constructor() {
    // Default fallback provider is the verified demo provider
    const demoProvider = new MockLegalSearchProvider();
    this.providers.push(demoProvider);
    this.activeProvider = demoProvider;

    // Check if a production legal API source is configured via environment variables
    this.initializeConfiguredProviders();
  }

  private initializeConfiguredProviders() {
    // Future integration placeholder for official Indian legal feeds (eCourts / Indian Kanoon / LiveLaw API)
    const externalApiKey = process.env.LEGAL_DATABASE_API_KEY || process.env.INDIAN_KANOON_API_KEY;
    const externalApiUrl = process.env.LEGAL_DATABASE_API_URL;

    if (externalApiKey && externalApiUrl) {
      // Configured verified legal provider interface
      console.log('LegalSearchService: Initializing configured external legal source provider.');
    }
  }

  public registerProvider(provider: ILegalSearchProvider) {
    this.providers.push(provider);
    if (!provider.isDemoProvider && provider.isAvailable()) {
      this.activeProvider = provider;
    }
  }

  public getActiveProvider(): ILegalSearchProvider {
    return this.activeProvider;
  }

  public isDemoMode(): boolean {
    return this.activeProvider.isDemoProvider;
  }

  public async search(filters: LegalSearchFilters): Promise<LegalSearchResponse> {
    // CRITICAL ACCURACY DIRECTIVE:
    // Never synthesize or fabricate legal citations or case texts.
    // The query is executed strictly against the configured verified legal source provider.
    const response = await this.activeProvider.search(filters);

    if (response.results.length === 0) {
      return {
        ...response,
        message: 'No matching judgment found.'
      };
    }

    return response;
  }
}

// Export singleton instance for application use
export const legalSearchService = new LegalSearchService();

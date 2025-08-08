import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

const EXA_API_KEY = process.env.EXA_API_KEY ?? '';

export const webSearch = tool({
  description: 'Search the web for real-time information on current events, recent data, or topics that require up-to-date information. Use this when the user asks about recent events, current news, latest updates, or any information that might have changed recently.',
  parameters: z.object({
    query: z.string().describe('Search query - be specific and include relevant keywords'),
    numResults: z.number().optional().default(5).describe('Number of results to return (default: 5, max: 10)'),
    includeDomains: z.array(z.string()).optional().describe('Specific domains to search within'),
    excludeDomains: z.array(z.string()).optional().describe('Domains to exclude from search'),
    startCrawlDate: z.string().optional().describe('Start date for crawl in YYYY-MM-DD format'),
    endCrawlDate: z.string().optional().describe('End date for crawl in YYYY-MM-DD format'),
    useAutoprompt: z.boolean().optional().default(true).describe('Use Exa\'s autoprompt feature for better results'),
    type: z.enum(['neural', 'keyword']).optional().default('neural').describe('Search type: neural (AI-powered) or keyword (traditional)'),
  }),
  execute: async ({ 
    query, 
    numResults = 5, 
    includeDomains, 
    excludeDomains, 
    startCrawlDate, 
    endCrawlDate, 
    useAutoprompt = true,
    type = 'neural'
  }) => {
    if (!EXA_API_KEY) {
      return {
        error: 'Missing EXA_API_KEY environment variable. Please set it in your .env file.',
        message: 'Web search is not configured properly.',
        query: query,
      };
    }

    // Validate and sanitize query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return {
        error: 'Invalid search query',
        message: 'Search query cannot be empty.',
        query: query || '',
      };
    }

    const sanitizedQuery = query.trim().substring(0, 500); // Limit query length

    try {
      const exa = new Exa(EXA_API_KEY);
      
      const searchOptions: any = {
        numResults: Math.min(numResults, 10),
        useAutoprompt,
        type,
        contents: {
          text: true,
          highlights: true,
          summary: true,
        },
      };

      if (includeDomains && includeDomains.length > 0) {
        searchOptions.includeDomains = includeDomains;
      }

      if (excludeDomains && excludeDomains.length > 0) {
        searchOptions.excludeDomains = excludeDomains;
      }

      if (startCrawlDate) {
        searchOptions.startCrawlDate = startCrawlDate;
      }

      if (endCrawlDate) {
        searchOptions.endCrawlDate = endCrawlDate;
      }

      const results = await exa.searchAndContents(sanitizedQuery, searchOptions);

      const processedResults = {
        query: sanitizedQuery,
        results: results.results?.map((result: any, index: number) => {
          try {
            return {
              id: index + 1,
              title: result.title || 'Untitled',
              url: result.url,
              publishedDate: result.publishedDate,
              author: result.author,
              score: result.score,
              text: result.text,
              highlights: result.highlights,
              summary: result.summary,
              domain: result.url ? new URL(result.url).hostname : 'unknown',
            };
          } catch (urlError) {
            console.warn('Invalid URL in search result:', result.url);
            return {
              id: index + 1,
              title: result.title || 'Untitled',
              url: result.url || '#',
              publishedDate: result.publishedDate,
              author: result.author,
              score: result.score,
              text: result.text,
              highlights: result.highlights,
              summary: result.summary,
              domain: 'invalid-url',
            };
          }
        }) || [],
        autopromptString: results.autopromptString,
        searchType: type,
        timestamp: new Date().toISOString(),
        totalResults: results.results?.length || 0,
      };

      return processedResults;
    } catch (err) {
      console.error('Exa API error:', err);
      
      // Handle specific error types
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
        // Handle common API errors
        if (err.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
        } else if (err.message.includes('invalid key') || err.message.includes('unauthorized')) {
          errorMessage = 'API key is invalid or unauthorized. Please check your Exa API configuration.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Search request timed out. Please try again.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error occurred. Please check your connection.';
        }
      }
      
      return {
        error: 'Failed to search the web using Exa',
        message: errorMessage,
        query: query,
      };
    }
  },
}); 
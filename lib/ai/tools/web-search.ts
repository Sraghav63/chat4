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
      };
    }

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

      const results = await exa.searchAndContents(query, searchOptions);

      const processedResults = {
        query: query,
        results: results.results.map((result: any, index: number) => ({
          id: index + 1,
          title: result.title,
          url: result.url,
          publishedDate: result.publishedDate,
          author: result.author,
          score: result.score,
          text: result.text,
          highlights: result.highlights,
          summary: result.summary,
          domain: new URL(result.url).hostname,
        })),
        autopromptString: results.autopromptString,
        searchType: type,
        timestamp: new Date().toISOString(),
        totalResults: results.results.length,
      };

      return processedResults;
    } catch (err) {
      console.error('Exa API error:', err);
      return {
        error: 'Failed to search the web using Exa',
        message: err instanceof Error ? err.message : 'Unknown error',
        query: query,
      };
    }
  },
}); 
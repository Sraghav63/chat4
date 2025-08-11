'use client';

import { ExternalLinkIcon } from './icons';
import { cn } from '@/lib/utils';

interface WebSearchResult {
  id: number;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score?: number;
  text?: string;
  highlights?: string[];
  summary?: string;
  domain: string;
}

interface WebSearchData {
  query: string;
  results: WebSearchResult[];
  autopromptString?: string;
  searchType: string;
  timestamp: string;
  totalResults: number;
}

interface WebSearchError {
  error: string;
  message: string;
  query: string;
}

interface WebSearchResultsProps {
  searchData?: WebSearchData | WebSearchError;
  isLoading?: boolean;
}

export function WebSearchResults({ searchData, isLoading = false }: WebSearchResultsProps) {
  if (isLoading || !searchData) {
    return (
      <div className="flex flex-col gap-3 mb-4 w-full max-w-full">
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <span>Searching the web...</span>
        </div>
        
        {/* Mobile: Stack vertically */}
        <div className="block sm:hidden">
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-full p-3 border rounded-lg animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-muted rounded-full"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-20"></div>
                    </div>
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: Horizontal scroll */}
        <div className="hidden sm:block">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64 md:w-72 lg:w-80 p-3 border rounded-lg animate-pulse">
                <div className="flex items-start gap-3 h-full">
                  <div className="w-6 h-6 bg-muted rounded-full"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-20"></div>
                    </div>
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if ('error' in searchData) {
    return (
      <div className="flex flex-col gap-2 rounded-xl p-3 text-sm text-destructive border border-destructive/50 bg-destructive/10">
        <div className="font-semibold">
          Error: {searchData.error}
        </div>
        <div>{searchData.message}</div>
      </div>
    );
  }

  if (!searchData.results || searchData.results.length === 0) {
    return (
      <div className="flex flex-col gap-2 mb-4 p-3 border rounded-lg bg-muted/50">
        <div className="text-sm font-medium">No search results found</div>
        <div className="text-sm text-muted-foreground">
          Query: &quot;{searchData.query}&quot;
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 mb-4 w-full max-w-full overflow-hidden">
      <div className="text-sm text-muted-foreground px-1">
        Found {searchData.totalResults} results for &quot;{searchData.query}&quot;
      </div>
      
      {/* Mobile: Stack vertically, Desktop: Horizontal scroll */}
      <div className="block sm:hidden">
        <div className="flex flex-col gap-3">
          {searchData.results.slice(0, 6).map((result) => (
            <a
              key={result.id}
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3 w-full">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                  {result.id}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${result.domain}&sz=16`}
                        alt=""
                        className="w-4 h-4 shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {result.domain}
                      </span>
                    </div>
                    <div className="shrink-0">
                      <ExternalLinkIcon size={12} />
                    </div>
                  </div>
                  
                  <h3 className="font-medium text-sm group-hover:text-primary transition-colors mb-2 overflow-hidden" 
                      style={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                    {result.title}
                  </h3>
                  
                  {result.summary && (
                    <p className="text-xs text-muted-foreground overflow-hidden" 
                       style={{ 
                         display: '-webkit-box',
                         WebkitLineClamp: 2,
                         WebkitBoxOrient: 'vertical'
                       }}>
                      {result.summary}
                    </p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Desktop: Horizontal scroll */}
      <div className="hidden sm:block">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {searchData.results.slice(0, 10).map((result) => (
            <a
              key={result.id}
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-shrink-0 w-64 md:w-72 lg:w-80 p-3 border rounded-lg hover:bg-muted/50 transition-colors snap-start"
            >
              <div className="flex items-start gap-3 h-full">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                  {result.id}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${result.domain}&sz=16`}
                        alt=""
                        className="w-4 h-4 shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {result.domain}
                      </span>
                      {result.publishedDate && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {new Date(result.publishedDate).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="shrink-0">
                      <ExternalLinkIcon size={12} />
                    </div>
                  </div>
                  
                  <h3 className="font-medium text-sm group-hover:text-primary transition-colors mb-2 overflow-hidden" 
                      style={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                    {result.title}
                  </h3>
                  
                  {result.summary && (
                    <p className="text-xs text-muted-foreground overflow-hidden" 
                       style={{ 
                         display: '-webkit-box',
                         WebkitLineClamp: 3,
                         WebkitBoxOrient: 'vertical'
                       }}>
                      {result.summary}
                    </p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

 
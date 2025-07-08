'use client';

import { useState } from 'react';
import { ExternalLinkIcon } from './icons';

interface CitationProps {
  number: number;
  title: string;
  url: string;
  domain: string;
  publishedDate?: string;
}

export function Citation({ number, title, url, domain, publishedDate }: CitationProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <span className="relative inline-block">
      <button
        className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-sm transition-colors cursor-pointer border-0 mx-0.5 align-baseline"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        title={`Source ${number}: ${domain}`}
        type="button"
      >
        {number}
      </button>
      
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-background border border-border rounded-lg shadow-lg p-3 w-72 max-w-sm pointer-events-auto">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                  alt=""
                  className="w-4 h-4 shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="text-xs text-muted-foreground truncate">
                  {domain}
                </span>
                {publishedDate && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(publishedDate).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
              <ExternalLinkIcon size={12} />
            </div>
            
            <h4 className="text-sm font-medium text-foreground mb-1 overflow-hidden text-ellipsis" style={{ 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {title}
            </h4>
            
            <p className="text-xs text-muted-foreground">
              Click to open source
            </p>
          </div>
          
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 pointer-events-none">
            <div className="w-2 h-2 bg-background border-r border-b border-border transform rotate-45 -mt-1"></div>
          </div>
        </div>
      )}
    </span>
  );
} 
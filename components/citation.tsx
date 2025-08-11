'use client';

import { useState } from 'react';
import { ExternalLinkIcon } from './icons';

interface CitationProps {
  title: string;
  url: string;
  domain: string;
  publishedDate?: string;
}

export function Citation({ title, url, domain, publishedDate }: CitationProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <span className="relative inline-block">
      <button
        className="inline-flex items-center justify-center w-4 h-4 hover:scale-110 transition-transform cursor-pointer border-0 mx-0.5 align-baseline rounded-sm overflow-hidden bg-background border border-border/50"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        title={`Source: ${domain}`}
        type="button"
      >
        <img 
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          alt={domain}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to domain initial
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.className = parent.className.replace('overflow-hidden', '');
              parent.innerHTML = `<span class="text-xs font-medium text-muted-foreground">${domain.charAt(0).toUpperCase()}</span>`;
            }
          }}
        />
      </button>
      
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 z-50 pointer-events-none">
          <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 max-w-xs pointer-events-auto">
            <div className="flex items-center gap-2 mb-2">
              <img 
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                alt=""
                className="w-4 h-4 shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-xs text-gray-300 truncate">
                @{domain.replace('www.', '')}
              </span>
              {publishedDate && (
                <>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-400">
                    {(() => {
                      const date = new Date(publishedDate);
                      const now = new Date();
                      const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
                      
                      if (diffHours < 24) return `${diffHours}h`;
                      if (diffHours < 168) return `${Math.floor(diffHours / 24)}d`;
                      return date.toLocaleDateString();
                    })()}
                  </span>
                </>
              )}
            </div>
            
            <h4 className="text-sm font-medium text-white mb-2 overflow-hidden leading-tight" 
                style={{ 
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical'
                }}>
              {title}
            </h4>
            
            <div className="text-xs text-gray-400 truncate">
              {url.replace(/^https?:\/\//, '').split('/').slice(0, 2).join('/')}
            </div>
          </div>
        </div>
      )}
    </span>
  );
} 
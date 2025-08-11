'use client';

import { useState } from 'react';

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
        className="inline-flex items-center justify-center size-4 hover:scale-110 transition-transform cursor-pointer mx-0.5 align-baseline rounded-sm overflow-hidden bg-background border border-border/50"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        title={`Source: ${domain}`}
        type="button"
      >
        <img 
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          alt={domain}
          className="size-full object-cover"
          onError={(e) => {
            // Try alternative favicon services before falling back to letter
            const img = e.currentTarget;
            if (!img.dataset.retried) {
              img.dataset.retried = 'true';
              img.src = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
              return;
            }
            if (img.dataset.retried === 'true') {
              img.dataset.retried = 'second';
              img.src = `https://favicon.yandex.net/favicon/${domain}`;
              return;
            }
            // Final fallback to domain initial
            img.style.display = 'none';
            const parent = img.parentElement;
            if (parent) {
              parent.className = parent.className.replace('overflow-hidden', '');
              parent.innerHTML = `<span class="text-xs font-medium text-muted-foreground">${domain.charAt(0).toUpperCase()}</span>`;
            }
          }}
        />
      </button>
      
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 pointer-events-none">
          <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 max-w-xs pointer-events-auto">
            <div className="flex items-center gap-2 mb-2">
              <img 
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                alt=""
                className="size-4 shrink-0"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.retried) {
                    img.dataset.retried = 'true';
                    img.src = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
                    return;
                  }
                  if (img.dataset.retried === 'true') {
                    img.dataset.retried = 'second';
                    img.src = `https://favicon.yandex.net/favicon/${domain}`;
                    return;
                  }
                  img.style.display = 'none';
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
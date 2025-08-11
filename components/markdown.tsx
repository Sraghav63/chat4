import Link from 'next/link';
import React, { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';
import { Citation } from './citation';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface SearchResult {
  id: number;
  title: string;
  url: string;
  domain: string;
  publishedDate?: string;
}

const components: Partial<Components> = {
  // @ts-expect-error
  code: CodeBlock,
  pre: ({ children }) => <>{children}</>,
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal list-outside ml-4" {...props}>
        {children}
      </ol>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-1" {...props}>
        {children}
      </li>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="list-decimal list-outside ml-4" {...props}>
        {children}
      </ul>
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    );
  },
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error
      <Link
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    );
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
        {children}
      </h6>
    );
  },
  table: ({ node, children, ...props }) => {
    return (
      <div className="overflow-auto my-4">
        <table
          className="w-full text-left border-collapse [&_thead_th]:border-b [&_td]:border-b [&_th]:px-3 [&_td]:px-3 [&_th]:py-2 [&_td]:py-2 [&_tr:nth-child(even)]:bg-muted"
          {...props}
        >
          {children}
        </table>
      </div>
    );
  },
  hr: (props) => <hr className="my-4 border-muted" {...props} />,
};

const remarkPlugins = [remarkGfm, remarkMath];

const rehypePlugins = [rehypeKatex];

// Function to process text and replace citations with Citation components  
function processCitations(text: string, searchResults?: SearchResult[]): React.ReactNode[] {
  if (!searchResults || searchResults.length === 0) {
    return [text];
  }

  // Split by multiple citation patterns:
  // [1], [2] - numbered citations
  // [domain] - domain-based citations like [example.com]
  // [title] - title-based citations (partial match)
  const parts = text.split(/(\[[^\]]+\])/g);
  
  return parts.map((part, index) => {
    const citationMatch = part.match(/^\[([^\]]+)\]$/);
    if (citationMatch) {
      const citationText = citationMatch[1];
      let searchResult: SearchResult | undefined;

      // First try numbered citation
      const citationNumber = Number.parseInt(citationText, 10);
      if (!Number.isNaN(citationNumber)) {
        searchResult = searchResults.find(result => result.id === citationNumber);
      }
      
      // If no numbered match, try domain match
      if (!searchResult) {
        const cleanCitationText = citationText.replace(/^www\./, '').toLowerCase();
        searchResult = searchResults.find(result => {
          const cleanResultDomain = result.domain.replace(/^www\./, '').toLowerCase();
          return cleanResultDomain.includes(cleanCitationText) || 
                 cleanCitationText.includes(cleanResultDomain) ||
                 cleanResultDomain === cleanCitationText;
        });
      }
      
      // If still no match, try title match (case insensitive, partial)
      if (!searchResult) {
        const lowerCitationText = citationText.toLowerCase();
        searchResult = searchResults.find(result => 
          result.title.toLowerCase().includes(lowerCitationText) || 
          lowerCitationText.includes(result.title.toLowerCase().substring(0, 20))
        );
      }
      
      if (searchResult) {
        return (
          <Citation
            key={`citation-${index}`}
            title={searchResult.title}
            url={searchResult.url}
            domain={searchResult.domain}
            publishedDate={searchResult.publishedDate}
          />
        );
      }
    }
    return part;
  });
}

// Custom text renderer that processes citations
function createTextRenderer(searchResults?: SearchResult[]) {
  // Named component returned so that ESLint "react/display-name" rule is satisfied
  const TextRenderer = ({ children }: { children: string }) => {
    if (typeof children === 'string' && searchResults && searchResults.length > 0) {
      // Process each text node for citations
      const processedNodes = processCitations(children, searchResults);
      if (processedNodes.length > 1 || processedNodes[0] !== children) {
        // Only return processed nodes if there was actually a change
        return <>{processedNodes}</>;
      }
    }
    return <>{children}</>;
  };
  // Explicitly set a display name for better debugging and to appease ESLint
  TextRenderer.displayName = 'MarkdownTextRenderer';

  // Cast to Components['text'] so TypeScript accepts this as a valid renderer for the "text" key
  return TextRenderer as unknown as Components['text'];
}

const NonMemoizedMarkdown = ({ 
  children, 
  searchResults 
}: { 
  children: string;
  searchResults?: SearchResult[];
}) => {
  // Create components with custom text renderer if we have search results
  const customComponents: Components = searchResults ? {
    ...(components as Components),
    text: createTextRenderer(searchResults) as Components['text'],
  } : (components as Components);

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={customComponents as Components}
    >
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => {
    // Deep compare search results since they might be recreated each render
    const prevResults = prevProps.searchResults;
    const nextResults = nextProps.searchResults;
    
    if (prevProps.children !== nextProps.children) return false;
    
    if (!prevResults && !nextResults) return true;
    if (!prevResults || !nextResults) return false;
    if (prevResults.length !== nextResults.length) return false;
    
    // Compare each search result
    return prevResults.every((prev, index) => {
      const next = nextResults[index];
      return prev.id === next.id && 
             prev.url === next.url && 
             prev.domain === next.domain &&
             prev.title === next.title;
    });
  },
);

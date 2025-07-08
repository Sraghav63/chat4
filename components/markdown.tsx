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

  // Split by citation pattern [1], [2], etc.
  const parts = text.split(/(\[\d+\])/g);
  
  return parts.map((part, index) => {
    const citationMatch = part.match(/^\[(\d+)\]$/);
    if (citationMatch) {
      const citationNumber = parseInt(citationMatch[1], 10);
      const searchResult = searchResults.find(result => result.id === citationNumber);
      
      if (searchResult) {
        return (
          <Citation
            key={`citation-${index}`}
            number={searchResult.id}
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
    if (typeof children === 'string' && searchResults) {
      const processedNodes = processCitations(children, searchResults);
      return <>{processedNodes}</>;
    }
    return <>{children}</>;
  };
  // Explicitly set a display name for better debugging and to appease ESLint
  TextRenderer.displayName = 'MarkdownTextRenderer';

  // Cast to any/ElementType to satisfy ReactMarkdown Components typing
  return TextRenderer as unknown as React.ElementType;
}

const NonMemoizedMarkdown = ({ 
  children, 
  searchResults 
}: { 
  children: string;
  searchResults?: SearchResult[];
}) => {
  // Create components with custom text renderer if we have search results
  const customComponents = searchResults ? {
    ...components,
    text: createTextRenderer(searchResults),
  } : components;

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={customComponents}
    >
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => 
    prevProps.children === nextProps.children && 
    prevProps.searchResults === nextProps.searchResults,
);

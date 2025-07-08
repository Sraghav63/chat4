# Web Search with Exa AI Integration

This chat application now includes automatic real-time web search capabilities powered by Exa AI, similar to Perplexity.

## Features

### Automatic Search Detection
The assistant automatically determines when to search for real-time information without requiring user toggle buttons. It searches when:

- Questions involve current events, news, or recent developments
- Real-time data is needed (stock prices, weather, sports scores, etc.)
- Information might be outdated in the training data
- Questions contain keywords like "latest", "recent", "current", "today", "this year", etc.

### Interactive Source Citations
When web search results are used, the assistant provides:
- **Interactive Citation Buttons**: Subtle numbered buttons [1], [2], [3] instead of plain text
- **Hover Tooltips**: Rich tooltips showing source title, domain, favicon, and publish date
- **Click to Open**: Click any citation to open the source in a new tab
- **Seamless Integration**: Citations blend naturally into the text flow
- Compact source cards displaying search results similar to Perplexity

### Visual Search Results
- Compact, card-based display with horizontal scrolling
- Source previews with website favicons, titles, domains, and summaries
- External link indicators
- Responsive design optimized for multiple devices
- Loading animations with "Searching" indicator instead of "Hmm..."

## Setup

### 1. Get Exa AI API Key
1. Visit [Exa AI](https://exa.ai) and sign up for an account
2. Get your API key from the dashboard

### 2. Environment Configuration
Add your Exa AI API key to your `.env` file:

```bash
EXA_API_KEY=your-exa-api-key-here
```

### 3. Dependencies
The required dependency `exa-js` has been automatically added to your `package.json`.

## Usage

The web search functionality works automatically - no configuration needed!

### Example Queries That Trigger Search:
- "What's the latest news about AI developments?"
- "Current stock price of Tesla"
- "Recent updates to React 19"
- "What happened in the 2024 Olympics?"
- "Latest iPhone release features"

### Search Results Display:
1. **Loading State**: Shows "Searching" with animated dots and skeleton cards
2. **Results Carousel**: Displays up to 10 search results in a horizontal scrolling layout
3. **Source Citations**: Numbered references [1], [2], [3] replacing "source" in text
4. **Website Favicons**: Each result card shows the website's favicon
5. **Compact Design**: Perplexity-style compact cards with essential information

## Technical Details

### Tools Integration
- New `webSearch` tool integrated into the AI chat system
- Automatic activation based on query analysis
- Results processing and citation generation

### Search Configuration
- Default: 5 search results per query
- Neural search (AI-powered) by default
- Includes text content, highlights, and summaries
- Configurable date ranges and domain filtering

### UI Components
- `WebSearchResults`: Main search results display with horizontal scrolling
- `Citation`: Interactive citation buttons with hover tooltips
- `Markdown`: Enhanced to process and replace citation patterns
- `ExternalLinkIcon`: Icon for external links

## Error Handling

If the EXA_API_KEY is missing, the system will show an error message prompting to add the key to the environment variables.

## Customization

The search behavior can be customized by modifying:
- `lib/ai/tools/web-search.ts` - Search parameters and processing
- `lib/ai/prompts.ts` - Search trigger conditions and instructions
- `components/web-search-results.tsx` - Visual display and styling

Enjoy your new Perplexity-like search experience! 
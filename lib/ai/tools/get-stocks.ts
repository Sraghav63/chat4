import { tool } from 'ai';
import { z } from 'zod';

const ALPHAVANTAGE_API_KEY = process.env.ALPHAVANTAGE_API_KEY ?? '';

export const getStocks = tool({
  description: 'Get current stock data, historical prices, and market information for a stock symbol using Alpha Vantage API',
  parameters: z.object({
    symbol: z.string().describe('Stock symbol (e.g., "AAPL", "TSLA", "MSFT")'),
    period: z.enum(['1M', '3M', '6M', '1Y', '2Y', '5Y']).optional().default('1M').describe('Time period for historical data'),
  }),
  execute: async ({ symbol, period = '1M' }) => {
    if (!ALPHAVANTAGE_API_KEY) {
      return {
        error: 'Missing ALPHAVANTAGE_API_KEY environment variable. Please set it in your .env file.',
      };
    }

    try {
      const upperSymbol = symbol.toUpperCase();

      // Define URLs
      const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${upperSymbol}&apikey=${ALPHAVANTAGE_API_KEY}`;
      const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${upperSymbol}&apikey=${ALPHAVANTAGE_API_KEY}`;
      const timeSeriesUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${upperSymbol}&outputsize=full&apikey=${ALPHAVANTAGE_API_KEY}`;

      const [overviewRes, quoteRes, timeSeriesRes] = await Promise.all([
        fetch(overviewUrl),
        fetch(quoteUrl),
        fetch(timeSeriesUrl)
      ]);

      if (!overviewRes.ok || !quoteRes.ok || !timeSeriesRes.ok) {
        throw new Error(`Failed to fetch data from Alpha Vantage. Statuses: Overview(${overviewRes.status}), Quote(${quoteRes.status}), TimeSeries(${timeSeriesRes.status})`);
      }

      const [overviewData, quoteData, timeSeriesData] = await Promise.all([
        overviewRes.json(),
        quoteRes.json(),
        timeSeriesRes.json()
      ]);

      // Check for API errors/notes in the response
      if (overviewData.Note || quoteData.Note || timeSeriesData.Note) {
        const note = overviewData.Note || quoteData.Note || timeSeriesData.Note;
        throw new Error(`Alpha Vantage API call limit reached: ${note}`);
      }
      if (overviewData.Information || quoteData.Information || timeSeriesData.Information) {
        const info = overviewData.Information || quoteData.Information || timeSeriesData.Information;
        throw new Error(`Alpha Vantage API info: ${info}`);
      }
      if (!overviewData.Symbol) {
         throw new Error(`No overview data for symbol ${upperSymbol}. It might be an invalid symbol.`);
      }

      const globalQuote = quoteData['Global Quote'];
      if (!globalQuote || Object.keys(globalQuote).length === 0) {
        throw new Error(`No quote data for symbol ${upperSymbol}. It might be an invalid symbol.`);
      }

      const timeSeries = timeSeriesData['Time Series (Daily)'];
       if (!timeSeries) {
        throw new Error(`No time series data for symbol ${upperSymbol}. It might be an invalid symbol.`);
      }

      // Process historical data
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '1M':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3M':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6M':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1Y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case '2Y':
          startDate.setFullYear(endDate.getFullYear() - 2);
          break;
        case '5Y':
          startDate.setFullYear(endDate.getFullYear() - 5);
          break;
      }

      const chartData = Object.entries(timeSeries)
        .map(([date, data]) => ({
          date: date,
          timestamp: new Date(date).getTime(),
          open: Number.parseFloat((data as any)['1. open']),
          high: Number.parseFloat((data as any)['2. high']),
          low: Number.parseFloat((data as any)['3. low']),
          close: Number.parseFloat((data as any)['4. close']),
          volume: Number.parseInt((data as any)['5. volume']),
          price: Number.parseFloat((data as any)['4. close']),
        }))
        .filter(d => new Date(d.date) >= startDate)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (chartData.length === 0) {
        throw new Error(`No historical data available for the selected period for symbol ${upperSymbol}.`);
      }

      // Format market cap
      const formatMarketCap = (marketCap: number) => {
        if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
        if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
        if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
        return `$${marketCap.toFixed(0)}`;
      };
      
      const priceChange = Number.parseFloat(globalQuote['09. change']);
      const priceChangeString = globalQuote['10. change percent'];
      const priceChangePercent = Number.parseFloat(priceChangeString.replace('%', ''));

      const processed = {
        symbol: overviewData.Symbol,
        name: overviewData.Name,
        current_price: Number.parseFloat(globalQuote['05. price']),
        price_change: priceChange,
        price_change_percent: priceChangePercent,
        currency: overviewData.Currency,
        market_cap: overviewData.MarketCapitalization !== 'None' ? formatMarketCap(Number.parseFloat(overviewData.MarketCapitalization)) : 'N/A',
        description: overviewData.Description,
        primary_exchange: overviewData.Exchange,
        market_status: getMarketStatus(new Date(globalQuote['07. latest trading day'])),
        chart_data: chartData,
        period: period,
        timespan: 'day',
        last_updated: new Date(globalQuote['07. latest trading day']).toISOString(),
        trading_session: {
          is_open: isMarketOpen(new Date(globalQuote['07. latest trading day'])),
          next_open: getNextMarketOpen(),
          next_close: getNextMarketClose(),
        },
        data_source_notes: 'Data provided by Alpha Vantage.',
        api_limitations: ['Free tier may have API call limits.']
      };

      return processed;

    } catch (err) {
      console.error('Alpha Vantage API error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return {
        error: 'Failed to fetch stock data from Alpha Vantage',
        message: errorMessage,
        symbol: symbol.toUpperCase(),
      };
    }
  },
});

function isMarketOpen(lastTradeDay?: Date): boolean {
  const now = new Date();
  // If last trade day is not today, market is closed.
  if (lastTradeDay) {
      const today = new Date();
      if(lastTradeDay.getUTCFullYear() !== today.getUTCFullYear() || 
         lastTradeDay.getUTCMonth() !== today.getUTCMonth() ||
         lastTradeDay.getUTCDate() !== today.getUTCDate()) {
             return false;
         }
  }

  const day = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getUTCHours();
  const minutes = now.getMinutes();
  
  // Market hours in UTC: 13:30 - 20:00 UTC for NYSE/NASDAQ
  const marketOpenHour = 13;
  const marketOpenMinute = 30;
  const marketCloseHour = 20;

  // Market is closed on weekends
  if (day === 0 || day === 6) return false;

  const currentTimeInMinutes = hour * 60 + minutes;
  const marketOpenTimeInMinutes = marketOpenHour * 60 + marketOpenMinute;
  const marketCloseTimeInMinutes = marketCloseHour * 60;

  return currentTimeInMinutes >= marketOpenTimeInMinutes && currentTimeInMinutes < marketCloseTimeInMinutes;
}

function getMarketStatus(lastTradeDay: Date): string {
    const isOpen = isMarketOpen(lastTradeDay);

    if (isOpen) return 'Open';

    const now = new Date();
    const day = now.getUTCDay();

    if(day === 0 || day === 6) return 'Closed (Weekend)';

    const hour = now.getUTCHours();
    // Pre-market 4:00 AM to 9:30 AM EST -> 8:00 to 13:30 UTC
    if (hour >= 8 && (hour < 13 || (hour === 13 && now.getUTCMinutes() < 30))) {
        return 'Pre-Market';
    }
    // After hours 4:00 PM to 8:00 PM EST -> 20:00 to 00:00 UTC
    if (hour >= 20) {
        return 'After Hours';
    }

    return 'Closed';
}

function getNextMarketOpen(): string {
  const now = new Date();
  const nextOpen = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 13, 30, 0, 0));
  
  if (now.getUTCDay() === 5 && now.getUTCHours() >= 20) { // Friday after close
      nextOpen.setUTCDate(now.getUTCDate() + 3);
  } else if (now.getUTCDay() === 6) { // Saturday
      nextOpen.setUTCDate(now.getUTCDate() + 2);
  } else if (now.getUTCHours() >= 20 || now.getUTCDay() === 0) { // any other day after close, or Sunday
      nextOpen.setUTCDate(now.getUTCDate() + 1);
  } else if (now.getUTCHours() < 13 || (now.getUTCHours() === 13 && now.getUTCMinutes() < 30)) {
    // it is today
  } else {
    // it is tomorrow
    nextOpen.setUTCDate(now.getUTCDate() + 1);
  }
  
  return nextOpen.toISOString();
}

function getNextMarketClose(): string {
  const now = new Date();
  const nextClose = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 20, 0, 0, 0));

    if (now.getUTCHours() >= 20) {
        if(now.getUTCDay() === 5) { // Friday
            nextClose.setUTCDate(now.getUTCDate() + 3);
        } else {
            nextClose.setUTCDate(now.getUTCDate() + 1);
        }
    }
  
  return nextClose.toISOString();
} 
'use client';
import { format } from 'date-fns';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface StockData {
  symbol: string;
  name: string;
  current_price: number;
  price_change: number;
  price_change_percent: number;
  currency: string;
  market_cap: string;
  description: string;
  homepage_url?: string;
  logo_url?: string;
  primary_exchange: string;
  market_status: string;
  chart_data: Array<{
    timestamp: number;
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    price: number;
  }>;
  period: string;
  timespan: string;
  last_updated: string;
  trading_session: {
    is_open: boolean;
    next_open: string;
    next_close: string;
  };
  data_source_notes?: string;
  api_limitations?: string[];
}

// Sample data for development/fallback
const SAMPLE_STOCK_DATA: StockData = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  current_price: 193.58,
  price_change: 2.43,
  price_change_percent: 1.27,
  currency: 'USD',
  market_cap: '$2.95T',
  description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
  homepage_url: 'https://www.apple.com',
  primary_exchange: 'NASDAQ',
  market_status: 'Closed',
  chart_data: [
    { timestamp: 1703721600000, date: '2023-12-28T00:00:00.000Z', open: 193.89, high: 194.66, low: 193.17, close: 193.58, volume: 34049900, price: 193.58 },
    { timestamp: 1703808000000, date: '2023-12-29T00:00:00.000Z', open: 193.90, high: 194.40, low: 191.73, close: 192.53, volume: 42628100, price: 192.53 },
    { timestamp: 1703894400000, date: '2023-12-30T00:00:00.000Z', open: 192.53, high: 193.09, low: 191.72, close: 192.32, volume: 38243200, price: 192.32 },
  ],
  period: '1M',
  timespan: 'day',
  last_updated: new Date().toISOString(),
  trading_session: {
    is_open: false,
    next_open: new Date().toISOString(),
    next_close: new Date().toISOString(),
  }
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatPercentage(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

function StockIcon({ symbol, logoUrl, size = 'md' }: { 
  symbol: string; 
  logoUrl?: string; 
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-sm',
  };

  if (logoUrl) {
    return (
      <div 
        className={cn(
          sizeClasses[size],
          'rounded-lg overflow-hidden',
          'bg-white/10 backdrop-blur-md border border-white/20',
          'flex items-center justify-center shadow-lg'
        )}
      >
        <img 
          src={logoUrl} 
          alt={`${symbol} logo`}
          className="w-full h-full object-contain p-1.5"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        sizeClasses[size], 
        'bg-white/10 backdrop-blur-md rounded-lg border border-white/20',
        'flex items-center justify-center shadow-lg',
        'text-white font-semibold'
      )}
    >
      {symbol}
    </div>
  );
}

export function Stocks({
  stockData = SAMPLE_STOCK_DATA,
}: {
  stockData?: StockData;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(stockData.period);
  const [isLoading, setIsLoading] = useState(false);

  const isPositive = stockData.price_change >= 0;
  const chartColor = isPositive ? '#10b981' : '#ef4444'; // emerald-500 : red-500
  const glowColor = isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';

  // Filter chart data based on selected period
  const getFilteredData = () => {
    const now = new Date();
    const startDate = new Date();
    
    switch (selectedPeriod) {
      case '1D':
        startDate.setDate(now.getDate() - 1);
        break;
      case '5D':
        startDate.setDate(now.getDate() - 5);
        break;
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return stockData.chart_data;
    }
    
    return stockData.chart_data.filter(point => 
      new Date(point.timestamp) >= startDate
    );
  };

  const filteredData = getFilteredData();

  // Prepare professional stock chart data
  const chartLabels = filteredData.map(point => {
    const date = new Date(point.timestamp);
    if (selectedPeriod === '1D') {
      return format(date, 'HH:mm');
    } else if (selectedPeriod === '5D' || selectedPeriod === '1M') {
      return format(date, 'MMM dd');
    } else {
      return format(date, 'MMM yyyy');
    }
  });

  const chartPrices = filteredData.map(point => point.close);
  const minPrice = Math.min(...chartPrices);
  const maxPrice = Math.max(...chartPrices);
  const priceRange = maxPrice - minPrice;

  const chartConfig = {
    labels: chartLabels,
    datasets: [
      {
        label: stockData.symbol,
        data: chartPrices,
        borderColor: chartColor,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return 'transparent';
          
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, glowColor);
          gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.05)');
          gradient.addColorStop(1, 'transparent');
          return gradient;
        },
        borderWidth: 2.5,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 3,
        pointHoverBorderColor: 'rgba(255, 255, 255, 0.8)',
        pointHoverBackgroundColor: chartColor,
        segment: {
          borderColor: (ctx: any) => {
            const current = ctx.p1.parsed.y;
            const previous = ctx.p0.parsed.y;
            return current >= previous ? '#10b981' : '#ef4444';
          }
        }
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    elements: {
      point: {
        hoverRadius: 8,
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: chartColor,
        borderWidth: 1,
        cornerRadius: 12,
        padding: 16,
                 titleFont: { 
           size: 13, 
           weight: 'bold' as const,
           family: 'Geist'
         },
         bodyFont: { 
           size: 14,
           weight: 'bold' as const,
           family: 'Geist'
         },
                 callbacks: {
           title: (context: any) => {
             const date = filteredData[context[0].dataIndex];
             return format(new Date(date.timestamp), 'MMM dd, yyyy HH:mm');
           },
          label: (context: any) => {
            const value = context.parsed.y;
            const change = context.dataIndex > 0 
              ? value - chartPrices[context.dataIndex - 1]
              : 0;
            const changePercent = context.dataIndex > 0 
              ? ((change / chartPrices[context.dataIndex - 1]) * 100)
              : 0;
            
            return [
              `Price: ${formatPrice(value)}`,
              `Change: ${change >= 0 ? '+' : ''}${formatPrice(change)} (${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`
            ];
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
                  ticks: {
            color: 'rgba(255, 255, 255, 0.7)',
            maxTicksLimit: 6,
            font: { 
              size: 11, 
              weight: 'normal' as const,
              family: 'Geist'
            },
            padding: 8,
          },
      },
      y: {
        display: true,
        position: 'right' as const,
        min: minPrice - (priceRange * 0.1),
        max: maxPrice + (priceRange * 0.1),
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
                  ticks: {
            color: 'rgba(255, 255, 255, 0.7)',
            font: { 
              size: 11, 
              weight: 'normal' as const,
              family: 'Geist'
            },
            padding: 12,
            callback: (value: any) => `$${value.toFixed(2)}`,
            count: 5,
          },
      },
    },
  };

  const handlePeriodChange = async (period: string) => {
    setIsLoading(true);
    setSelectedPeriod(period);
    
    // Simulate loading for smooth UX
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsLoading(false);
  };

  const periods = [
    { value: '1D', label: '1D' },
    { value: '5D', label: '5D' },
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '1Y', label: '1Y' },
  ];

  const metrics = [
    { label: 'MARKET CAP', value: stockData.market_cap },
    { label: 'VOLUME', value: '42.6M' },
    { label: 'P/E RATIO', value: '28.7' },
    { label: 'DIV YIELD', value: '0.5%' },
    { label: '52W HIGH', value: '$199.62' },
    { label: '52W LOW', value: '$164.08' },
  ];

  return (
    <div className="w-full">
      {/* Glassmorphism container */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl backdrop-blur-xl border border-white/10">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-black/[0.05] rounded-3xl pointer-events-none" />
        
        {/* Period selector - segmented control */}
        <div className="relative mb-6 flex justify-center">
          <div className="flex p-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 w-fit">
            {periods.map((period) => (
              <Button
                key={period.value}
                variant="ghost"
                size="sm"
                onClick={() => handlePeriodChange(period.value)}
                disabled={isLoading}
                className={cn(
                  'relative h-8 px-4 text-xs font-medium transition-all duration-200',
                  'hover:bg-white/20 hover:text-white',
                  selectedPeriod === period.value
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30 rounded-lg'
                    : 'text-white/70'
                )}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Stock header */}
        <div className="relative flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3">
            <StockIcon symbol={stockData.symbol} logoUrl={stockData.logo_url} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {stockData.symbol}
              </h2>
              <p className="text-sm text-white/60 font-medium">
                {stockData.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/60 font-medium">
              H: {formatPrice(194.66)} L: {formatPrice(191.72)}
            </div>
          </div>
        </div>

        {/* Current price display */}
        <div className="relative mb-6">
          <div className="text-4xl font-bold text-white mb-2">
            {formatPrice(stockData.current_price)}
          </div>
          <div className={cn(
            'flex items-center space-x-2 text-sm font-semibold',
            isPositive ? 'text-emerald-400' : 'text-red-400'
          )}>
            <svg 
              className={cn('w-4 h-4', {
                'rotate-180': !isPositive
              })}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span>{formatPrice(stockData.price_change)} ({formatPercentage(stockData.price_change_percent)})</span>
          </div>
        </div>

        {/* Market status */}
        <div className="relative mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                stockData.market_status === 'Open' 
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' 
                  : 'bg-red-500 shadow-lg shadow-red-500/50'
              )} />
              <span className="text-sm text-white/80 font-medium">{stockData.market_status}</span>
            </div>
            <span className="text-sm text-white/60">{stockData.primary_exchange}</span>
          </div>
        </div>

        {/* Professional stock chart */}
        <div className="relative mb-6">
          <div className="h-64 w-full bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60" />
              </div>
            ) : (
              <Line data={chartConfig} options={chartOptions} />
            )}
          </div>
        </div>

        {/* Stock metrics grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {metrics.map((metric, index) => (
            <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="text-xs text-white/50 font-medium mb-1">{metric.label}</div>
              <div className="text-sm text-white font-semibold">{metric.value}</div>
            </div>
          ))}
        </div>

        {/* Expandable details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-white/10 pt-4 mt-4"
            >
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="text-xs text-white/50 font-medium mb-2">ABOUT</div>
                <div className="text-sm text-white/80 leading-relaxed">
                  {stockData.description}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show more button */}
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full h-10 text-xs text-white/60 hover:text-white hover:bg-white/10 mt-2"
        >
          <span>{isExpanded ? 'Show Less' : 'Show More Details'}</span>
          <svg 
            className={cn('ml-2 h-3 w-3 transition-transform', {
              'rotate-180': isExpanded
            })}
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </Button>

        {/* Data source */}
        {stockData.data_source_notes && (
          <div className="text-xs text-white/40 text-center mt-4 border-t border-white/10 pt-4">
            {stockData.data_source_notes}
          </div>
        )}
      </div>
    </div>
  );
} 
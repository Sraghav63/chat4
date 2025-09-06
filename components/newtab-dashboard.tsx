// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Session } from 'next-auth';
import {
  Search,
  Hash,
  Mail,
  Globe,
  Mic,
  Paperclip,
  ArrowRight
} from 'lucide-react';

const SEARCH_BG = 'rgb(22, 28, 36)';
const WIDGET_BG = 'rgb(22, 28, 36)';
const APP_TILE_BG = 'rgb(30, 37, 46)';

interface NewTabDashboardProps {
  session: Session;
}

function AnalogClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondAngle = (time.getSeconds() * 6) - 90;
  const minuteAngle = (time.getMinutes() * 6) + (time.getSeconds() * 0.1) - 90;
  const hourAngle = ((time.getHours() % 12) * 30) + (time.getMinutes() * 0.5) - 90;

  const formatTime = (d: Date) => {
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const h12 = hours % 12 || 12;
    const mm = minutes.toString().padStart(2, '0');
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${h12}:${mm} ${ampm}`;
  };

  return (
    <div className={cn("relative w-full h-full rounded-3xl p-6 flex flex-col", `bg-[${WIDGET_BG}]`)}>
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="95"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
            
            {/* Hour markers */}
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i * 30) - 90;
              const x1 = 100 + 85 * Math.cos(angle * Math.PI / 180);
              const y1 = 100 + 85 * Math.sin(angle * Math.PI / 180);
              const x2 = 100 + 75 * Math.cos(angle * Math.PI / 180);
              const y2 = 100 + 75 * Math.sin(angle * Math.PI / 180);
              
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255, 255, 255, 0.4)"
                  strokeWidth="2"
                />
              );
            })}

            {/* Hour hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + 50 * Math.cos(hourAngle * Math.PI / 180)}
              y2={100 + 50 * Math.sin(hourAngle * Math.PI / 180)}
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Minute hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + 70 * Math.cos(minuteAngle * Math.PI / 180)}
              y2={100 + 70 * Math.sin(minuteAngle * Math.PI / 180)}
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Second hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + 75 * Math.cos(secondAngle * Math.PI / 180)}
              y2={100 + 75 * Math.sin(secondAngle * Math.PI / 180)}
              stroke="#ff6b35"
              strokeWidth="1"
              strokeLinecap="round"
            />

            {/* Center dot */}
            <circle cx="100" cy="100" r="3" fill="white" />
          </svg>
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-white text-lg font-light">Sterling</div>
        <div className="text-white/60 text-sm">{formatTime(time)}</div>
      </div>
    </div>
  );
}

function StockWidget() {
  const stockData = {
    symbol: 'ONON',
    company: 'On Holding AG',
    price: 44.21,
    change: -8.26,
    changePercent: -15.73
  };

  const isNegative = stockData.change < 0;

  // Sample chart data points for the line
  const chartPoints = [
    { x: 20, y: 40 },
    { x: 40, y: 35 },
    { x: 60, y: 45 },
    { x: 80, y: 30 },
    { x: 100, y: 25 },
    { x: 120, y: 35 },
    { x: 140, y: 20 },
    { x: 160, y: 25 },
    { x: 180, y: 15 }
  ];

  const pathData = `M ${chartPoints.map(p => `${p.x},${p.y}`).join(' L ')}`;

  return (
    <div className={cn("relative w-full h-full rounded-3xl p-6 flex flex-col", `bg-[${WIDGET_BG}]`)}>
      <div className="mb-4">
        <div className="text-white font-semibold text-lg">{stockData.symbol}</div>
        <div className="text-white/60 text-sm">{stockData.company}</div>
        <div className="text-red-500 text-sm font-medium">▼ {stockData.changePercent}%</div>
      </div>
      
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 200 60">
          <path
            d={pathData}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          {/* Data points */}
          {chartPoints.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="2"
              fill="#ef4444"
            />
          ))}
        </svg>
      </div>
      
      <div className="text-center">
        <div className="text-white text-2xl font-bold">${stockData.price}</div>
      </div>
    </div>
  );
}

function WeatherWidget() {
  return (
    <div className="relative w-full h-full bg-blue-600 rounded-3xl p-6 overflow-hidden">
      {/* Weather icon background */}
      <div className="absolute top-4 right-4 opacity-20">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.5 20Q4.22 20 2.61 18.43Q1 16.85 1 14.58Q1 12.63 2.17 11.1Q3.35 9.57 5.25 9.15Q5.88 6.85 7.75 5.43Q9.63 4 12 4Q14.93 4 16.96 6.04Q19 8.07 19 11Q20.73 11.2 21.86 12.5Q23 13.78 23 15.5Q23 17.38 21.69 18.69Q20.38 20 18.5 20H6.5M6.5 18H18.5Q19.55 18 20.27 17.27Q21 16.55 21 15.5Q21 14.45 20.27 13.73Q19.55 13 18.5 13H17V11Q17 8.93 15.54 7.46Q14.07 6 12 6Q9.93 6 8.46 7.46Q7 8.93 7 11H6.5Q5.05 11 4.03 12.03Q3 13.05 3 14.5Q3 15.95 4.03 16.97Q5.05 18 6.5 18Z"/>
          </svg>
        </div>
      </div>

      <div className="relative z-10">
        <div className="text-white text-3xl font-light mb-1">72°F</div>
        <div className="text-white/90 text-sm">Mostly clear</div>
        <div className="text-white/70 text-xs">Cascades, VA</div>
      </div>

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-gradient-to-tr from-white/10 via-transparent to-white/5"></div>
      </div>
    </div>
  );
}

function NotesWidget({ variant = 'orange' }: { variant?: 'orange' | 'blue' }) {
  const styles =
    variant === 'blue'
      ? 'bg-blue-800'
      : 'bg-orange-500';
  return (
    <div className={cn("relative w-full h-full rounded-3xl p-6", styles)}>
      <div className="text-white/90 text-sm font-medium mb-2">New note...</div>
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function AppTile({ icon, name, color }: { icon: string; name: string; color: string }) {
  return (
    <div className={cn("w-full h-full rounded-3xl p-4", `bg-[${APP_TILE_BG}]`)}>
      <div className="flex items-center gap-3">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", color)}>
          <span className="text-white text-sm">{icon}</span>
        </div>
        <span className="text-white/80 text-sm">{name}</span>
      </div>
    </div>
  );
}

function NewsWidget({ title, image }: { title: string; image: string }) {
  return (
    <div className={cn("relative w-full h-full rounded-3xl overflow-hidden", `bg-[${WIDGET_BG}]`)}>
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7)), url(${image})`
        }}
      />
      <div className="relative z-10 p-6 h-full flex flex-col justify-end">
        <div className="text-white text-sm font-medium leading-tight">{title}</div>
      </div>
    </div>
  );
}

function QuickDinnerWidget() {
  return (
    <div className="relative w-full h-full bg-emerald-600 rounded-3xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="text-white text-xs">🍽️</span>
        </div>
        <span className="text-white/80 text-sm">/quick-dinner</span>
      </div>
      
      <div className="text-white text-sm font-medium">
        Give me 3 ideas of one-pan meals I can make for dinner tonight
      </div>
    </div>
  );
}

export default function NewTabDashboard({ session }: NewTabDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch}>
            <div className={cn("relative rounded-2xl border border-gray-700/50", `bg-[${SEARCH_BG}]`)}>
              <div className="flex items-center px-6 py-4">
                <Search className="w-5 h-5 text-gray-400 mr-4" />
                
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ask anything. Type @ for mentions and / for shortcuts"
                  className="flex-1 bg-transparent text-white placeholder-gray-400 text-lg outline-none"
                />
                
                <div className="flex items-center gap-3 ml-4">
                  <Button size="sm" variant="ghost" className="text-gray-500 hover:text-white p-2">
                    <Hash className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-gray-500 hover:text-white p-2">
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-gray-500 hover:text-white p-2">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-gray-500 hover:text-white p-2">
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Main Widget Grid */}
        <div className="grid grid-cols-4 auto-rows-fr gap-6 mb-8">
          <AnalogClock />
          <StockWidget />
          <WeatherWidget />
          <NotesWidget variant="blue" />
          
          <AppTile icon="▶️" name="Youtube" color="bg-red-600" />
          <AppTile icon="💬" name="Essium" color="bg-purple-600" />
          <AppTile icon="💬" name="Chat Raghav" color="bg-blue-600" />
          <AppTile icon="☁️" name="Dash Cloudflare" color="bg-orange-600" />
          
          <NotesWidget />
          <NewsWidget 
            title="Why do developers use Next.js?"
            image="/images/demo-thumbnail.png"
          />
          <NewsWidget 
            title="South Korean president calls Japan 'indispensable partner'"
            image="/images/demo-thumbnail.png"
          />
          <QuickDinnerWidget />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-gray-500 hover:text-white cursor-pointer">
            <span className="text-base">⚡</span>
            <span className="text-sm">Try Assistant</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 hover:text-white cursor-pointer">
            <span className="text-base">🧩</span>
            <span className="text-sm">Edit widgets</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 hover:text-white cursor-pointer">
            <span className="text-base">📧</span>
            <span className="text-sm">Invites</span>
          </div>
        </div>

        {/* Account + Upgrade */}
        <div className="fixed bottom-6 left-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">{session.user?.name?.[0] || 'A'}</span>
            </div>
            <span className="text-gray-500 text-sm">Account</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
            <span className="text-gray-500 text-sm">Upgrade</span>
          </div>
        </div>

        {/* Bottom-right floating controls */}
        <div className="fixed bottom-6 right-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-800/50 border border-gray-700/50 flex items-center justify-center text-gray-400">
            <span className="text-xs">🌐</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-800/50 border border-gray-700/50 flex items-center justify-center text-gray-400">
            <span className="text-base">?</span>
          </div>
        </div>
      </div>
    </div>
  );
}
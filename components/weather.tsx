'use client';

import cx from 'classnames';
import { format, isWithinInterval } from 'date-fns';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
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

// Legacy weather data structure for backward compatibility
interface LegacyWeatherAtLocation {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: {
    time: string;
    interval: string;
    temperature_2m: string;
  };
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
  };
  hourly_units: {
    time: string;
    temperature_2m: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
  daily_units: {
    time: string;
    sunrise: string;
    sunset: string;
  };
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
  };
}

// Enhanced weather data structure from our improved API
interface EnhancedWeatherAtLocation {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    elevation: number;
  };
  current: {
    time: string;
    temperature: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    wind: {
      speed: number;
      direction: number;
      gusts: number;
    };
    precipitation: {
      current: number;
      rain: number;
      showers: number;
      snow: number;
    };
    conditions: {
      weather_code: number;
      cloud_cover: number;
      visibility: number;
      is_day: boolean;
    };
    weather_description: string;
    temperature_unit: string;
    location_country: string;
  };
  hourly_forecast: Array<{
    time: string;
    temperature: number;
    feels_like: number;
    humidity: number;
    precipitation_probability: number;
    precipitation: number;
    weather_code: number;
    weather_description: string;
    cloud_cover: number;
    wind_speed: number;
    wind_direction: number;
    is_day: boolean;
  }>;
  daily_forecast: Array<{
    date: string;
    temperature: {
      max: number;
      min: number;
    };
    feels_like: {
      max: number;
      min: number;
    };
    precipitation: {
      sum: number;
      rain_sum: number;
      hours: number;
      probability_max: number;
    };
    wind: {
      max_speed: number;
      max_gusts: number;
      dominant_direction: number;
    };
    sun: {
      sunrise: string;
      sunset: string;
    };
    weather_code: number;
    weather_description: string;
    uv_index: number;
  }>;
  units: {
    temperature: string;
    wind_speed: string;
    precipitation: string;
    pressure: string;
    visibility: string;
  };
}

type WeatherAtLocation = LegacyWeatherAtLocation | EnhancedWeatherAtLocation;

function isEnhancedWeatherData(data: WeatherAtLocation): data is EnhancedWeatherAtLocation {
  return 'location' in data && 'current' in data && typeof data.current === 'object' && 'temperature' in data.current;
}

// Sample data for development/fallback
const LEGACY_SAMPLE: LegacyWeatherAtLocation = {
  latitude: 37.775,
  longitude: -122.4183,
  generationtime_ms: 0.12345,
  utc_offset_seconds: -25200,
  timezone: 'America/Los_Angeles',
  timezone_abbreviation: 'PST',
  elevation: 52.0,
  current_units: {
    time: 'iso8601',
    interval: 'seconds',
    temperature_2m: '°C',
  },
  current: {
    time: '2023-10-12T14:30',
    interval: 900,
    temperature_2m: 18.5,
  },
  hourly_units: {
    time: 'iso8601',
    temperature_2m: '°C',
  },
  hourly: {
    time: [
      '2023-10-12T14:00',
      '2023-10-12T15:00',
      '2023-10-12T16:00',
      '2023-10-12T17:00',
      '2023-10-12T18:00',
      '2023-10-12T19:00',
    ],
    temperature_2m: [18.5, 19.2, 19.8, 19.1, 18.3, 17.5],
  },
  daily_units: {
    time: 'iso8601',
    sunrise: 'iso8601',
    sunset: 'iso8601',
  },
  daily: {
    time: ['2023-10-12'],
    sunrise: ['2023-10-12T07:15:00'],
    sunset: ['2023-10-12T18:45:00'],
  },
};

const PREFERRED_UNIT_KEY = 'weather-unit-preference';

function n(num: number): number {
  return Math.round(num);
}

type TempUnit = 'C' | 'F';

function cToF(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

function maybeConvert(temp: number, unit: TempUnit): number {
  return unit === 'F' ? cToF(temp) : temp;
}

// Weather background configuration based on conditions and time
function getWeatherBackground(weatherCode: number, isDay: boolean, cloudCover: number) {
  const time = isDay ? 'day' : 'night';
  
  // Clear sky
  if (weatherCode === 0) {
    return isDay 
      ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600'
      : 'bg-gradient-to-br from-indigo-900 via-purple-900 to-black';
  }
  
  // Partly cloudy
  if (weatherCode <= 3) {
    return isDay
      ? 'bg-gradient-to-br from-blue-300 via-blue-400 to-blue-500'
      : 'bg-gradient-to-br from-slate-800 via-slate-900 to-black';
  }
  
  // Foggy/Misty
  if (weatherCode >= 45 && weatherCode <= 48) {
    return 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600';
  }
  
  // Drizzle/Light rain
  if (weatherCode >= 51 && weatherCode <= 57) {
    return 'bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700';
  }
  
  // Rain
  if (weatherCode >= 61 && weatherCode <= 67) {
    return 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800';
  }
  
  // Snow
  if (weatherCode >= 71 && weatherCode <= 86) {
    return 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500';
  }
  
  // Thunderstorm
  if (weatherCode >= 95) {
    return 'bg-gradient-to-br from-slate-800 via-slate-900 to-black';
  }
  
  // Default
  return isDay 
    ? 'bg-gradient-to-br from-blue-400 to-blue-600'
    : 'bg-gradient-to-br from-slate-800 to-black';
}

// Background pattern overlay based on weather
function getWeatherPattern(weatherCode: number) {
  // Rain pattern
  if (weatherCode >= 51 && weatherCode <= 67) {
    return 'rain';
  }
  
  // Snow pattern
  if (weatherCode >= 71 && weatherCode <= 86) {
    return 'snow';
  }
  
  // Cloud pattern
  if (weatherCode >= 1 && weatherCode <= 48) {
    return 'clouds';
  }
  
  return 'clear';
}

function WeatherIcon({ weatherCode, isDay, size = 'md', className = '' }: { 
  weatherCode: number; 
  isDay: boolean; 
  size?: 'sm' | 'md' | 'lg' | 'xl'; 
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const getWeatherIcon = () => {
    // Clear sky
    if (weatherCode === 0) {
      return isDay 
        ? <svg className={cx(sizeClasses[size], className)} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
          </svg>
        : <svg className={cx(sizeClasses[size], className)} fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd"/>
          </svg>;
    }

    // Partly cloudy
    if (weatherCode >= 1 && weatherCode <= 3) {
      return <svg className={cx(sizeClasses[size], className)} fill="currentColor" viewBox="0 0 24 24">
        <path d="M3.75 13.5a3.75 3.75 0 016.67-2.3 2.25 2.25 0 004.6 0 3.001 3.001 0 015.985.233A3.001 3.001 0 0118.75 18h-12A3.75 3.75 0 013.75 13.5z"/>
      </svg>;
    }

    // Rain
    if (weatherCode >= 51 && weatherCode <= 67) {
      return <svg className={cx(sizeClasses[size], className)} fill="currentColor" viewBox="0 0 24 24">
        <path d="M3.75 13.5a3.75 3.75 0 014.5-3.67V9.75a.75.75 0 011.5 0v.085c.58.061 1.13.233 1.627.491a.75.75 0 11-.754 1.297 2.25 2.25 0 00-2.248-.544 3.75 3.75 0 014.5 3.67A3.001 3.001 0 0118.75 18H6.75a3.75 3.75 0 01-3-6z"/>
        <path d="M9 21.75a.75.75 0 01-1.5 0v-1.5a.75.75 0 011.5 0v1.5zM12 21.75a.75.75 0 01-1.5 0v-1.5a.75.75 0 011.5 0v1.5zM15 21.75a.75.75 0 01-1.5 0v-1.5a.75.75 0 011.5 0v1.5z"/>
      </svg>;
    }

    // Snow
    if (weatherCode >= 71 && weatherCode <= 86) {
      return <svg className={cx(sizeClasses[size], className)} fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 01-.5-1.416A11.238 11.238 0 016 1.5c2.178 0 4.053.614 5.25 1.433V4.533zM19.25 2.139a.75.75 0 00-.5 1.416A9.735 9.735 0 0122 3a9.707 9.707 0 01-5.25 1.533v1.5C18.947 5.114 20.822 4.5 23 4.5a.75.75 0 000-1.5c-2.178 0-4.053.614-5.25 1.433V2.139z"/>
      </svg>;
    }

    // Default cloud
    return <svg className={cx(sizeClasses[size], className)} fill="currentColor" viewBox="0 0 24 24">
      <path d="M3.75 13.5a3.75 3.75 0 014.5-3.67V9.75a.75.75 0 011.5 0v.085c.58.061 1.13.233 1.627.491a.75.75 0 11-.754 1.297 2.25 2.25 0 00-2.248-.544 3.75 3.75 0 014.5 3.67A3.001 3.001 0 0118.75 18H6.75a3.75 3.75 0 01-3-6z"/>
    </svg>;
  };

  return getWeatherIcon();
}

function HourlyWeatherCard({ hour, unit }: { hour: any; unit: string }) {
  return (
    <motion.div 
      className="flex-shrink-0 w-20 bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-xs text-white/70 mb-2">
        {format(new Date(hour.time), 'HH:mm')}
      </div>
      <WeatherIcon 
        weatherCode={hour.weather_code} 
        isDay={hour.is_day} 
        size="sm" 
        className="mx-auto mb-2 text-white/90"
      />
      <div className="text-sm font-medium text-white mb-1">
        {n(hour.temperature)}{unit}
      </div>
      <div className="text-xs text-white/60 mb-1">
        {hour.precipitation_probability}%
      </div>
      <div className="text-xs text-white/60">
        {hour.wind_speed}mph
      </div>
    </motion.div>
  );
}

export function Weather({
  weatherAtLocation = LEGACY_SAMPLE,
}: {
  weatherAtLocation?: WeatherAtLocation;
}) {
  const { data: session } = useSession();
  const [unit, setUnit] = useState<TempUnit>('C');
  const [currentView, setCurrentView] = useState<'current' | 'hourly' | 'daily'>('current');

  const isEnhanced = isEnhancedWeatherData(weatherAtLocation);

  // For enhanced data, use the provided unit; for legacy data, use user preference
  const shouldUseUserPreference = !isEnhanced;
  const enhancedTemperatureUnit = isEnhanced ? 
    (weatherAtLocation.current.temperature_unit === '°F' ? 'F' : 'C') : 'C';

  // Load temperature unit preference from database for authenticated users, localStorage for guests
  useEffect(() => {
    if (!shouldUseUserPreference) {
      setUnit(enhancedTemperatureUnit);
      return;
    }

    const loadTemperatureUnit = async () => {
      if (session?.user && session.user.type === 'regular') {
        try {
          const response = await fetch('/api/user/temperature-unit');
          if (response.ok) {
            const data = await response.json();
            setUnit(data.temperatureUnit || 'C');
          }
        } catch (error) {
          console.error('Failed to load temperature unit:', error);
          // Fallback to localStorage for errors
          if (typeof window !== 'undefined') {
            const stored = window.localStorage.getItem(PREFERRED_UNIT_KEY);
            if (stored === 'F' || stored === 'C') {
              setUnit(stored);
            }
          }
        }
      } else {
        // Guest users or unauthenticated - use localStorage
        if (typeof window !== 'undefined') {
          const stored = window.localStorage.getItem(PREFERRED_UNIT_KEY);
          if (stored === 'F' || stored === 'C') {
            setUnit(stored);
          }
        }
      }
    };

    loadTemperatureUnit();
  }, [session, shouldUseUserPreference, enhancedTemperatureUnit]);

  // Save temperature unit preference (only for legacy data)
  useEffect(() => {
    if (!shouldUseUserPreference) return;

    const saveTemperatureUnit = async () => {
      if (session?.user && session.user.type === 'regular') {
        try {
          await fetch('/api/user/temperature-unit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ temperatureUnit: unit }),
          });
        } catch (error) {
          console.error('Failed to save temperature unit:', error);
          // Fallback to localStorage for errors
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(PREFERRED_UNIT_KEY, unit);
          }
        }
      } else {
        // Guest users or unauthenticated - use localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(PREFERRED_UNIT_KEY, unit);
        }
      }
    };

    // Don't save on initial load, only when unit changes
    if (unit) {
      saveTemperatureUnit();
    }
  }, [unit, session, shouldUseUserPreference]);

  // Extract weather data
  let currentTemp: number;
  let currentHigh: number;
  let currentLow: number;
  let isDay: boolean;
  let unitSymbol: string;
  let currentWeatherCode: number;
  let weatherDescription: string;
  let humidity: number;
  let windSpeed: number;
  let windDirection: number;
  let pressure: number;
  let visibility: number;
  let uvIndex: number;
  let locationName: string;
  let dailyForecast: any[];
  let hourlyForecast: any[] = [];
  let precipitationProbability = 0;
  let cloudCover = 0;
  let feelsLike: number;

  if (isEnhanced) {
    // Enhanced data structure
    currentTemp = weatherAtLocation.current.temperature;
    feelsLike = weatherAtLocation.current.feels_like;
    const firstDay = weatherAtLocation.daily_forecast[0];
    currentHigh = firstDay?.temperature.max || currentTemp + 5;
    currentLow = firstDay?.temperature.min || currentTemp - 5;
    isDay = weatherAtLocation.current.conditions.is_day;
    unitSymbol = weatherAtLocation.current.temperature_unit;
    currentWeatherCode = weatherAtLocation.current.conditions.weather_code;
    weatherDescription = weatherAtLocation.current.weather_description;
    humidity = weatherAtLocation.current.humidity;
    windSpeed = weatherAtLocation.current.wind.speed;
    windDirection = weatherAtLocation.current.wind.direction;
    pressure = weatherAtLocation.current.pressure;
    visibility = weatherAtLocation.current.conditions.visibility;
    uvIndex = firstDay?.uv_index || 0;
    locationName = weatherAtLocation.location.name;
    dailyForecast = weatherAtLocation.daily_forecast.slice(0, 6);
    hourlyForecast = weatherAtLocation.hourly_forecast.slice(0, 24);
    precipitationProbability = hourlyForecast[0]?.precipitation_probability || 0;
    cloudCover = weatherAtLocation.current.conditions.cloud_cover;
  } else {
    // Legacy data structure
    const legacyData = weatherAtLocation as LegacyWeatherAtLocation;
    currentTemp = maybeConvert(legacyData.current.temperature_2m, unit);
    feelsLike = currentTemp; // Approximation for legacy data
    
    currentHigh = Math.max(
      ...legacyData.hourly.temperature_2m.slice(0, 24).map((t) => maybeConvert(t, unit)),
    );
    currentLow = Math.min(
      ...legacyData.hourly.temperature_2m.slice(0, 24).map((t) => maybeConvert(t, unit)),
    );

    isDay = isWithinInterval(new Date(legacyData.current.time), {
      start: new Date(legacyData.daily.sunrise[0]),
      end: new Date(legacyData.daily.sunset[0]),
    });

    unitSymbol = unit === 'F' ? '°F' : '°C';
    currentWeatherCode = 0; // Default to clear sky for legacy data
    weatherDescription = 'Clear sky';
    humidity = 65; // Default values for legacy data
    windSpeed = 8;
    windDirection = 225;
    pressure = 1013;
    visibility = 10;
    uvIndex = 5;
    locationName = 'Current Location';
    dailyForecast = [];
    precipitationProbability = 0;
    cloudCover = 0;
    
    // Create basic hourly forecast from legacy data
    hourlyForecast = legacyData.hourly.time.slice(0, 12).map((time, index) => ({
      time,
      temperature: maybeConvert(legacyData.hourly.temperature_2m[index], unit),
      weather_code: 0,
      precipitation_probability: 0,
      wind_speed: 8,
      is_day: true,
    }));
  }

  const backgroundClass = getWeatherBackground(currentWeatherCode, isDay, cloudCover);
  const weatherPattern = getWeatherPattern(currentWeatherCode);

  // Chart data for temperature trend
  const chartData = {
    labels: hourlyForecast.slice(0, 12).map(hour => format(new Date(hour.time), 'HH:mm')),
    datasets: [
      {
        label: 'Temperature',
        data: hourlyForecast.slice(0, 12).map(hour => hour.temperature),
        borderColor: 'rgba(255, 255, 255, 0.8)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(255, 255, 255, 0.9)',
        pointBorderColor: 'rgba(255, 255, 255, 1)',
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 11,
          },
          callback: function(value: any) {
            return `${value}${unitSymbol}`;
          },
        },
      },
    },
  };

  return (
    <div className={cx(
      "relative overflow-hidden rounded-3xl max-w-md shadow-2xl",
      backgroundClass
    )}>
      {/* Weather pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        {weatherPattern === 'rain' && (
          <div className="rain-overlay absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-white/10" />
        )}
        {weatherPattern === 'snow' && (
          <div className="snow-overlay absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/5" />
        )}
        {weatherPattern === 'clouds' && (
          <div className="cloud-overlay absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
        )}
      </div>

      {/* Glass morphism container */}
      <div className="relative backdrop-blur-sm bg-white/10 border border-white/20 p-6">
        {/* Navigation tabs */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/20">
            {['current', 'hourly', 'daily'].map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view as any)}
                className={cx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  {
                    'bg-white/20 text-white shadow-sm': currentView === view,
                    'text-white/70 hover:text-white hover:bg-white/10': currentView !== view,
                  }
                )}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentView === 'current' && (
            <motion.div
              key="current"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
      {/* Header with location and current weather */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
                  <WeatherIcon weatherCode={currentWeatherCode} isDay={isDay} size="xl" className="text-white" />
          <div>
                    <div className="text-5xl font-light text-white">{n(currentTemp)}{unitSymbol}</div>
                    <div className="text-white/80 capitalize">{weatherDescription}</div>
                    <div className="text-white/60 text-sm">{locationName}</div>
          </div>
        </div>
                <div className="text-right text-white/80">
          <div className="text-sm">H:{n(currentHigh)}{unitSymbol}</div>
          <div className="text-sm">L:{n(currentLow)}{unitSymbol}</div>
        </div>
      </div>

              {/* Feels like and precipitation */}
              <div className="flex justify-between items-center bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="text-center">
                  <div className="text-white/60 text-xs uppercase tracking-wide">Feels like</div>
                  <div className="text-white text-lg font-medium">{n(feelsLike)}{unitSymbol}</div>
                </div>
                <div className="text-center">
                  <div className="text-white/60 text-xs uppercase tracking-wide">Precipitation</div>
                  <div className="text-white text-lg font-medium">{precipitationProbability}%</div>
                </div>
                <div className="text-center">
                  <div className="text-white/60 text-xs uppercase tracking-wide">Humidity</div>
                  <div className="text-white text-lg font-medium">{humidity}%</div>
                </div>
              </div>

      {/* Current conditions details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
        <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 1 0-5.656-5.656 4 4 0 0 0 5.656 5.656Z"/>
          </svg>
                    <span className="text-white/70">Pressure</span>
                  </div>
                  <span className="text-white font-medium">{pressure}mb</span>
        </div>
        
                <div className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
        <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/>
          </svg>
                    <span className="text-white/70">UV Index</span>
                  </div>
                  <span className="text-white font-medium">{uvIndex}</span>
        </div>
        
                <div className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
        <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
          </svg>
                    <span className="text-white/70">Wind</span>
        </div>
                  <span className="text-white font-medium">{windSpeed}mph</span>
      </div>

                <div className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    <span className="text-white/70">Visibility</span>
                  </div>
                  <span className="text-white font-medium">{Math.round(visibility / 1000)}km</span>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'hourly' && (
            <motion.div
              key="hourly"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Temperature chart */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <h3 className="text-white/80 text-sm font-medium mb-4">24-Hour Temperature Trend</h3>
                <div className="h-40">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>

              {/* Scrollable hourly cards */}
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-3 pb-2">
                  {hourlyForecast.map((hour, index) => (
                    <HourlyWeatherCard key={index} hour={hour} unit={unitSymbol} />
            ))}
          </div>
        </div>
            </motion.div>
      )}

          {currentView === 'daily' && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {dailyForecast.length > 0 ? (
                dailyForecast.map((day, index) => (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-white/80 w-16 text-sm font-medium">
                        {index === 0 ? 'Today' : format(new Date(day.date), 'EEE')}
                      </span>
                      <WeatherIcon weatherCode={day.weather_code} isDay={true} size="md" className="text-white/90" />
                      <div className="flex-1">
                        <div className="text-white/90 text-sm capitalize">{day.weather_description}</div>
                        <div className="text-white/60 text-xs">
                          ☔ {day.precipitation.probability_max}% • 💨 {Math.round(day.wind.max_speed)}mph
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-white font-medium">{n(day.temperature.max)}{unitSymbol}</span>
                      <span className="text-white/60">{n(day.temperature.min)}{unitSymbol}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-white/60 py-8">
                  <div className="text-sm">Daily forecast not available</div>
                  <div className="text-xs mt-1">Enhanced weather data required</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      {/* Only show unit toggle for legacy data */}
      {shouldUseUserPreference && (
          <motion.div 
            className="flex justify-center gap-2 text-sm mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
          {(['C', 'F'] as TempUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={cx(
                  'px-4 py-2 rounded-xl transition-all duration-200 backdrop-blur-md border border-white/20',
                {
                    'bg-white/20 text-white shadow-lg': unit === u,
                    'text-white/70 hover:bg-white/10 hover:text-white': unit !== u,
                },
              )}
            >
              °{u}
            </button>
          ))}
          </motion.div>
        )}
        </div>
    </div>
  );
}

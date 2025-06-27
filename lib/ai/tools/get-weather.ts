import { tool } from 'ai';
import { z } from 'zod';

const WEATHER_API_KEY = process.env.WEATHER_API_KEY ?? '';

export const getWeather = tool({
  description: 'Get current weather and 5-day forecast for a location using WeatherAPI.com',
  parameters: z.object({
    latitude: z.number().describe('Latitude coordinate of the location'),
    longitude: z.number().describe('Longitude coordinate of the location'),
    location_name: z.string().optional().describe('Optional human-readable name of the location (e.g., "San Francisco, CA" or "London, UK")'),
  }),
  execute: async ({ latitude, longitude, location_name }) => {
    if (!WEATHER_API_KEY) {
      return {
        error: 'Missing WEATHER_API_KEY environment variable. Please set it in your .env file.',
      };
    }

    try {
      const query = `${latitude},${longitude}`;
      const days = 5;
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${query}&days=${days}&aqi=no&alerts=no`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`WeatherAPI responded with status ${res.status}`);
      }

      const data = await res.json();

      const { location, current, forecast } = data as any;
      const isUS =
        (location.country as string).toLowerCase().includes('united states');

      const processed = {
        location: {
          name: location_name || `${location.name}, ${location.region || location.country}`,
          latitude: location.lat,
          longitude: location.lon,
          timezone: location.tz_id,
          elevation: 0,
        },
        current: {
          time: current.last_updated,
          temperature: isUS ? current.temp_f : current.temp_c,
          feels_like: isUS ? current.feelslike_f : current.feelslike_c,
          humidity: current.humidity,
          pressure: current.pressure_mb,
          wind: {
            speed: isUS ? current.wind_mph : current.wind_kph,
            direction: current.wind_degree,
            gusts: isUS ? current.gust_mph : current.gust_kph,
          },
          precipitation: {
            current: current.precip_mm,
            rain: current.precip_mm,
            showers: 0,
            snow: 0,
          },
          conditions: {
            weather_code: current.condition.code,
            cloud_cover: current.cloud,
            visibility: isUS ? current.vis_miles : current.vis_km,
            is_day: Boolean(current.is_day),
          },
          weather_description: current.condition.text,
          temperature_unit: isUS ? '°F' : '°C',
          location_country: location.country,
        },
        hourly_forecast: forecast.forecastday[0].hour.map((h: any) => ({
          time: h.time,
          temperature: isUS ? h.temp_f : h.temp_c,
          feels_like: isUS ? h.feelslike_f : h.feelslike_c,
          humidity: h.humidity,
          precipitation_probability: h.chance_of_rain || 0,
          precipitation: h.precip_mm,
          weather_code: h.condition.code,
          weather_description: h.condition.text,
          cloud_cover: h.cloud,
          wind_speed: isUS ? h.wind_mph : h.wind_kph,
          wind_direction: h.wind_degree,
          is_day: Boolean(h.is_day),
        })),
        daily_forecast: forecast.forecastday.map((d: any) => ({
          date: d.date,
          temperature: {
            max: isUS ? d.day.maxtemp_f : d.day.maxtemp_c,
            min: isUS ? d.day.mintemp_f : d.day.mintemp_c,
          },
          feels_like: {
            max: isUS ? d.day.avgtemp_f : d.day.avgtemp_c,
            min: isUS ? d.day.mintemp_f : d.day.mintemp_c,
          },
          precipitation: {
            sum: d.day.totalprecip_mm,
            rain_sum: d.day.totalprecip_mm,
            hours: d.day.daily_will_it_rain,
            probability_max: d.day.daily_chance_of_rain,
          },
          wind: {
            max_speed: isUS ? d.day.maxwind_mph : d.day.maxwind_kph,
            max_gusts: 0,
            dominant_direction: 0,
          },
          sun: {
            sunrise: d.astro.sunrise,
            sunset: d.astro.sunset,
          },
          weather_code: d.day.condition.code,
          weather_description: d.day.condition.text,
          uv_index: d.day.uv,
        })),
        units: {
          temperature: isUS ? '°F' : '°C',
          wind_speed: isUS ? 'mph' : 'km/h',
          precipitation: 'mm',
          pressure: 'mb',
          visibility: isUS ? 'mi' : 'km',
        },
      } as const;

      return processed;
    } catch (err) {
      console.error('WeatherAPI error:', err);
      return {
        error: 'Failed to fetch weather data from WeatherAPI',
        message: err instanceof Error ? err.message : 'Unknown error',
        location: location_name || `${latitude}, ${longitude}`,
      };
    }
  },
});

// Helper function to determine if coordinates are in the US
async function isLocationInUS(latitude: number, longitude: number): Promise<boolean> {
  try {
    // Simple geographic bounds check for US (including Alaska and Hawaii)
    const isInCONUS = latitude >= 24.396308 && latitude <= 49.384358 && 
                      longitude >= -125.000000 && longitude <= -66.934570;
    const isInAlaska = latitude >= 51.000000 && latitude <= 71.500000 && 
                       longitude >= -179.000000 && longitude <= -129.000000;
    const isInHawaii = latitude >= 18.000000 && latitude <= 23.000000 && 
                       longitude >= -161.000000 && longitude <= -154.000000;
    
    return isInCONUS || isInAlaska || isInHawaii;
  } catch {
    // Default to Celsius if location detection fails
    return false;
  }
}

// AccuWeather weather condition descriptions based on their icon codes
function getWeatherDescription(weatherCode: number, isDay: boolean): string {
  // AccuWeather uses different icon codes (1-44)
  switch (weatherCode) {
    case 1:
      return isDay ? 'Sunny' : 'Clear';
    case 2:
      return isDay ? 'Mostly sunny' : 'Mostly clear';
    case 3:
      return isDay ? 'Partly sunny' : 'Partly clear';
    case 4:
      return 'Intermittent clouds';
    case 5:
      return 'Hazy sunshine';
    case 6:
      return 'Mostly cloudy';
    case 7:
      return 'Cloudy';
    case 8:
      return 'Dreary (overcast)';
    case 11:
      return 'Fog';
    case 12:
      return 'Showers';
    case 13:
      return isDay ? 'Mostly cloudy w/ showers' : 'Mostly cloudy w/ showers';
    case 14:
      return isDay ? 'Partly sunny w/ showers' : 'Partly cloudy w/ showers';
    case 15:
      return 'Thunderstorms';
    case 16:
      return isDay ? 'Mostly cloudy w/ t-storms' : 'Mostly cloudy w/ t-storms';
    case 17:
      return isDay ? 'Partly sunny w/ t-storms' : 'Partly cloudy w/ t-storms';
    case 18:
      return 'Rain';
    case 19:
      return 'Flurries';
    case 20:
      return isDay ? 'Mostly cloudy w/ flurries' : 'Mostly cloudy w/ flurries';
    case 21:
      return isDay ? 'Partly sunny w/ flurries' : 'Partly cloudy w/ flurries';
    case 22:
      return 'Snow';
    case 23:
      return isDay ? 'Mostly cloudy w/ snow' : 'Mostly cloudy w/ snow';
    case 24:
      return 'Ice';
    case 25:
      return 'Sleet';
    case 26:
      return 'Freezing rain';
    case 29:
      return 'Rain and snow';
    case 30:
      return 'Hot';
    case 31:
      return 'Cold';
    case 32:
      return 'Windy';
    case 33:
      return isDay ? 'Clear' : 'Clear';
    case 34:
      return isDay ? 'Mostly clear' : 'Mostly clear';
    case 35:
      return isDay ? 'Partly cloudy' : 'Partly cloudy';
    case 36:
      return 'Intermittent clouds';
    case 37:
      return 'Hazy moonlight';
    case 38:
      return 'Mostly cloudy';
    case 39:
      return isDay ? 'Partly cloudy w/ showers' : 'Partly cloudy w/ showers';
    case 40:
      return isDay ? 'Mostly cloudy w/ showers' : 'Mostly cloudy w/ showers';
    case 41:
      return isDay ? 'Partly cloudy w/ t-storms' : 'Partly cloudy w/ t-storms';
    case 42:
      return isDay ? 'Mostly cloudy w/ t-storms' : 'Mostly cloudy w/ t-storms';
    case 43:
      return isDay ? 'Mostly cloudy w/ flurries' : 'Mostly cloudy w/ flurries';
    case 44:
      return isDay ? 'Mostly cloudy w/ snow' : 'Mostly cloudy w/ snow';
    default:
      return 'Unknown conditions';
  }
}

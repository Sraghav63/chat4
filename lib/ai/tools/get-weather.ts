import { tool } from 'ai';
import { z } from 'zod';

const ACCUWEATHER_API_KEY = 'Fzv3qavO5cHi6i9YBNkIT5PIjeDyDhDH';

export const getWeather = tool({
  description: 'Get comprehensive current weather information for a location including temperature, humidity, wind, precipitation, clouds, and detailed conditions',
  parameters: z.object({
    latitude: z.number().describe('Latitude coordinate of the location'),
    longitude: z.number().describe('Longitude coordinate of the location'),
    location_name: z.string().optional().describe('Optional human-readable name of the location (e.g., "San Francisco, CA" or "London, UK")'),
  }),
  execute: async ({ latitude, longitude, location_name }) => {
    try {
      // Determine if location is in US for temperature unit
      const isUSLocation = await isLocationInUS(latitude, longitude);
      const temperatureUnit = isUSLocation ? 'fahrenheit' : 'celsius';
      
      // Step 1: Get location key from coordinates using AccuWeather GeoPosition API
      const geoUrl = `http://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${ACCUWEATHER_API_KEY}&q=${latitude},${longitude}&details=true`;
      
      const geoResponse = await fetch(geoUrl);
      if (!geoResponse.ok) {
        throw new Error(`AccuWeather GeoPosition API responded with status ${geoResponse.status}`);
      }
      
      const locationData = await geoResponse.json();
      const locationKey = locationData.Key;
      const cityName = `${locationData.LocalizedName}, ${locationData.AdministrativeArea?.LocalizedName || locationData.Country?.LocalizedName}`;
      
      // Step 2: Get current conditions
      const currentUrl = `http://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${ACCUWEATHER_API_KEY}&details=true`;
      
      const currentResponse = await fetch(currentUrl);
      if (!currentResponse.ok) {
        throw new Error(`AccuWeather Current Conditions API responded with status ${currentResponse.status}`);
      }
      
      const currentData = await currentResponse.json();
      const current = currentData[0]; // AccuWeather returns array with one element
      
      // Step 3: Get 5-day forecast
      const forecastUrl = `http://dataservice.accuweather.com/forecasts/v1/daily/5day/${locationKey}?apikey=${ACCUWEATHER_API_KEY}&details=true&metric=${!isUSLocation}`;
      
      const forecastResponse = await fetch(forecastUrl);
      if (!forecastResponse.ok) {
        throw new Error(`AccuWeather Forecast API responded with status ${forecastResponse.status}`);
      }
      
      const forecastData = await forecastResponse.json();
      
      // Step 4: Get hourly forecast (12 hours)
      const hourlyUrl = `http://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${locationKey}?apikey=${ACCUWEATHER_API_KEY}&details=true&metric=${!isUSLocation}`;
      
      const hourlyResponse = await fetch(hourlyUrl);
      if (!hourlyResponse.ok) {
        throw new Error(`AccuWeather Hourly API responded with status ${hourlyResponse.status}`);
      }
      
      const hourlyData = await hourlyResponse.json();
      
      // Process AccuWeather data into our standardized format
      const processedData = {
        location: {
          name: location_name || cityName,
          latitude: parseFloat(locationData.GeoPosition?.Latitude || latitude),
          longitude: parseFloat(locationData.GeoPosition?.Longitude || longitude),
          timezone: locationData.TimeZone?.Name || 'UTC',
          elevation: locationData.GeoPosition?.Elevation?.Metric?.Value || 0
        },
        current: {
          time: current.LocalObservationDateTime,
          temperature: isUSLocation ? current.Temperature.Imperial.Value : current.Temperature.Metric.Value,
          feels_like: isUSLocation ? current.RealFeelTemperature.Imperial.Value : current.RealFeelTemperature.Metric.Value,
          humidity: current.RelativeHumidity,
          pressure: isUSLocation ? current.Pressure.Imperial.Value : current.Pressure.Metric.Value,
          wind: {
            speed: isUSLocation ? current.Wind.Speed.Imperial.Value : current.Wind.Speed.Metric.Value,
            direction: current.Wind.Direction.Degrees,
            gusts: current.WindGust?.Speed ? (isUSLocation ? current.WindGust.Speed.Imperial.Value : current.WindGust.Speed.Metric.Value) : 0
          },
          precipitation: {
            current: isUSLocation ? (current.PrecipitationSummary?.Precipitation?.Imperial?.Value || 0) : (current.PrecipitationSummary?.Precipitation?.Metric?.Value || 0),
            rain: 0, // AccuWeather doesn't separate rain/snow in current conditions
            showers: 0,
            snow: 0
          },
          conditions: {
            weather_code: current.WeatherIcon, // AccuWeather uses different icon codes
            cloud_cover: current.CloudCover || 0,
            visibility: isUSLocation ? (current.Visibility?.Imperial?.Value || 10) : (current.Visibility?.Metric?.Value || 16),
            is_day: current.IsDayTime
          },
          weather_description: current.WeatherText,
          temperature_unit: temperatureUnit === 'fahrenheit' ? '°F' : '°C',
          location_country: locationData.Country?.LocalizedName || 'Unknown'
        },
        hourly_forecast: hourlyData.map((hour: any) => ({
          time: hour.DateTime,
          temperature: isUSLocation ? hour.Temperature.Value : hour.Temperature.Value,
          feels_like: isUSLocation ? hour.RealFeelTemperature.Value : hour.RealFeelTemperature.Value,
          humidity: hour.RelativeHumidity,
          precipitation_probability: hour.PrecipitationProbability,
          precipitation: isUSLocation ? (hour.TotalLiquid?.Value || 0) : (hour.TotalLiquid?.Value || 0),
          weather_code: hour.WeatherIcon,
          weather_description: hour.IconPhrase,
          cloud_cover: hour.CloudCover || 0,
          wind_speed: isUSLocation ? hour.Wind.Speed.Value : hour.Wind.Speed.Value,
          wind_direction: hour.Wind.Direction.Degrees,
          is_day: hour.IsDaylight
        })),
        daily_forecast: forecastData.DailyForecasts.map((day: any) => ({
          date: day.Date,
          temperature: {
            max: isUSLocation ? day.Temperature.Maximum.Value : day.Temperature.Maximum.Value,
            min: isUSLocation ? day.Temperature.Minimum.Value : day.Temperature.Minimum.Value
          },
          feels_like: {
            max: isUSLocation ? day.RealFeelTemperature.Maximum.Value : day.RealFeelTemperature.Maximum.Value,
            min: isUSLocation ? day.RealFeelTemperature.Minimum.Value : day.RealFeelTemperature.Minimum.Value
          },
          precipitation: {
            sum: isUSLocation ? (day.Day?.TotalLiquid?.Value || 0) : (day.Day?.TotalLiquid?.Value || 0),
            rain_sum: isUSLocation ? (day.Day?.Rain?.Value || 0) : (day.Day?.Rain?.Value || 0),
            hours: day.Day?.HoursOfPrecipitation || 0,
            probability_max: Math.max(day.Day?.PrecipitationProbability || 0, day.Night?.PrecipitationProbability || 0)
          },
          wind: {
            max_speed: isUSLocation ? day.Day?.Wind?.Speed?.Value || 0 : day.Day?.Wind?.Speed?.Value || 0,
            max_gusts: isUSLocation ? (day.Day?.WindGust?.Speed?.Value || 0) : (day.Day?.WindGust?.Speed?.Value || 0),
            dominant_direction: day.Day?.Wind?.Direction?.Degrees || 0
          },
          sun: {
            sunrise: day.Sun?.Rise || '',
            sunset: day.Sun?.Set || ''
          },
          weather_code: day.Day?.Icon || 1,
          weather_description: day.Day?.IconPhrase || 'Partly sunny',
          uv_index: day.AirAndPollen?.find((item: any) => item.Name === 'UVIndex')?.Value || 0
        })),
        units: {
          temperature: temperatureUnit === 'fahrenheit' ? '°F' : '°C',
          wind_speed: isUSLocation ? 'mph' : 'km/h',
          precipitation: isUSLocation ? 'in' : 'mm',
          pressure: isUSLocation ? 'inHg' : 'mb',
          visibility: isUSLocation ? 'mi' : 'km'
        }
      };

      return processedData;
    } catch (error) {
      console.error('AccuWeather API error:', error);
      return {
        error: 'Failed to fetch weather data from AccuWeather',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        location: location_name || `${latitude}, ${longitude}`
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

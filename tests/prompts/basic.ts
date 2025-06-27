import type { CoreMessage } from 'ai';

export const TEST_PROMPTS: Record<string, CoreMessage> = {
  USER_SKY: {
    role: 'user',
    content: [{ type: 'text', text: 'Why is the sky blue?' }],
  },
  USER_GRASS: {
    role: 'user',
    content: [{ type: 'text', text: 'Why is grass green?' }],
  },
  USER_THANKS: {
    role: 'user',
    content: [{ type: 'text', text: 'Thanks!' }],
  },
  USER_NEXTJS: {
    role: 'user',
    content: [
      { type: 'text', text: 'What are the advantages of using Next.js?' },
    ],
  },
  USER_IMAGE_ATTACHMENT: {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Who painted this?',
      },
      {
        type: 'image',
        image: '...',
      },
    ],
  },
  USER_TEXT_ARTIFACT: {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Help me write an essay about Silicon Valley',
      },
    ],
  },
  CREATE_DOCUMENT_TEXT_CALL: {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Essay about Silicon Valley',
      },
    ],
  },
  CREATE_DOCUMENT_TEXT_RESULT: {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId: 'call_123',
        toolName: 'createDocument',
        result: {
          id: '3ca386a4-40c6-4630-8ed1-84cbd46cc7eb',
          title: 'Essay about Silicon Valley',
          kind: 'text',
          content: 'A document was created and is now visible to the user.',
        },
      },
    ],
  },
  GET_WEATHER_CALL: {
    role: 'user',
    content: [
      {
        type: 'text',
        text: "What's the weather in sf?",
      },
    ],
  },
  GET_WEATHER_RESULT: {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId: 'call_456',
        toolName: 'getWeather',
        result: {
          location: {
            name: 'San Francisco, CA',
            latitude: 37.763283,
            longitude: -122.41286,
            timezone: 'America/Los_Angeles',
            elevation: 18
          },
          current: {
            time: '2025-03-10T14:00',
            temperature: 63,
            feels_like: 65,
            humidity: 68,
            pressure: 1013.2,
            wind: {
              speed: 12,
              direction: 225,
              gusts: 18
            },
            precipitation: {
              current: 0,
              rain: 0,
              showers: 0,
              snow: 0
            },
            conditions: {
              weather_code: 1,
              cloud_cover: 25,
              visibility: 10000,
              is_day: true
            },
            weather_description: 'Mainly clear',
            temperature_unit: '°F',
            location_country: 'United States'
          },
          hourly_forecast: [
            {
              time: '2025-03-10T14:00',
              temperature: 63,
              feels_like: 65,
              humidity: 68,
              precipitation_probability: 5,
              precipitation: 0,
              weather_code: 1,
              weather_description: 'Mainly clear',
              cloud_cover: 25,
              wind_speed: 12,
              wind_direction: 225,
              is_day: true
            }
          ],
          daily_forecast: [
            {
              date: '2025-03-10',
              temperature: {
                max: 68,
                min: 52
              },
              feels_like: {
                max: 70,
                min: 54
              },
              precipitation: {
                sum: 0,
                rain_sum: 0,
                hours: 0,
                probability_max: 10
              },
              wind: {
                max_speed: 15,
                max_gusts: 22,
                dominant_direction: 225
              },
              sun: {
                sunrise: '2025-03-10T07:27',
                sunset: '2025-03-10T19:12'
              },
              weather_code: 1,
              weather_description: 'Mainly clear',
              uv_index: 6
            }
          ],
          units: {
            temperature: '°F',
            wind_speed: 'mph',
            precipitation: 'inch',
            pressure: 'hPa',
            visibility: 'meters'
          }
        },
      },
    ],
  },
};

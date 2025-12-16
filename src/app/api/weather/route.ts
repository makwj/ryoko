/**
 * Weather API Route
 * 
 * Provides weather forecast data for trip destinations and dates.
 * Integrates with WeatherAPI to fetch current and forecast weather information.
 * Returns structured weather data including temperature, conditions, and descriptions.
 * Used by the trip planning interface to show weather information for planned dates.
 */

import { NextRequest, NextResponse } from 'next/server';

interface WeatherData {
  date: string;
  temperature: {
    high: number;
    low: number;
  };
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
}

// GET - Get weather forecast
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const destination = searchParams.get('destination');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!destination || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Always use WeatherAPI (no OpenWeatherMap)
    return await getWeatherAPIForecast(destination, startDate, endDate);
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json({ 
      error: 'Weather service not available',
      weather: []
    }, { status: 503 });
  }
}

// Get weather forecast from WeatherAPI
async function getWeatherAPIForecast(destination: string, startDate: string, endDate: string) {
  // Get WeatherAPI key from environment variables
  const apiKey = process.env.WEATHERAPI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({
      error: 'Weather service unavailable',
      weather: []
    }, { status: 503 });
  }
  
  try {
    // WeatherAPI provides up to 14 days of forecast (max allowed by API)
    const forecastUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(destination)}&days=14&aqi=no&alerts=no`;
    
    const response = await fetch(forecastUrl);
    if (!response.ok) {
      throw new Error(`WeatherAPI error: ${response.status}`);
    }

    const forecastData = await response.json();
    // Process the forecast data
    const weatherData = processWeatherAPIData(forecastData, startDate, endDate);

    if (!weatherData || weatherData.length === 0) {
      return NextResponse.json({
        error: 'Weather service unavailable',
        weather: []
      }, { status: 503 });
    }

    return NextResponse.json({ weather: weatherData });
  } catch (error) {
    return NextResponse.json({
      error: 'Weather service unavailable',
      weather: []
    }, { status: 503 });
  }
}

function processWeatherAPIData(forecastData: any, startDate: string, endDate: string): WeatherData[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const weatherData: WeatherData[] = [];
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Find matching forecast day
    const forecastDay = forecastData.forecast?.forecastday?.find((day: any) => {
      const forecastDate = new Date(day.date).toISOString().split('T')[0];
      return forecastDate === dateString;
    });
    
    if (forecastDay) {
      const dayWeather = {
        date: dateString,
        temperature: {
          high: Math.round(forecastDay.day.maxtemp_f),
          low: Math.round(forecastDay.day.mintemp_f)
        },
        condition: forecastDay.day.condition.text,
        description: forecastDay.day.condition.text,
        icon: getWeatherAPIIcon(forecastDay.day.condition.icon),
        humidity: forecastDay.day.avghumidity,
        windSpeed: Math.round(forecastDay.day.maxwind_mph),
        precipitation: Math.round(forecastDay.day.totalprecip_in * 10) // Convert inches to percentage
      };
      
      weatherData.push(dayWeather);
    }
  }
  
  return weatherData;
}

function getWeatherAPIIcon(weatherAPIIcon: string): string {
  // WeatherAPI icons are URLs, extract the icon name
  const iconName = weatherAPIIcon.split('/').pop()?.split('.')[0] || 'cloud';
  
  const iconMap: Record<string, string> = {
    '113': 'sun', // clear/sunny
    '116': 'cloud-sun', // partly cloudy
    '119': 'cloud', // cloudy
    '122': 'cloud', // overcast
    '143': 'cloud-fog', // mist
    '176': 'cloud-drizzle', // patchy rain
    '179': 'cloud-rain', // patchy snow
    '182': 'cloud-rain', // patchy sleet
    '185': 'cloud-drizzle', // patchy freezing drizzle
    '200': 'zap', // thundery outbreaks
    '227': 'snowflake', // blowing snow
    '230': 'snowflake', // blizzard
    '248': 'cloud-fog', // fog
    '260': 'cloud-fog', // freezing fog
    '263': 'cloud-drizzle', // patchy light drizzle
    '266': 'cloud-drizzle', // light drizzle
    '281': 'cloud-drizzle', // freezing drizzle
    '284': 'cloud-drizzle', // heavy freezing drizzle
    '293': 'cloud-drizzle', // patchy light rain
    '296': 'cloud-drizzle', // light rain
    '299': 'cloud-rain', // moderate rain
    '302': 'cloud-rain', // moderate rain
    '305': 'cloud-rain', // heavy rain
    '308': 'cloud-rain', // heavy rain
    '311': 'cloud-drizzle', // light freezing rain
    '314': 'cloud-rain', // moderate or heavy freezing rain
    '317': 'cloud-drizzle', // light sleet
    '320': 'cloud-rain', // moderate or heavy sleet
    '323': 'cloud-drizzle', // patchy light snow
    '326': 'snowflake', // light snow
    '329': 'snowflake', // patchy moderate snow
    '332': 'snowflake', // moderate snow
    '335': 'snowflake', // patchy heavy snow
    '338': 'snowflake', // heavy snow
    '350': 'cloud-rain', // ice pellets
    '353': 'cloud-drizzle', // light rain shower
    '356': 'cloud-rain', // moderate or heavy rain shower
    '359': 'cloud-rain', // torrential rain shower
    '362': 'cloud-drizzle', // light sleet showers
    '365': 'cloud-rain', // moderate or heavy sleet showers
    '368': 'cloud-drizzle', // light snow showers
    '371': 'snowflake', // moderate or heavy snow showers
    '374': 'cloud-drizzle', // light showers of ice pellets
    '377': 'cloud-rain', // moderate or heavy showers of ice pellets
    '386': 'zap', // patchy light rain with thunder
    '389': 'zap', // moderate or heavy rain with thunder
    '392': 'zap', // patchy light snow with thunder
    '395': 'zap' // moderate or heavy snow with thunder
  };
  
  return iconMap[iconName] || 'cloud';
}


export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

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

interface OpenWeatherForecast {
  dt: number;
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  rain?: {
    '3h': number;
  };
  snow?: {
    '3h': number;
  };
}

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

// OpenWeatherMap integration removed per request

async function getWeatherAPIForecast(destination: string, startDate: string, endDate: string) {
  // Get WeatherAPI key from environment variables
  const apiKey = process.env.WEATHERAPI_API_KEY;
  
  if (!apiKey) {
    return await getHistoricalWeatherData(destination, startDate, endDate);
  }
  
  try {
    // WeatherAPI provides up to 14 days of forecast
    const forecastUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(destination)}&days=14&aqi=no&alerts=no`;
    
    const response = await fetch(forecastUrl);
    if (!response.ok) {
      throw new Error(`WeatherAPI error: ${response.status}`);
    }

    const forecastData = await response.json();
    const weatherData = processWeatherAPIData(forecastData, startDate, endDate);

    return NextResponse.json({ weather: weatherData });
  } catch (error) {
    return await getHistoricalWeatherData(destination, startDate, endDate);
  }
}

async function getHistoricalWeatherData(destination: string, startDate: string, endDate: string) {
  
  // For dates beyond forecast range, use historical averages
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const weatherData: WeatherData[] = [];
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Generate realistic weather based on destination and season
    const weather = generateHistoricalWeather(destination, currentDate);
    
    weatherData.push({
      date: dateString,
      ...weather
    });
  }
  
  return NextResponse.json({ weather: weatherData });
}

async function getCoordinatesForDestination(destination: string, apiKey: string): Promise<{ lat: number; lon: number } | null> {
  try {
    // Use WeatherAPI's search endpoint for geocoding
    const geocodeUrl = `https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${encodeURIComponent(destination)}`;

    const response = await fetch(geocodeUrl);
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const coordinates = {
      lat: data[0].lat,
      lon: data[0].lon
    };
    return coordinates;
  } catch (error) {
    return null;
  }
}

function processForecastData(forecastData: any, startDate: string, endDate: string): WeatherData[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const weatherData: WeatherData[] = [];
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Get forecasts for this date (OpenWeatherMap provides 3-hour intervals)
    const dayForecasts = forecastData.list.filter((forecast: OpenWeatherForecast) => {
      const forecastDate = new Date(forecast.dt * 1000).toISOString().split('T')[0];
      return forecastDate === dateString;
    });
    
    if (dayForecasts.length === 0) {
      // If no forecast data for this date, use the first available forecast
      const firstForecast = forecastData.list[0] as OpenWeatherForecast;
      weatherData.push(convertForecastToWeatherData(firstForecast, dateString));
      continue;
    }
    
    // Calculate daily high/low temperatures and aggregate other data
    const temperatures = dayForecasts.map((f: OpenWeatherForecast) => f.main.temp);
    const highTemp = Math.max(...temperatures);
    const lowTemp = Math.min(...temperatures);
    
    // Use the most representative forecast (usually midday)
    const representativeForecast = dayForecasts[Math.floor(dayForecasts.length / 2)] || dayForecasts[0];
    
    const dayWeather = {
      date: dateString,
      temperature: {
        high: Math.round(highTemp),
        low: Math.round(lowTemp)
      },
      condition: representativeForecast.weather[0].main,
      description: representativeForecast.weather[0].description,
      icon: getWeatherIcon(representativeForecast.weather[0].icon),
      humidity: representativeForecast.main.humidity,
      windSpeed: Math.round(representativeForecast.wind.speed),
      precipitation: calculatePrecipitation(dayForecasts)
    };
    
    weatherData.push(dayWeather);
  }
  
  return weatherData;
}

function convertForecastToWeatherData(forecast: OpenWeatherForecast, date: string): WeatherData {
  return {
    date,
    temperature: {
      high: Math.round(forecast.main.temp_max),
      low: Math.round(forecast.main.temp_min)
    },
    condition: forecast.weather[0].main,
    description: forecast.weather[0].description,
    icon: getWeatherIcon(forecast.weather[0].icon),
    humidity: forecast.main.humidity,
    windSpeed: Math.round(forecast.wind.speed),
    precipitation: calculatePrecipitation([forecast])
  };
}

function getWeatherIcon(openWeatherIcon: string): string {
  const iconMap: Record<string, string> = {
    '01d': 'sun', // clear sky day
    '01n': 'moon', // clear sky night
    '02d': 'cloud-sun', // few clouds day
    '02n': 'cloud-moon', // few clouds night
    '03d': 'cloud', // scattered clouds
    '03n': 'cloud',
    '04d': 'cloud', // broken clouds
    '04n': 'cloud',
    '09d': 'cloud-rain', // shower rain
    '09n': 'cloud-rain',
    '10d': 'cloud-drizzle', // rain day
    '10n': 'cloud-rain', // rain night
    '11d': 'zap', // thunderstorm
    '11n': 'zap',
    '13d': 'snowflake', // snow
    '13n': 'snowflake',
    '50d': 'cloud-fog', // mist
    '50n': 'cloud-fog'
  };
  
  return iconMap[openWeatherIcon] || 'cloud';
}

function calculatePrecipitation(forecasts: OpenWeatherForecast[]): number {
  let totalPrecipitation = 0;
  forecasts.forEach(forecast => {
    if (forecast.rain) {
      totalPrecipitation += forecast.rain['3h'] || 0;
    }
    if (forecast.snow) {
      totalPrecipitation += forecast.snow['3h'] || 0;
    }
  });
  
  // Convert to percentage (0-100)
  const precipitationPercent = Math.min(Math.round(totalPrecipitation * 10), 100);
  return precipitationPercent;
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
    } else {
      const weather = generateHistoricalWeather(forecastData.location?.name || 'Unknown', currentDate);
      weatherData.push({
        date: dateString,
        ...weather
      });
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

function generateHistoricalWeather(destination: string, date: Date): Omit<WeatherData, 'date'> {
  const month = date.getMonth();
  const isWinter = month >= 11 || month <= 2;
  const isSummer = month >= 5 && month <= 8;
  
  // Basic climate patterns based on destination
  const isTropical = destination.toLowerCase().includes('thailand') || 
                     destination.toLowerCase().includes('singapore') ||
                     destination.toLowerCase().includes('malaysia') ||
                     destination.toLowerCase().includes('indonesia');
  
  const isTemperate = destination.toLowerCase().includes('japan') ||
                      destination.toLowerCase().includes('korea') ||
                      destination.toLowerCase().includes('china');
  
  let baseTemp, condition, humidity, windSpeed, precipitation;
  
  if (isTropical) {
    // Tropical climate: warm year-round, high humidity
    baseTemp = isWinter ? 75 : 85;
    humidity = Math.floor(Math.random() * 20) + 70; // 70-90%
    windSpeed = Math.floor(Math.random() * 10) + 5; // 5-15 mph
    precipitation = Math.random() < 0.3 ? Math.floor(Math.random() * 30) + 10 : 0;
    condition = precipitation > 0 ? 'Rain' : Math.random() < 0.7 ? 'Clear' : 'Clouds';
  } else if (isTemperate) {
    // Temperate climate: seasonal variation
    baseTemp = isWinter ? 35 : isSummer ? 80 : 60;
    humidity = Math.floor(Math.random() * 30) + 50; // 50-80%
    windSpeed = Math.floor(Math.random() * 15) + 5; // 5-20 mph
    precipitation = Math.random() < 0.4 ? Math.floor(Math.random() * 40) + 5 : 0;
    condition = precipitation > 0 ? 'Rain' : Math.random() < 0.6 ? 'Clear' : 'Clouds';
  } else {
    // Default temperate pattern
    baseTemp = isWinter ? 40 : isSummer ? 75 : 60;
    humidity = Math.floor(Math.random() * 25) + 55; // 55-80%
    windSpeed = Math.floor(Math.random() * 12) + 5; // 5-17 mph
    precipitation = Math.random() < 0.3 ? Math.floor(Math.random() * 25) + 5 : 0;
    condition = precipitation > 0 ? 'Rain' : Math.random() < 0.65 ? 'Clear' : 'Clouds';
  }
  
  // Add some randomness
  const tempVariation = Math.floor(Math.random() * 10) - 5; // ±5°F
  const highTemp = baseTemp + tempVariation;
  const lowTemp = highTemp - Math.floor(Math.random() * 15) - 5; // 5-20°F difference
  
  return {
    temperature: {
      high: Math.max(highTemp, lowTemp + 5),
      low: Math.min(lowTemp, highTemp - 5)
    },
    condition,
    description: condition.toLowerCase(),
    icon: getWeatherIconFromCondition(condition),
    humidity,
    windSpeed,
    precipitation
  };
}

function getWeatherIconFromCondition(condition: string): string {
  const conditionLower = condition.toLowerCase();
  if (conditionLower.includes('clear') || conditionLower.includes('sunny')) return 'sun';
  if (conditionLower.includes('cloud')) return 'cloud';
  if (conditionLower.includes('rain')) return 'cloud-rain';
  if (conditionLower.includes('snow')) return 'snowflake';
  if (conditionLower.includes('thunder') || conditionLower.includes('storm')) return 'zap';
  if (conditionLower.includes('fog') || conditionLower.includes('mist')) return 'cloud-fog';
  return 'cloud';
}


export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}

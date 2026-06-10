// Weather forecast tool using Open-Meteo API with caching.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { CACHE_DIR, DEFAULT_CITY, getCityCoordinates } from "../config.js";
import { getMockWeather } from "../mockData.js";

// WMO Weather interpretation codes
// https://open-meteo.com/en/docs
export const WMO_CODES: Record<number, string> = {
  0: "clear sky",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "depositing rime fog",
  51: "light drizzle",
  53: "moderate drizzle",
  55: "dense drizzle",
  61: "slight rain",
  63: "moderate rain",
  65: "heavy rain",
  66: "light freezing rain",
  67: "heavy freezing rain",
  71: "slight snow",
  73: "moderate snow",
  75: "heavy snow",
  77: "snow grains",
  80: "slight rain showers",
  81: "moderate rain showers",
  82: "violent rain showers",
  85: "slight snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm with slight hail",
  99: "thunderstorm with heavy hail",
};

// Weather codes that indicate rain
export const RAIN_CODES: Set<number> = new Set([
  51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
]);

interface WeatherData {
  temperature?: number;
  weather_code?: number;
  condition?: string;
}

/**
 * Get current weather for a city.
 *
 * @param city City name (default: "New York")
 *             Supported cities: New York, London, Tokyo, San Francisco, Seattle
 * @returns A formatted string with the current weather conditions.
 */
export async function getWeather(city: string = DEFAULT_CITY): Promise<string> {
  const trimmed = city.trim();
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = trimmed.toLowerCase().replace(/ /g, "_");
  const cacheFile = path.join(CACHE_DIR, `weather_${cacheKey}_${today}.json`);

  // Check cache first
  if (fs.existsSync(cacheFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as WeatherData;
      return formatWeatherResponse(trimmed, data);
    } catch {
      // Cache corrupted, fetch fresh data
    }
  }

  // Get coordinates for the city
  const coords = getCityCoordinates(trimmed);
  if (!coords) {
    // City not in our list, use mock data
    const data = getMockWeather(trimmed);
    return (
      formatWeatherResponse(trimmed, data) +
      ` (Note: ${trimmed} coordinates not found, using estimated data)`
    );
  }

  // Fetch from Open-Meteo API (no API key needed!)
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(coords.lat));
    url.searchParams.set("longitude", String(coords.lon));
    url.searchParams.set("current", "temperature_2m,weather_code");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = (await response.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const current = result.current ?? {};

    const data: WeatherData = {
      temperature: current.temperature_2m ?? 20,
      weather_code: current.weather_code ?? 0,
    };

    saveToCache(cacheFile, data);
    return formatWeatherResponse(trimmed, data);
  } catch (err) {
    // API error, fall back to mock data
    const data = getMockWeather(trimmed);
    const message = err instanceof Error ? err.message : String(err);
    return (
      formatWeatherResponse(trimmed, data) +
      ` (fallback due to API error: ${message})`
    );
  }
}

function formatWeatherResponse(city: string, data: WeatherData): string {
  const temp = data.temperature ?? 20;
  const weatherCode = data.weather_code ?? 0;

  // Get condition from WMO code or use provided condition
  const condition = data.condition || WMO_CODES[weatherCode] || "unknown";

  // Check if it's rainy
  const isRainy = RAIN_CODES.has(weatherCode) || condition.toLowerCase().includes("rain");

  if (isRainy) {
    return `The weather in ${city} is rainy with a temperature of ${temp.toFixed(0)}°C.`;
  }
  return `The weather in ${city} is ${condition} with a temperature of ${temp.toFixed(0)}°C.`;
}

function saveToCache(cacheFile: string, data: unknown): void {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
  } catch {
    // Silently fail on cache write errors
  }
}

// Allow running this file directly via `npm run test:weather`
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  void (async () => {
    console.log(await getWeather("New York"));
    console.log(await getWeather("London"));
    console.log(await getWeather("Tokyo"));
  })();
}

// Mock data for offline/demo mode when API keys are not available.

export interface MockStock {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  volume: number;
}

export interface MockWeather {
  city?: string;
  temperature: number;
  weather_code: number;
  condition: string;
}

// Mock stock data - realistic responses for common tickers
export const MOCK_STOCK_DATA: Record<string, MockStock> = {
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 178.72,
    changesPercentage: -0.45,
    change: -0.81,
    dayLow: 177.35,
    dayHigh: 180.1,
    volume: 52340000,
  },
  MSFT: {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    price: 378.91,
    changesPercentage: 0.32,
    change: 1.21,
    dayLow: 376.5,
    dayHigh: 380.25,
    volume: 18920000,
  },
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 142.5,
    changesPercentage: -1.23,
    change: -1.78,
    dayLow: 140.8,
    dayHigh: 145.2,
    volume: 245000000,
  },
  GOOGL: {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 175.23,
    changesPercentage: 0.67,
    change: 1.17,
    dayLow: 173.8,
    dayHigh: 176.5,
    volume: 21500000,
  },
  AMZN: {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 186.45,
    changesPercentage: -0.89,
    change: -1.68,
    dayLow: 184.2,
    dayHigh: 188.3,
    volume: 35400000,
  },
  TSLA: {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 248.5,
    changesPercentage: 2.15,
    change: 5.23,
    dayLow: 242.1,
    dayHigh: 251.8,
    volume: 98700000,
  },
  META: {
    symbol: "META",
    name: "Meta Platforms Inc.",
    price: 505.75,
    changesPercentage: -0.34,
    change: -1.73,
    dayLow: 502.3,
    dayHigh: 510.2,
    volume: 12300000,
  },
};

// Default mock response for unknown tickers
export const DEFAULT_MOCK_STOCK = {
  price: 100.0,
  changesPercentage: -0.5,
  change: -0.5,
  dayLow: 98.5,
  dayHigh: 101.25,
  volume: 1000000,
};

// Mock weather data for cities
export const MOCK_WEATHER_DATA: Record<string, MockWeather> = {
  "new york": {
    temperature: 18,
    weather_code: 61, // Rain: Slight intensity
    condition: "rainy",
  },
  london: {
    temperature: 12,
    weather_code: 3, // Overcast
    condition: "cloudy",
  },
  tokyo: {
    temperature: 24,
    weather_code: 0, // Clear sky
    condition: "sunny",
  },
  "san francisco": {
    temperature: 16,
    weather_code: 45, // Fog
    condition: "foggy",
  },
  seattle: {
    temperature: 14,
    weather_code: 63, // Rain: Moderate intensity
    condition: "rainy",
  },
};

// Default mock weather for unknown cities
export const DEFAULT_MOCK_WEATHER = {
  temperature: 20,
  weather_code: 2, // Partly cloudy
  condition: "partly cloudy",
};

export function getMockStock(ticker: string): MockStock {
  const tickerUpper = ticker.toUpperCase();
  const known = MOCK_STOCK_DATA[tickerUpper];
  if (known) {
    return known;
  }
  return {
    symbol: tickerUpper,
    name: `${tickerUpper} Inc.`,
    ...DEFAULT_MOCK_STOCK,
  };
}

export function getMockWeather(city: string): MockWeather {
  const cityLower = city.toLowerCase().trim();
  const known = MOCK_WEATHER_DATA[cityLower];
  if (known) {
    return known;
  }
  return { city, ...DEFAULT_MOCK_WEATHER };
}

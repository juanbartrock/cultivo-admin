import { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  humidity: number;
  city: string;
  country: string;
  description: string;
  loading: boolean;
  error: string | null;
}

export function useWeather(city: string = 'Buenos Aires') {
  const [weather, setWeather] = useState<WeatherData>({
    temperature: 0,
    humidity: 0,
    city: '',
    country: '',
    description: '',
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchWeather() {
      try {
        // Usando la API de Open-Meteo (no requiere API key)
        // Primero obtenemos las coordenadas de la ciudad
        const geocodingResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`
        );
        const geocodingData = await geocodingResponse.json();

        if (!geocodingData.results || geocodingData.results.length === 0) {
          throw new Error('Ciudad no encontrada');
        }

        const location = geocodingData.results[0];
        const { latitude, longitude, name, country } = location;

        // Obtenemos el clima actual
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
        );
        const weatherData = await weatherResponse.json();

        setWeather({
          temperature: Math.round(weatherData.current.temperature_2m * 10) / 10,
          humidity: weatherData.current.relative_humidity_2m,
          city: name,
          country: country,
          description: getWeatherDescription(weatherData.current.weather_code),
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error al obtener el clima:', error);
        setWeather(prev => ({
          ...prev,
          loading: false,
          error: 'No se pudo obtener el clima',
        }));
      }
    }

    fetchWeather();
    // Actualizar cada 10 minutos
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [city]);

  return weather;
}

function getWeatherDescription(code: number): string {
  const descriptions: { [key: number]: string } = {
    0: 'Despejado',
    1: 'Mayormente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Neblina',
    48: 'Neblina con escarcha',
    51: 'Llovizna ligera',
    53: 'Llovizna moderada',
    55: 'Llovizna intensa',
    61: 'Lluvia ligera',
    63: 'Lluvia moderada',
    65: 'Lluvia intensa',
    71: 'Nieve ligera',
    73: 'Nieve moderada',
    75: 'Nieve intensa',
    77: 'Granizo',
    80: 'Chubascos ligeros',
    81: 'Chubascos moderados',
    82: 'Chubascos intensos',
    85: 'Chubascos de nieve ligeros',
    86: 'Chubascos de nieve intensos',
    95: 'Tormenta',
    96: 'Tormenta con granizo ligero',
    99: 'Tormenta con granizo intenso',
  };

  return descriptions[code] || 'Desconocido';
}

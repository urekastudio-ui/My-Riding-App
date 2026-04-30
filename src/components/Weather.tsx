import { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, Wind, Thermometer } from 'lucide-react';

interface WeatherData {
  temp: string;
  condition: string;
  city: string;
}

export function Weather({ coords }: { coords: { latitude: number; longitude: number } | null }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!coords) return;
    
    async function fetchWeather() {
      setLoading(true);
      try {
        // wttr.in provides a simple JSON output
        const res = await fetch(`https://wttr.in/${coords?.latitude},${coords?.longitude}?format=j1`);
        const data = await res.json();
        const current = data.current_condition[0];
        setWeather({
          temp: current.temp_C,
          condition: current.weatherDesc[0].value,
          city: data.nearest_area[0].areaName[0].value
        });
      } catch (e) {
        console.error('Weather fetch error:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // Update every 10 mins
    return () => clearInterval(interval);
  }, [coords]);

  const getIcon = (condition: string) => {
    const c = condition.toLowerCase();
    const size = 20; // Default smaller size
    if (c.includes('sun') || c.includes('clear')) return <Sun className="text-yellow-400" size={size} />;
    if (c.includes('rain')) return <CloudRain className="text-blue-400" size={size} />;
    if (c.includes('thunder')) return <CloudLightning className="text-purple-400" size={size} />;
    if (c.includes('wind')) return <Wind className="text-stone-400" size={size} />;
    return <Cloud className="text-stone-300" size={size} />;
  };

  return (
    <div className="bg-bg-card border border-border-card rounded-3xl p-4 md:p-5 flex flex-col justify-between h-full shadow-lg overflow-hidden relative">
      <div className="flex justify-between items-start">
        <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-40">Weather</div>
        {weather && (
          <div className="text-[9px] md:text-[10px] font-black uppercase text-accent tracking-widest truncate max-w-[100px]">
             📍 {weather.city}
          </div>
        )}
      </div>
      
      {!coords ? (
        <div className="text-[9px] md:text-[10px] font-mono opacity-20 uppercase">Waiting for GPS...</div>
      ) : loading && !weather ? (
        <div className="animate-pulse flex gap-2 items-center">
          <div className="w-5 h-5 bg-border-card rounded-full" />
          <div className="h-3 bg-border-card rounded w-10" />
        </div>
      ) : weather ? (
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col overflow-hidden">
            <div className="text-2xl md:text-3xl font-mono text-white leading-none mb-1">
              {weather.temp}°<span className="text-sm opacity-40">C</span>
            </div>
            <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-tight text-accent truncate max-w-[70px] md:max-w-[100px]">
              {weather.condition}
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <div className="md:scale-125 origin-bottom-right">
              {getIcon(weather.condition)}
            </div>
            <div className="text-[7px] md:text-[8px] font-mono opacity-30 mt-1 uppercase truncate max-w-[50px] md:max-w-[80px]">
              {weather.city}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-[9px] md:text-[10px] font-mono opacity-20">OFFLINE</div>
      )}
    </div>
  );
}

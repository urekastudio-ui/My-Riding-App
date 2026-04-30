import { useState, useEffect, useRef } from 'react';
import { SensorData } from '../types';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function useSensors() {
  const [data, setData] = useState<SensorData>({
    speed: 0,
    distance: 0,
    coords: null,
    accuracy: 0
  });

  const [crashDetected, setCrashDetected] = useState(false);
  const lastPos = useRef<{lat: number, lon: number} | null>(null);
  const lastAccel = useRef<{x: number, y: number, z: number} | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, accuracy } = position.coords;
        
        let d = 0;
        if (lastPos.current) {
          d = getDistance(lastPos.current.lat, lastPos.current.lon, latitude, longitude);
          // Filter out jitter if speed is low and distance is small
          if (accuracy > 20 || d < 1) d = 0;
        }

        setData(prev => ({
          speed: speed || 0,
          distance: prev.distance + d,
          coords: { latitude, longitude },
          accuracy: accuracy || 0
        }));

        lastPos.current = { lat: latitude, lon: longitude };
      },
      (error) => console.error('GPS Error:', error),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      if (!accel) return;

      const totalG = Math.sqrt(
        (accel.x || 0) ** 2 + 
        (accel.y || 0) ** 2 + 
        (accel.z || 0) ** 2
      ) / 9.81;

      // Extremely simple crash detection: sudden high-G force
      // In a real app, you'd need much better filtering
      if (totalG > 4.5) { // 4.5G is quite a hit
        setCrashDetected(true);
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, []);

  return { data, crashDetected, resetCrash: () => setCrashDetected(false) };
}

import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface SpeedometerProps {
  speed: number; // m/s
  unit: 'km/h' | 'mph';
  mode: 'analog' | 'digital' | 'combo';
}

export function Speedometer({ speed, unit, mode }: SpeedometerProps) {
  const speedInUnit = speed * (unit === 'km/h' ? 3.6 : 2.23694);
  const maxSpeed = unit === 'km/h' ? 240 : 150;
  
  // Angle: -120 to 120 degrees for 0 to maxSpeed
  const angle = (Math.min(speedInUnit, maxSpeed) / maxSpeed) * 240 - 120;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative bg-bg-card rounded-3xl border border-border-card overflow-hidden">
      <div className="absolute top-6 left-6 text-xs font-bold uppercase text-accent flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div> GPS SPEEDOMETER
      </div>

      {(mode === 'analog' || mode === 'combo') && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Tick marks */}
          {[...Array(13)].map((_, i) => {
            const tickAngle = (i / 12) * 240 - 120;
            const value = Math.round((i / 12) * maxSpeed);
            return (
              <div
                key={i}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ transform: `rotate(${tickAngle}deg)` }}
              >
                <div className="h-full flex flex-col justify-between py-8">
                  <div className="w-0.5 h-3 bg-border-card" />
                  <div className="opacity-0">.</div>
                </div>
              </div>
            );
          })}

          {/* Needle */}
          <motion.div
            className="absolute bottom-1/2 left-1/2 w-0.5 h-[35%] bg-accent origin-bottom -translate-x-1/2 z-10"
            initial={{ rotate: -120 }}
            animate={{ rotate: angle }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          />
          <div className="w-4 h-4 rounded-full bg-bg-card border border-border-card z-20" />
        </div>
      )}

      {(mode === 'digital' || mode === 'combo') && (
        <div className={cn(
          "flex flex-col items-center justify-center z-30 transition-all duration-500",
          mode === 'combo' ? "mt-4" : ""
        )}>
          <div className="text-[80px] sm:text-[100px] md:text-[140px] font-black leading-none tracking-tighter text-white drop-shadow-2xl">
            {Math.round(speedInUnit)}
          </div>
          <div className="text-sm md:text-xl font-bold tracking-[0.4rem] text-accent -mt-1 md:-mt-2">
            {unit.toUpperCase()}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 md:bottom-8 left-0 right-0 px-8 md:px-12 flex justify-between font-mono text-[8px] md:text-[10px] opacity-30">
        <span>0</span><span>40</span><span>80</span><span>120</span><span>160</span><span>200</span><span>240</span>
      </div>
    </div>
  );
}

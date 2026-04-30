import { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';
import { cn } from '../lib/utils';

export function MediaControl() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [metadata, setMetadata] = useState<{ title: string; artist: string; album: string } | null>(null);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
    }
  }, []);

  return (
    <div className="bg-bg-card border border-border-card rounded-3xl p-4 md:p-5 flex items-center gap-4 md:gap-6 h-full overflow-hidden">
      <div className="hidden xs:flex w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-border-card to-bg-main rounded-xl items-center justify-center border border-[#3D424D] shrink-0 shadow-lg">
        <Music size={24} className="md:size-10 text-accent opacity-50" />
      </div>
      <div className="flex-grow flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 overflow-hidden">
        <div className="overflow-hidden">
          <div className="text-[9px] md:text-[10px] text-accent font-black uppercase mb-0.5 md:mb-1 tracking-[0.2em] opacity-80 italic">Now Playing</div>
          <div className="text-xl md:text-3xl font-black text-white leading-none italic truncate mb-0.5 md:mb-1">
            {metadata?.title || "Thunderstruck"}
          </div>
          <div className="text-[10px] md:text-xs font-bold opacity-30 uppercase tracking-widest truncate">
            {metadata?.artist || "AC/DC"} — {metadata?.album || "The Razors Edge"}
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <button className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center text-white opacity-40 hover:opacity-100 transition-all border border-white/10 active:scale-90">
            <SkipBack size={20} className="md:size-7" fill="currentColor" />
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-accent flex items-center justify-center text-bg-main hover:scale-105 transition-all shadow-[0_0_30px_rgba(var(--color-accent),0.3)] active:scale-95"
          >
            {isPlaying ? <Pause size={28} className="md:size-10" fill="currentColor" /> : <Play size={28} className={cn("md:size-10", "ml-1 md:ml-1.5")} fill="currentColor" />}
          </button>
          <button className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center text-white opacity-40 hover:opacity-100 transition-all border border-white/10 active:scale-90">
            <SkipForward size={20} className="md:size-7" fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
}

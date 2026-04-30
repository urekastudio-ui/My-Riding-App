import { useState, useEffect, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useSensors } from './lib/useSensors';
import { Speedometer } from './components/Speedometer';
import { MediaControl } from './components/MediaControl';
import { Maintenance } from './components/Maintenance';
import { SOS } from './components/SOS';
import { Weather } from './components/Weather';
import { SessionList } from './components/SessionList';
import { UserProfile } from './types';
import { LogIn, RefreshCcw, Settings, Gauge, MapPin, Radio, AlertCircle, Edit3, X, Save, Calendar, Clock, Lock, Unlock, GripVertical, Play, Square, History } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import { collection, addDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLocked, setIsLocked] = useState(() => {
    const saved = localStorage.getItem('isDashboardLocked');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('isDashboardLocked', isLocked.toString());
  }, [isLocked]);
  const [layouts, setLayouts] = useState<any>(() => {
    const saved = localStorage.getItem('dashboard_layout');
    if (saved) return JSON.parse(saved);

    const baseLayout = [
      { i: 'speedometer', x: 0, y: 0, w: 6, h: 4 },
      { i: 'odometer', x: 6, y: 0, w: 3, h: 2 },
      { i: 'tripmeter', x: 9, y: 0, w: 3, h: 2 },
      { i: 'session', x: 6, y: 2, w: 3, h: 2 },
      { i: 'weather', x: 9, y: 2, w: 3, h: 2 },
      { i: 'media', x: 0, y: 4, w: 6, h: 2 },
      { i: 'sos', x: 6, y: 4, w: 3, h: 2 },
      { i: 'maintenance', x: 9, y: 4, w: 3, h: 2 },
      { i: 'backup', x: 6, y: 6, w: 3, h: 2 },
    ];

    return {
      lg: baseLayout,
      md: baseLayout,
      sm: [
        { i: 'speedometer', x: 0, y: 0, w: 6, h: 4 },
        { i: 'odometer', x: 0, y: 4, w: 3, h: 2 },
        { i: 'tripmeter', x: 3, y: 4, w: 3, h: 2 },
        { i: 'session', x: 0, y: 6, w: 3, h: 2 },
        { i: 'weather', x: 3, y: 6, w: 3, h: 2 },
        { i: 'media', x: 0, y: 8, w: 6, h: 2 },
        { i: 'sos', x: 0, y: 10, w: 3, h: 2 },
        { i: 'maintenance', x: 3, y: 10, w: 3, h: 2 },
        { i: 'backup', x: 0, y: 12, w: 6, h: 1 },
      ],
      xs: [
        { i: 'speedometer', x: 0, y: 0, w: 4, h: 4 },
        { i: 'media', x: 0, y: 4, w: 4, h: 2 },
        { i: 'odometer', x: 0, y: 6, w: 2, h: 2 },
        { i: 'tripmeter', x: 2, y: 6, w: 2, h: 2 },
        { i: 'session', x: 0, y: 8, w: 2, h: 2 },
        { i: 'weather', x: 2, y: 8, w: 2, h: 2 },
        { i: 'sos', x: 0, y: 10, w: 4, h: 2 },
        { i: 'maintenance', x: 0, y: 12, w: 2, h: 2 },
        { i: 'backup', x: 2, y: 12, w: 2, h: 2 },
      ],
      xxs: [
        { i: 'speedometer', x: 0, y: 0, w: 2, h: 4 },
        { i: 'media', x: 0, y: 4, w: 2, h: 2 },
        { i: 'odometer', x: 0, y: 6, w: 1, h: 2 },
        { i: 'tripmeter', x: 1, y: 6, w: 1, h: 2 },
        { i: 'session', x: 0, y: 8, w: 1, h: 2 },
        { i: 'weather', x: 1, y: 8, w: 1, h: 2 },
        { i: 'sos', x: 0, y: 10, w: 2, h: 2 },
        { i: 'maintenance', x: 0, y: 12, w: 1, h: 2 },
        { i: 'backup', x: 1, y: 12, w: 1, h: 2 },
      ]
    };
  });

  useEffect(() => {
    localStorage.setItem('dashboard_layout', JSON.stringify(layouts));
  }, [layouts]);
  const [speedUnit, setSpeedUnit] = useState<'km/h' | 'mph'>('km/h');
  const [speedMode, setSpeedMode] = useState<'analog' | 'digital' | 'combo'>('combo');
  const { data: sensors, crashDetected, resetCrash } = useSensors();
  const [tripMeter, setTripMeter] = useState(0);
  const [isRecording, setIsRecording] = useState(() => localStorage.getItem('isRecording') === 'true');
  const [sessionInfo, setSessionInfo] = useState<{ startTime: string; startDist: number; startOdo: number } | null>(() => {
    const saved = localStorage.getItem('sessionInfo');
    return saved ? JSON.parse(saved) : null;
  });
  const [isViewingSessions, setIsViewingSessions] = useState(false);
  const [isEditingOdometer, setIsEditingOdometer] = useState(false);
  const [newOdometer, setNewOdometer] = useState<string>('');
  const odometerRef = useRef(0);

  useEffect(() => {
    localStorage.setItem('isRecording', isRecording.toString());
    if (sessionInfo) localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
    else localStorage.removeItem('sessionInfo');
  }, [isRecording, sessionInfo]);

  // Sync sensors to trip/odometer
  useEffect(() => {
    setTripMeter(sensors.distance);
  }, [sensors.distance]);

  const totalOdometer = (profile?.odometer || 0) + sensors.distance;

  const handleToggleTrip = async () => {
    if (!user) return;

    if (!isRecording) {
      // Start session
      setIsRecording(true);
      setSessionInfo({
        startTime: new Date().toISOString(),
        startDist: sensors.distance,
        startOdo: totalOdometer
      });
    } else {
      // Stop session
      if (!sessionInfo) return;
      
      const sessionDist = sensors.distance - sessionInfo.startDist;
      const endTime = new Date().toISOString();

      try {
        await addDoc(collection(db, 'users', user.uid, 'sessions'), {
          startTime: sessionInfo.startTime,
          endTime: endTime,
          distance: sessionDist,
          startOdo: sessionInfo.startOdo,
          endOdo: totalOdometer,
          date: new Date().toISOString().split('T')[0]
        });
        
        setIsRecording(false);
        setSessionInfo(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'sessions');
      }
    }
  };

  const currentSessionDist = isRecording && sessionInfo ? sensors.distance - sessionInfo.startDist : 0;


  // Handle Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Sync profile from Firestore
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        odometerRef.current = data.odometer;
      } else {
        // Initial profile
        setDoc(doc(db, 'users', user.uid), { odometer: 0 });
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    return () => unsub();
  }, [user]);

  // Backup data periodically (Backup to Google Feature)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const newOdo = (profile?.odometer || 0) + sensors.distance;
        await setDoc(doc(db, 'users', user.uid), {
          odometer: newOdo,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.error('Backup failed:', e);
      }
    }, 30000); // Every 30s
    return () => clearInterval(interval);
  }, [user, sensors.distance, profile?.odometer]);

  const login = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      console.error(e);
    }
  };

  const { width, containerRef, mounted } = useContainerWidth();

  const handleUpdateOdometer = async () => {
    if (!user || !newOdometer) return;
    try {
      const value = parseFloat(newOdometer) * 1000;
      await setDoc(doc(db, 'users', user.uid), {
        odometer: value
      }, { merge: true });
      setIsEditingOdometer(false);
      setNewOdometer('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-stone-900 border border-stone-800 p-8 rounded-3xl shadow-2xl max-w-md w-full"
        >
          <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
            <Gauge size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">MY RIDING APP</h1>
          <p className="text-stone-500 mb-8 leading-relaxed">
            Your ultimate motorcycle companion. Track speed, maintenance, and stay safe with crash detection.
          </p>
          <button 
            onClick={login}
            className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-stone-200 transition-all active:scale-95"
          >
            <LogIn size={20} /> Sign in with Google
          </button>
          <p className="text-[10px] text-stone-600 mt-6 uppercase tracking-widest font-bold">
            Secure Backup enabled via Firebase
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-[#E0E0E0] p-4 md:p-6 flex flex-col gap-4 font-sans select-none overflow-x-hidden">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2 px-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,95,31,0.4)]">
            <Gauge size={18} className="text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic text-white truncate">My Riding App</h1>
        </div>
        <div className="flex items-center justify-between w-full sm:w-auto gap-4 md:gap-6">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase opacity-40">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="hidden xs:inline">GPS:</span> {sensors.coords ? (window.innerWidth < 400 ? 'OK' : `CONNECTED (${sensors.coords.latitude.toFixed(2)}, ${sensors.coords.longitude.toFixed(2)})`) : 'SEARCHING...'}
          </div>
          <button 
            onClick={() => setIsLocked(!isLocked)}
            className={cn(
              "px-4 py-2.5 md:px-5 md:py-3 rounded-2xl transition-all flex items-center gap-2 md:gap-3 text-[10px] md:text-[12px] font-black uppercase tracking-widest border-2 active:scale-95",
              isLocked 
                ? "bg-bg-card border-border-card text-white/40" 
                : "bg-accent border-accent text-white shadow-[0_0_20px_rgba(255,95,31,0.3)] animate-pulse"
            )}
          >
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            <span className="hidden xxs:inline">{isLocked ? "Locked" : "Edit Layout"}</span>
          </button>
        </div>
      </header>

      <div className="flex-grow" ref={containerRef}>
        {mounted && (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            width={width}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={70}
            // @ts-ignore
            draggableHandle=".drag-handle"
            onLayoutChange={(_, allLayouts) => setLayouts(allLayouts)}
            // @ts-ignore - props might be mismatching in some versions
            isDraggable={!isLocked}
            // @ts-ignore
            isResizable={!isLocked}
          >
            {/* Same children as before */}
          <div key="speedometer">
            <div className={cn("h-full relative group transition-all", !isLocked && "ring-2 ring-accent ring-inset rounded-3xl")}>
              {!isLocked && <div className="drag-handle absolute -top-3 -left-3 z-20 cursor-move p-3 bg-accent rounded-2xl text-white shadow-xl scale-110"><GripVertical size={20} /></div>}
              <Speedometer speed={sensors.speed} unit={speedUnit} mode={speedMode} />
            </div>
          </div>

          {/* Odometer */}
          <div key="odometer">
            <div className={cn("h-full bg-bg-card rounded-3xl border border-border-card p-5 flex flex-col justify-between shadow-lg relative group transition-all", !isLocked && "ring-2 ring-accent ring-inset")}>
              {!isLocked && <div className="drag-handle absolute -top-3 -right-3 z-20 cursor-move p-3 bg-accent rounded-2xl text-white shadow-xl scale-110"><GripVertical size={20} /></div>}
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Odometer</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setNewOdometer((totalOdometer / 1000).toFixed(1));
                      setIsEditingOdometer(true);
                    }}
                    className="text-[10px] border border-border-card px-2 py-1 rounded bg-bg-main hover:border-accent transition-colors uppercase font-bold"
                  >
                    <Edit3 size={10} />
                  </button>
                  <button 
                    onClick={() => setSpeedUnit(u => u === 'km/h' ? 'mph' : 'km/h')}
                    className="text-[10px] border border-border-card px-2 py-1 rounded bg-bg-main hover:border-accent transition-colors uppercase font-bold"
                  >
                    {speedUnit}
                  </button>
                </div>
              </div>
              <div className="text-3xl font-mono text-white tracking-tight">
                {(totalOdometer / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                <span className="text-sm opacity-40 ml-1">KM</span>
              </div>
            </div>
          </div>

          {/* Trip Meter */}
          <div key="tripmeter">
            <div className={cn("h-full bg-bg-card rounded-3xl border border-border-card p-5 flex flex-col justify-between shadow-lg relative transition-all", !isLocked && "ring-2 ring-accent ring-inset")}>
              {!isLocked && <div className="drag-handle absolute -top-3 -right-3 z-20 cursor-move p-3 bg-accent rounded-2xl text-white shadow-xl scale-110"><GripVertical size={20} /></div>}
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Trip Counter</span>
                  <div className={cn(
                    "text-[8px] font-black uppercase tracking-tighter mt-0.5",
                    isRecording ? "text-green-500 animate-pulse" : "text-white/20"
                  )}>
                    {isRecording ? "• RECORDING LIVE" : "• COUNTER STANDBY"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsViewingSessions(true)}
                    className="text-[10px] border border-border-card px-2 py-1 rounded bg-bg-main hover:border-accent transition-colors uppercase font-bold flex items-center gap-1"
                    title="History"
                  >
                    <History size={10} />
                  </button>
                  <button 
                    onClick={() => setTripMeter(0)}
                    className="text-[10px] border border-border-card px-2 py-1 rounded bg-bg-main hover:border-accent transition-colors uppercase font-bold"
                  >
                    RESET
                  </button>
                </div>
              </div>
              <div className="text-4xl font-mono text-accent tracking-tighter">
                {((isRecording ? currentSessionDist : tripMeter) / 1000).toFixed(1)}
                <span className="text-sm opacity-40 ml-1">KM</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button 
                  onClick={handleToggleTrip}
                  className={cn(
                    "flex-grow flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    isRecording 
                      ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white" 
                      : "bg-accent text-bg-main hover:brightness-110"
                  )}
                >
                  {isRecording ? <><Square size={12} fill="currentColor" /> STOP TRIP</> : <><Play size={12} fill="currentColor" /> START TRIP</>}
                </button>
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div key="session">
            <div className={cn("h-full bg-bg-card rounded-3xl border border-border-card p-5 flex flex-col justify-between shadow-lg relative transition-all", !isLocked && "ring-2 ring-accent ring-inset")}>
              {!isLocked && <div className="drag-handle absolute -top-3 -right-3 z-20 cursor-move p-3 bg-accent rounded-2xl text-white shadow-xl scale-110"><GripVertical size={20} /></div>}
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Session Info</span>
                <Clock size={14} className="opacity-20" />
              </div>
              <div className="flex flex-col">
                <div className="text-[40px] font-sans text-white tracking-tighter">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
                <div className="text-[15px] font-black uppercase text-accent flex items-center gap-1">
                  <Calendar size={10} />
                  {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          </div>

          {/* Weather */}
          <div key="weather">
            <div className={cn("h-full shadow-lg relative transition-all", !isLocked && "ring-2 ring-accent ring-inset rounded-3xl")}>
              {!isLocked && <div className="drag-handle absolute -top-3 -right-3 z-20 cursor-move p-3 bg-accent rounded-2xl text-white shadow-xl scale-110"><GripVertical size={20} /></div>}
              <Weather coords={sensors.coords} />
            </div>
          </div>

          {/* Media Control */}
          <div key="media">
            <div className={cn("h-full shadow-lg relative transition-all", !isLocked && "ring-2 ring-accent ring-inset rounded-3xl")}>
              {!isLocked && <div className="drag-handle absolute -top-3 -right-3 z-20 cursor-move p-3 bg-accent rounded-2xl text-white shadow-xl scale-110"><GripVertical size={20} /></div>}
              <MediaControl />
            </div>
          </div>

          {/* SOS */}
          <div key="sos">
            <div className={cn("h-full shadow-lg relative transition-all", !isLocked && "ring-2 ring-accent ring-inset rounded-3xl")}>
              {!isLocked && <div className="drag-handle absolute -top-3 -right-3 z-20 cursor-move p-3 bg-accent rounded-2xl text-white shadow-xl scale-110"><GripVertical size={20} /></div>}
              <SOS 
                crashDetected={crashDetected} 
                onResetCrash={resetCrash}
                contact={profile?.emergencyContact}
                currentCoords={sensors.coords}
              />
            </div>
          </div>

          {/* Maintenance */}
          <div key="maintenance">
            <div className={cn("h-full shadow-lg relative transition-all", !isLocked && "ring-2 ring-accent ring-inset rounded-3xl")}>
              {!isLocked && <div className="drag-handle absolute -top-3 -right-3 z-20 cursor-move p-3 bg-accent rounded-2xl text-white shadow-xl scale-110"><GripVertical size={20} /></div>}
              <Maintenance currentOdometer={totalOdometer} />
            </div>
          </div>

          {/* Backup Status */}
          <div key="backup">
            <div className={cn("h-full bg-bg-card rounded-3xl border border-border-card p-4 flex flex-col justify-between items-center text-center shadow-lg relative transition-all", !isLocked && "ring-2 ring-accent ring-inset")}>
              {!isLocked && <div className="drag-handle absolute -top-3 -right-3 z-20 cursor-move p-3 bg-accent rounded-2xl text-white shadow-xl scale-110"><GripVertical size={20} /></div>}
              <div className="flex items-center gap-2 mb-1">
                <RefreshCcw size={12} className={cn("text-accent", profile ? "" : "animate-spin")} />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Cloud Backup</span>
              </div>
              <div className="text-[10px] opacity-60 uppercase tracking-tight font-mono">
                SYNC: {profile?.lastUpdated ? new Date(profile.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'PENDING'}
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 w-full text-[8px] font-black border border-border-card py-1.5 rounded-lg hover:bg-white hover:text-bg-main transition-all uppercase tracking-widest"
              >
                Sync
              </button>
            </div>
          </div>
        </ResponsiveGridLayout>
        )}
      </div>

      <footer className="flex justify-center gap-8 md:gap-12 mt-2 opacity-30 text-[10px] font-mono tracking-widest uppercase">
        <div className="flex items-center gap-1"><span className="text-accent">●</span> Accuracy: {Math.round(sensors.accuracy)}m</div>
        <span>Voltage: 14.2V</span>
        <span>Temp: 24°C</span>
        <span>Lean Angle: 0°</span>
      </footer>

      {/* Odometer Edit Modal */}
      <AnimatePresence>
        {isViewingSessions && user && (
          <SessionList userId={user.uid} onClose={() => setIsViewingSessions(false)} />
        )}
        {isEditingOdometer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-bg-main/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-card border border-border-card rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase italic text-white flex items-center gap-2">
                  <Gauge size={20} className="text-accent" /> Update Odometer
                </h3>
                <button onClick={() => setIsEditingOdometer(false)} className="text-white/40 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Current Total (KM)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="Enter new mileage..." 
                    className="w-full bg-bg-main border border-border-card rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors font-mono text-lg"
                    value={newOdometer}
                    onChange={(e) => setNewOdometer(e.target.value)}
                  />
                  <p className="text-[10px] opacity-40 leading-tight">
                    This will update your lifetime total. Session trip distance will remain unaffected until next sync.
                  </p>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleUpdateOdometer}
                    className="w-full bg-accent text-bg-main rounded-2xl py-4 font-black text-sm uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> SET ODOMETER
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

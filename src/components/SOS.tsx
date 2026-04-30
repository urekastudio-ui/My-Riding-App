import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Phone, MessageSquare, Save, X, Settings, Shield, ShieldOff, Bell } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { EmergencyContact } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SOSProps {
  crashDetected: boolean;
  onResetCrash: () => void;
  contact?: EmergencyContact;
  currentCoords: { latitude: number; longitude: number } | null;
}

export function SOS({ crashDetected, onResetCrash, contact, currentCoords }: SOSProps) {
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [tempContact, setTempContact] = useState<EmergencyContact>(contact || { name: '', phone: '' });
  const [countdown, setCountdown] = useState(30);

  // Alarm sound generation
  const playAlarm = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let soundTimer: NodeJS.Timeout;

    if (crashDetected && isEnabled && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
      soundTimer = setInterval(() => playAlarm(), 1000);
    } else if (crashDetected && isEnabled && countdown === 0) {
      handleManualSOS();
      onResetCrash();
    }

    return () => {
      clearInterval(timer);
      clearInterval(soundTimer);
    };
  }, [crashDetected, isEnabled, countdown, playAlarm]);

  useEffect(() => {
    if (crashDetected && isEnabled) setCountdown(30);
  }, [crashDetected, isEnabled]);

  const handleSaveContact = async () => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        emergencyContact: tempContact
      }, { merge: true });
      setIsEditingContact(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const getMessage = () => {
    const loc = currentCoords 
      ? `\nLocation: https://www.google.com/maps?q=${currentCoords.latitude},${currentCoords.longitude}`
      : "";
    return `SOS! I might have been in an accident. My Riding App detected a crash.${loc}`;
  };

  const handleManualSOS = (type: 'wa' | 'sms' = 'wa') => {
    if (!contact?.phone) return;
    const msg = encodeURIComponent(getMessage());
    if (type === 'wa') {
      window.open(`https://wa.me/${contact.phone}?text=${msg}`, '_blank');
    } else {
      window.location.href = `sms:${contact.phone}?body=${msg}`;
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full relative">
      {/* Crash Detection Alert Overlay */}
      <AnimatePresence>
        {crashDetected && isEnabled && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-accent flex flex-col items-center justify-center p-8 text-bg-main text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="text-bg-main"
            >
              <AlertTriangle size={120} />
            </motion.div>
            <h1 className="text-4xl font-black mt-8 mb-4">CRASH DETECTED!</h1>
            <p className="text-xl opacity-90 max-w-md font-medium">
              Are you okay? Sending signals to <span className="font-bold underline">{contact?.name || 'Contact'}</span> in...
            </p>
            <div className="text-9xl font-black my-8 tabular-nums">{countdown}</div>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <button 
                onClick={onResetCrash}
                className="bg-bg-main text-accent px-12 py-6 rounded-3xl font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                I AM OKAY (CANCEL)
              </button>
              <button 
                onClick={() => handleManualSOS()}
                className="bg-bg-main/20 text-bg-main border border-bg-main/30 py-4 rounded-2xl font-bold uppercase tracking-widest"
              >
                Send Now
              </button>
            </div>
            <div className="mt-8">
              <Bell className="animate-bounce" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emergency Contact Modal Overlay */}
      <AnimatePresence>
        {isEditingContact && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-bg-main/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-card border border-border-card rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase italic text-white flex items-center gap-2">
                  <Phone size={20} className="text-accent" /> Emergency Setup
                </h3>
                <button onClick={() => setIsEditingContact(false)} className="text-white/40 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Contact Name</label>
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    className="w-full bg-bg-main border border-border-card rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                    value={tempContact.name}
                    onChange={(e) => setTempContact({...tempContact, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Phone Number (with prefix)</label>
                  <input 
                    type="tel" 
                    placeholder="+60123456789" 
                    className="w-full bg-bg-main border border-border-card rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors font-mono"
                    value={tempContact.phone}
                    onChange={(e) => setTempContact({...tempContact, phone: e.target.value})}
                  />
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSaveContact}
                    className="w-full bg-accent text-bg-main rounded-2xl py-4 font-black text-sm uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> Update Emergency Info
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "bg-bg-card border border-border-card rounded-3xl p-5 flex flex-col justify-between h-full shadow-lg transition-all duration-500",
        isEnabled ? "border-accent/30 shadow-[0_0_20px_rgba(255,95,31,0.1)]" : "opacity-60"
      )}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-black uppercase tracking-tighter text-lg",
              isEnabled ? "text-accent" : "text-white/40"
            )}>Crash Detection</span>
            {isEnabled ? <Shield size={18} className="text-accent" /> : <ShieldOff size={18} className="text-white/40" />}
          </div>
          
          {/* Toggle Switch */}
          <button 
            onClick={() => setIsEnabled(!isEnabled)}
            className={cn(
              "w-12 h-6 rounded-full relative transition-colors duration-300 flex items-center px-1",
              isEnabled ? "bg-accent" : "bg-border-card"
            )}
          >
            <motion.div 
              animate={{ x: isEnabled ? 24 : 0 }}
              className="w-4 h-4 rounded-full bg-white shadow-sm"
            />
          </button>
        </div>
        
        <div className="text-sm font-medium leading-tight">
          Status: <span className={cn(
            "font-black uppercase border-b-2",
            isEnabled ? "text-accent border-accent" : "text-white/40 border-white/20"
          )}>{isEnabled ? 'Armed' : 'Disabled'}</span><br/>
          <span className="opacity-40 text-[10px]">Monitoring G-Force & Analytics</span>
        </div>

        <div className="bg-bg-main/20 rounded-2xl p-3 border border-border-card flex justify-between items-center">
          <div>
            <div className="text-[10px] font-black uppercase opacity-40">SOS Contact</div>
            <div className="text-xs font-bold text-white truncate">{contact?.name || 'NOT SET'}</div>
          </div>
          <button 
            onClick={() => setIsEditingContact(true)}
            className="p-2 text-white/40 hover:text-accent transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>

        <button 
          onClick={() => handleManualSOS('wa')}
          className="w-full bg-accent/10 text-accent font-black text-[10px] py-4 rounded-xl uppercase tracking-widest hover:bg-accent/20 transition-all border border-accent/20"
        >
          Test / Manual SOS
        </button>
      </div>
    </div>
  );
}

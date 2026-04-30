import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { X, History, Trash2, Calendar, MapPin, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Session {
  id: string;
  startTime: string;
  endTime: string;
  distance: number;
  startOdo: number;
  endOdo: number;
  date: string;
}

export function SessionList({ userId, onClose }: { userId: string, onClose: () => void }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'users', userId, 'sessions'),
      orderBy('startTime', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      setSessions(docs);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'sessions'));

    return () => unsub();
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'sessions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'sessions');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-bg-main/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-bg-card border border-border-card rounded-[2rem] w-full max-w-2xl h-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border-card flex justify-between items-center bg-bg-main/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic text-white leading-none">Trip History</h2>
              <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1 font-bold">Past Riding Sessions</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors text-white/40 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full opacity-20 animate-pulse">
              <History size={48} className="mb-4" />
              <p className="font-mono text-sm uppercase tracking-widest">Loading records...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
              <MapPin size={48} className="mb-4" />
              <p className="font-mono text-sm uppercase tracking-widest">No sessions recorded yet.</p>
              <p className="text-[10px] mt-2 max-w-[200px]">Start your trip tracker on the main dashboard to record rides.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  className="group bg-bg-main border border-border-card rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-accent/30"
                >
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center justify-center bg-accent/5 rounded-xl px-3 py-2 border border-accent/10 min-w-[70px]">
                      <span className="text-[10px] font-black text-accent uppercase">{new Date(session.startTime).toLocaleDateString(undefined, { month: 'short' })}</span>
                      <span className="text-xl font-black text-white">{new Date(session.startTime).getDate()}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="opacity-30" />
                        <span className="text-xs font-bold text-white/60">
                          {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Gauge size={14} className="text-accent" />
                          <span className="text-lg font-mono font-black text-white">{(session.distance / 1000).toFixed(2)}</span>
                          <span className="text-[10px] font-black opacity-30">KM</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] uppercase tracking-widest opacity-30 font-black">Mileage Range</span>
                      <span className="text-[10px] font-mono opacity-60">{(session.startOdo/1000).toFixed(0)} → {(session.endOdo/1000).toFixed(0)} KM</span>
                    </div>
                    <button 
                      onClick={() => handleDelete(session.id)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

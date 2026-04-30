import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { MaintenanceRecord, UserProfile } from '../types';
import { Wrench, Plus, Trash2, Calendar, Gauge, DollarSign, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function Maintenance({ currentOdometer }: { currentOdometer: number }) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRecord, setNewRecord] = useState<Partial<MaintenanceRecord>>({
    type: '',
    mileage: Math.round(currentOdometer / 1000),
    date: format(new Date(), 'yyyy-MM-dd'),
    cost: 0,
    notes: ''
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, `users/${auth.currentUser.uid}/maintenance`),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRecord));
      setRecords(docs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'maintenance'));

    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, `users/${auth.currentUser.uid}/maintenance`), {
        ...newRecord,
        mileage: Number(newRecord.mileage),
        cost: Number(newRecord.cost)
      });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'maintenance');
    }
  };

  return (
    <div className="flex flex-col gap-3 bg-bg-card border border-border-card rounded-3xl p-4 md:p-5 h-full overflow-hidden">
      <div className="flex justify-between items-center shrink-0">
        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-40">Maintenance</span>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-[9px] md:text-[10px] font-black uppercase text-accent hover:underline px-2 py-1 bg-accent/10 rounded-lg"
        >
          {isAdding ? 'CANCEL' : 'ADD NEW'}
        </button>
      </div>

      <div className="flex-grow space-y-3 overflow-y-auto custom-scrollbar pr-1">
        {isAdding ? (
          <div className="space-y-2 py-1">
            <input 
              type="text" 
              placeholder="Service Task" 
              className="w-full bg-bg-main border border-border-card rounded-xl px-3 py-2 text-[10px] md:text-sm text-white focus:outline-none focus:border-accent"
              value={newRecord.type}
              onChange={(e) => setNewRecord({...newRecord, type: e.target.value})}
            />
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Mileage (KM)" 
                className="flex-1 bg-bg-main border border-border-card rounded-xl px-3 py-2 text-[10px] md:text-sm text-white"
                value={newRecord.mileage}
                onChange={(e) => setNewRecord({...newRecord, mileage: Number(e.target.value)})}
              />
              <button 
                onClick={handleAdd}
                className="bg-accent text-bg-main px-4 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase shadow-lg active:scale-95 transition-all"
              >
                SAVE
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {records.slice(0, 3).map((record) => (
              <div key={record.id} className="space-y-1.5 p-2 bg-bg-main/30 rounded-xl border border-white/5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[10px] md:text-xs truncate max-w-[100px]">{record.type}</span>
                  <span className="font-mono text-[8px] md:text-[10px] opacity-40">{record.mileage} KM</span>
                </div>
                <div className="w-full h-1 bg-bg-main rounded-full overflow-hidden">
                  <div className="w-4/5 h-full bg-accent shadow-[0_0_5px_rgba(255,95,31,0.5)]"></div>
                </div>
              </div>
            ))}
            
            {records.length === 0 && !isAdding && (
               <div className="text-[9px] font-mono opacity-20 py-6 text-center uppercase tracking-widest">
                 No services logged yet
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

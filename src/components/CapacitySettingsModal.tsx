import React, { useState, useEffect } from 'react';
import { X, Clock, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { CapacitySettings, DayOfWeek, Task, BlockedTimeSlot } from '../types';
import { calculateDailyLoads } from '../utils/capacity';

interface CapacitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CapacitySettings;
  onUpdateDailyHours: (day: DayOfWeek, hours: number) => void;
  onAddBlockedSlot: (slot: Omit<BlockedTimeSlot, 'id'>) => void;
  onRemoveBlockedSlot: (id: string) => void;
  onResetDefaults: () => void;
  tasks: Task[];
  now?: Date;
}

const DAYS_ORDER: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export const CapacitySettingsModal: React.FC<CapacitySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateDailyHours,
  onAddBlockedSlot,
  onRemoveBlockedSlot,
  onResetDefaults,
  tasks,
  now = new Date(),
}) => {
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('15:00');
  const [newDays, setNewDays] = useState<DayOfWeek[]>(['mon', 'tue', 'wed', 'thu', 'fri']);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dailyLoads = calculateDailyLoads(tasks, settings, now, 7);
  const todayLoad = dailyLoads[0];
  const weeklyCapacity = Object.values(settings.dailyWorkHours).reduce((a, b) => a + b, 0);

  const handleCreateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const startH = parseInt(newStart.split(':')[0], 10);
    const endH = parseInt(newEnd.split(':')[0], 10);

    onAddBlockedSlot({
      label: newLabel.trim(),
      startHour: isNaN(startH) ? 9 : startH,
      endHour: isNaN(endH) ? 17 : endH,
      days: newDays.length > 0 ? newDays : ['mon', 'tue', 'wed', 'thu', 'fri'],
    });

    setNewLabel('');
    setIsAddingBlock(false);
  };

  const toggleDaySelection = (day: DayOfWeek) => {
    setNewDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="capacity-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-[#121212] border border-white/15 text-white font-mono shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-orange-400 text-xs uppercase tracking-widest">
              <Clock className="w-3.5 h-3.5" />
              <span>CAPACITY &amp; SCHEDULE ENGINE</span>
            </div>
            <h2 id="capacity-modal-title" className="font-display text-2xl sm:text-3xl text-white tracking-tight uppercase mt-1">
              Workload Settings
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Configure your realistic daily study limits and blocked commitments to prevent false buffers.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Today Telemetry Card */}
        {todayLoad && (
          <div className={`p-4 border text-xs space-y-2 ${
            todayLoad.status === 'overloaded'
              ? 'border-red-500/40 bg-red-950/20 text-red-200'
              : todayLoad.status === 'filling'
                ? 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                : 'border-emerald-500/30 bg-emerald-950/15 text-emerald-200'
          }`}>
            <div className="flex items-center justify-between font-bold uppercase tracking-wider">
              <span>TODAY'S WORKLOAD AUDIT</span>
              <span className="px-2 py-0.5 border border-current text-[10px]">
                {todayLoad.status.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-zinc-300">
              <div>
                <span>Demand: </span>
                <span className="font-bold text-white">{todayLoad.demandHours}h</span>
                <span> / Capacity: </span>
                <span className="font-bold text-white">{todayLoad.capacityHours}h</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                {todayLoad.remainingCapacity > 0
                  ? `${todayLoad.remainingCapacity}h focus headroom remaining today`
                  : `Deficit: ${Math.abs(todayLoad.demandHours - todayLoad.capacityHours).toFixed(1)}h over capacity`}
              </div>
            </div>
          </div>
        )}

        {/* Available Work Hours Per Day */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-zinc-300 font-semibold">
              DAILY AVAILABLE FOCUS HOURS ({weeklyCapacity}h / WEEK TOTAL)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DAYS_ORDER.map(({ key, label }) => {
              const hours = settings.dailyWorkHours[key] ?? 4;
              return (
                <div key={key} className="p-3 border border-white/10 bg-black/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">{label}</span>
                    <span className="text-orange-400 font-bold">{hours.toFixed(1)}h</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={hours}
                    onChange={(e) => onUpdateDailyHours(key, parseFloat(e.target.value))}
                    className="w-full accent-orange-500 cursor-pointer"
                    aria-label={`${label} available work hours`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Blocked Times (Classes, Sleep) */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest text-zinc-300 font-semibold block">
                BLOCKED RECOVERY &amp; CLASS HOURS
              </span>
              <span className="text-[11px] text-zinc-500">
                These hours are subtracted so deadlines do not count sleep or lecture time as available.
              </span>
            </div>
            {!isAddingBlock && (
              <button
                onClick={() => setIsAddingBlock(true)}
                type="button"
                className="inline-flex items-center gap-1.5 border border-white/20 hover:border-orange-500 text-zinc-300 hover:text-white px-2.5 py-1 text-xs uppercase transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Block</span>
              </button>
            )}
          </div>

          {/* New Block Inline Form */}
          {isAddingBlock && (
            <form onSubmit={handleCreateBlock} className="p-3 border border-orange-500/40 bg-zinc-950 space-y-3">
              <div className="text-xs text-orange-400 uppercase tracking-wider font-bold">
                New Blocked Window
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="LABEL (E.G. LAB, SHIFT)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="px-2.5 py-1.5 bg-black border border-white/15 text-xs text-white uppercase focus:border-orange-500 focus:outline-none"
                  required
                />
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-500 text-[10px]">FROM:</span>
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="px-2 py-1 bg-black border border-white/15 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-500 text-[10px]">UNTIL:</span>
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="px-2 py-1 bg-black border border-white/15 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Day selection pills */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] text-zinc-500 mr-1">DAYS:</span>
                {DAYS_ORDER.map(({ key, label }) => {
                  const isSelected = newDays.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleDaySelection(key)}
                      className={`px-2 py-0.5 text-[10px] uppercase border transition-colors ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/20 text-orange-300 font-bold'
                          : 'border-white/10 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {label.slice(0, 3)}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingBlock(false)}
                  className="px-3 py-1 text-xs text-zinc-400 hover:text-white border border-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-xs bg-orange-500 text-black font-bold uppercase hover:bg-orange-400 transition-colors"
                >
                  Save Block
                </button>
              </div>
            </form>
          )}

          {/* Blocked Slots List */}
          <div className="space-y-2">
            {settings.blockedSlots.map((slot) => {
              const startFormatted = `${String(slot.startHour).padStart(2, '0')}:00`;
              const endFormatted = `${String(slot.endHour).padStart(2, '0')}:00`;
              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-2.5 border border-white/10 bg-black/30 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white uppercase">{slot.label}</div>
                    <div className="text-[11px] text-zinc-400 flex items-center space-x-2">
                      <span>{startFormatted} – {endFormatted}</span>
                      <span>•</span>
                      <span className="uppercase text-orange-400/80">{slot.days.join(', ')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveBlockedSlot(slot.id)}
                    type="button"
                    title={`Delete ${slot.label}`}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-white/10 gap-3">
          <button
            onClick={onResetDefaults}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Student Defaults</span>
          </button>

          <button
            onClick={onClose}
            type="button"
            className="w-full sm:w-auto px-5 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs uppercase tracking-widest transition-colors"
          >
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};

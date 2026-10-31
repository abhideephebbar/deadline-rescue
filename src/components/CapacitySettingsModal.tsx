import React, { useState, useEffect } from 'react';
import { X, Clock, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { CapacitySettings, DayOfWeek, Task, BlockedTimeSlot, TaskCategory } from '../types';
import { calculateDailyLoads } from '../utils/capacity';
import { getCategoryDefaults, saveCategoryDefaults, resetCategoryDefaults } from '../utils/categoryDefaults';
import { Modal } from './ui/Modal';

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

  const [categoryDefaults, setCategoryDefaultsState] = useState<Record<TaskCategory, number>>(() => getCategoryDefaults());

  useEffect(() => {
    if (isOpen) {
      setCategoryDefaultsState(getCategoryDefaults());
    }
  }, [isOpen]);

  const handleUpdateCategoryDefault = (cat: TaskCategory, val: number) => {
    const updated = saveCategoryDefaults({ [cat]: val });
    setCategoryDefaultsState(updated);
  };

  const handleResetAll = () => {
    onResetDefaults();
    const reset = resetCategoryDefaults();
    setCategoryDefaultsState(reset);
  };

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      title="Study capacity & schedule"
    >
      <div className="p-6 sm:p-7 space-y-6 font-sans">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-orange-400 text-xs font-semibold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              <span>Study schedule</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">
              Daily study capacity
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Set realistic study limits and blocked times so you never plan more hours than you have.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Today Telemetry Card */}
        {todayLoad && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              todayLoad.status === 'overloaded'
                ? 'border-red-500/30 bg-red-950/20 text-red-200'
                : todayLoad.status === 'filling'
                  ? 'border-amber-500/30 bg-amber-950/20 text-amber-200'
                  : 'border-emerald-500/30 bg-emerald-950/15 text-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between font-semibold">
              <span>Today's workload</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wide bg-white/5">
                {todayLoad.status}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-zinc-300">
              <div>
                <span>Planned: </span>
                <span className="font-bold text-white">{todayLoad.demandHours}h</span>
                <span> · Capacity: </span>
                <span className="font-bold text-white">{todayLoad.capacityHours}h</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                {todayLoad.remainingCapacity > 0
                  ? `${todayLoad.remainingCapacity}h available today`
                  : `Deficit: ${Math.abs(todayLoad.demandHours - todayLoad.capacityHours).toFixed(1)}h over capacity`}
              </div>
            </div>
          </div>
        )}

        {/* Available Work Hours Per Day */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Daily study hours ({weeklyCapacity}h / week total)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DAYS_ORDER.map(({ key, label }) => {
              const hours = settings.dailyWorkHours[key] ?? 4;
              return (
                <div key={key} className="p-3 rounded-lg border border-white/10 bg-black/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">{label}</span>
                    <span className="text-orange-400 font-mono font-bold">{hours.toFixed(1)}h</span>
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

        {/* Blocked Times (Classes, Work) */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
                Blocked class &amp; activity hours
              </span>
              <span className="text-[11px] text-zinc-400">
                These hours are excluded from your available study time.
              </span>
            </div>
            {!isAddingBlock && (
              <button
                onClick={() => setIsAddingBlock(true)}
                type="button"
                className="inline-flex items-center gap-1.5 border border-white/15 hover:border-white/30 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add block</span>
              </button>
            )}
          </div>

          {/* New Block Inline Form */}
          {isAddingBlock && (
            <form onSubmit={handleCreateBlock} className="p-4 rounded-xl border border-orange-500/30 bg-black/40 space-y-3">
              <div className="text-xs text-orange-400 font-semibold uppercase tracking-wider">
                New blocked window
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Lab, Shift)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="px-3 py-1.5 bg-black border border-white/15 rounded-lg text-xs text-white focus:border-orange-500 focus:outline-none"
                  required
                />
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-500 text-[11px]">From:</span>
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="px-2 py-1 bg-black border border-white/15 rounded text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-500 text-[11px]">Until:</span>
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="px-2 py-1 bg-black border border-white/15 rounded text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Day selection pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-zinc-500 mr-1">Days:</span>
                {DAYS_ORDER.map(({ key, label }) => {
                  const isSelected = newDays.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleDaySelection(key)}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/20 text-orange-300 font-medium'
                          : 'border-white/10 text-zinc-400 hover:text-zinc-200'
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
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs rounded-lg bg-orange-500 text-black font-semibold hover:bg-orange-400 transition-colors cursor-pointer"
                >
                  Save block
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
                  className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-black/30 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-white">{slot.label}</div>
                    <div className="text-[11px] text-zinc-400 flex items-center space-x-2">
                      <span>{startFormatted} – {endFormatted}</span>
                      <span>•</span>
                      <span className="capitalize text-orange-400/80">{slot.days.join(', ')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveBlockedSlot(slot.id)}
                    type="button"
                    title={`Delete ${slot.label}`}
                    className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Typical Prep Times */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center justify-between">
              <span>My typical prep time</span>
              <span className="text-[11px] text-zinc-400 font-normal lowercase">hours per assignment</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Default prep hours used when importing or creating assignments.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { cat: 'quiz', label: 'Quiz' },
              { cat: 'assignment', label: 'Assignment' },
              { cat: 'lab', label: 'Lab' },
              { cat: 'exam', label: 'Exam' },
              { cat: 'project', label: 'Project' },
              { cat: 'reading', label: 'Reading' },
            ].map(({ cat, label }) => (
              <div
                key={cat}
                className="p-2.5 rounded-lg border border-white/10 bg-black/40 flex items-center justify-between"
              >
                <span className="text-xs text-zinc-300 font-medium">{label}</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="0.25"
                    max="40"
                    step="0.25"
                    value={categoryDefaults[cat as TaskCategory] ?? 2}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        handleUpdateCategoryDefault(cat as TaskCategory, val);
                      }
                    }}
                    className="w-14 p-1 text-center font-mono text-xs bg-black border border-white/20 rounded text-orange-400 focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[11px] text-zinc-500">h</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-white/10 gap-3">
          <button
            onClick={handleResetAll}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to student defaults</span>
          </button>

          <button
            onClick={onClose}
            type="button"
            className="w-full sm:w-auto px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-xs tracking-wide transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
